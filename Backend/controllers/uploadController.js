const xlsx = require("xlsx");
const {
    insertAccountActivity,
    insertMasterAccount,
    removeExistingDuplicates,
    logUpload,
    getUploadLogs,
    getAccountActivities,
    getMasterAccounts,
    getJoinedTransactions,
    updateTransactionCategoryInDb,
    deleteUploadLog,
    truncateCompanyAccountActivities,
    truncateCompanyMasterAccounts,
    truncateAllUploads
} = require("../models/uploadModel.js");
const { getKeywordRules } = require("../models/settingsModel.js");
const { createAuditLog } = require("../models/auditLogModel.js");

// Format file size helper
const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

// Comprehensive Date Standardizer for Excel serials, slashes (8/10/26, 08/26), and ranges (Aug 1 - 31, 2026)
const parseExcelDate = (val) => {
    if (!val) return "";
    const str = String(val).trim();
    if (!str || str === 'N/A' || str === 'null' || str === 'undefined') return "";

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // 1. Check Excel serial number (e.g. 46254.00011574074)
    const num = Number(str);
    if (!isNaN(num) && num > 20000 && num < 100000) {
        try {
            const parsed = xlsx.SSF.parse_date_code(num);
            if (parsed && parsed.y && parsed.m && parsed.d) {
                return `${parsed.d} ${months[parsed.m - 1]} ${parsed.y}`;
            }
        } catch (e) {}
    }

    // 2. Date ranges like 'Aug 1 – 31, 2026' or 'August / 2026'
    if (str.includes('–') || str.includes('-')) {
        const rangeMatch = str.match(/([A-Za-z]+)\s+\d+.*(\d{4})/);
        if (rangeMatch) {
            return `${rangeMatch[1].slice(0, 3)} ${rangeMatch[2]}`;
        }
    }

    // 3. Slash formats like '8/10/26', '08/10/2026', '08/26', '8/26', 'August / 2026'
    if (str.includes('/')) {
        const parts = str.split('/').map(p => p.trim());
        if (parts.length === 3) {
            const m = parseInt(parts[0]);
            const d = parseInt(parts[1]);
            let y = parseInt(parts[2]);
            if (y < 100) y += 2000;
            if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000) {
                return `${d} ${months[m - 1]} ${y}`;
            }
        }
        if (parts.length === 2) {
            let m = parseInt(parts[0]);
            let y = parseInt(parts[1]);
            if (isNaN(m)) {
                const mIdx = months.findIndex(mon => parts[0].toLowerCase().startsWith(mon.toLowerCase()));
                if (mIdx !== -1) m = mIdx + 1;
            }
            if (y < 100) y += 2000;
            if (m >= 1 && m <= 12 && y >= 2000) {
                return `${months[m - 1]} ${y}`;
            }
        }
    }

    // 4. ISO or standard JS Date parseable strings
    const dObj = new Date(str);
    if (!isNaN(dObj.getTime()) && dObj.getFullYear() >= 2000) {
        return `${dObj.getDate()} ${months[dObj.getMonth()]} ${dObj.getFullYear()}`;
    }

    return str;
};

// Smart row value extractor with strict boundary matching
const getRowVal = (row, keyPatterns) => {
    if (!row || typeof row !== 'object') return "";
    const keys = Object.keys(row);
    for (const pattern of keyPatterns) {
        const foundKey = keys.find(k => {
            const normalized = k.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            const target = pattern.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            if (target.length <= 2) return normalized === target;
            return normalized === target || (target.length >= 4 && normalized.includes(target));
        });
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== "") {
            return String(row[foundKey]).trim();
        }
    }
    return "";
};

// Extract Commitment / Activity Type from Description using dynamic Keyword Rules from settings
const extractCommitmentType = (description = "", rules = []) => {
    if (rules && rules.length > 0) {
        const lowerDesc = description.toLowerCase().trim();
        // Sort rules so higher priority and longer match strings are evaluated first
        const sortedRules = [...rules].sort((a, b) => {
            const pDiff = (b.priority || 0) - (a.priority || 0);
            if (pDiff !== 0) return pDiff;
            return (b.keyword_match || "").length - (a.keyword_match || "").length;
        });

        for (const r of sortedRules) {
            if ((r.status || 'ACTIVE').toUpperCase() === 'ACTIVE' && r.keyword_match) {
                const lowerKeyword = r.keyword_match.toLowerCase().trim();
                if (lowerKeyword && lowerDesc.includes(lowerKeyword)) {
                    return r.activity_classification;
                }
            }
        }
    }
    const lower = description.toLowerCase();
    if (lower.includes("new commitment")) return "new commitment";
    if (lower.includes("commitment increase") || lower.includes("increase")) return "commitment increase";
    if (lower.includes("commitment renewal") || lower.includes("renewal")) return "commitment renewal";
    if (lower.includes("commitment for") || lower.includes("commitment")) return "commitment";
    if (lower.includes("usage") || lower.includes("flex")) return "usage";
    return "other";
};

// Extract Seats count from Description or text
const extractSeatsFromText = (text = "") => {
    const match = text.match(/(\d+)\s*seats?/i);
    if (match) return parseInt(match[1]);
    return 1;
};

// Extract SKU Plan from Description
const extractSkuPlanFromText = (text = "") => {
    if (text.includes(":")) {
        const parts = text.split(":");
        if (parts[0] && parts[0].trim().length > 3) return parts[0].trim();
    }
    return "Google Workspace Business Starter";
};

// Extract Domain Name cleanly from description or text
const extractDomainFromText = (text = "") => {
    const match = text.match(/Domain Name:\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
                  text.match(/Domain:\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
                  text.match(/([a-zA-Z0-9-]+\.(?:com|org|net|in|co|io|ai|biz|info|us|gov|edu))/i);
    if (match) return match[1].trim();
    return "";
};

// Extract Customer ID cleanly from text
const extractCustomerIdFromText = (text = "") => {
    const match = text.match(/Customer ID:\s*([C0-9a-zA-Z]+)/i) ||
                  text.match(/Cust ID:\s*([C0-9a-zA-Z]+)/i);
    if (match) return match[1].trim();
    return "";
};

// Extract Order Number cleanly from text
const extractOrderNumberFromText = (text = "") => {
    const match = text.match(/Order Number:\s*([0-9a-zA-Z-]+)/i) ||
                  text.match(/Order #:\s*([0-9a-zA-Z-]+)/i);
    if (match) return match[1].trim();
    return "";
};

// Helper to derive activity category from description
const deriveActivityCategory = (description = "") => {
    const desc = description.toLowerCase();
    if (desc.includes("increase")) return "Commitment Increase";
    if (desc.includes("renewal")) return "Commitment Renewal";
    if (desc.includes("upgrade")) return "Plan Upgrade";
    if (desc.includes("downgrade")) return "Plan Downgrade";
    if (desc.includes("seat")) return "Seat Modification";
    return "Subscription Activity";
};

// Helper to format billing month from date
const formatBillingMonth = (dateStr = "") => {
    const cleanDate = parseExcelDate(dateStr);
    if (!cleanDate) return "August 2026";
    const d = new Date(cleanDate);
    if (!isNaN(d.getTime())) {
        return d.toLocaleString("default", { month: "long", year: "numeric" });
    }
    return cleanDate;
};

// 1. Upload Account Activities (File 1) for specific company
const uploadAccountActivities = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const company = req.params.company || req.query.company || "jeenweb";
        const fileName = req.file.originalname;
        const fileSize = formatBytes(req.file.size);
        const ext = fileName.split(".").pop().toLowerCase();

        let insertedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        let keywordRules = [];
        try {
            keywordRules = await getKeywordRules();
        } catch (e) {}

        if (["xlsx", "xls", "csv"].includes(ext)) {
            const workbook = xlsx.read(req.file.buffer, { type: "buffer", cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: false });

            for (const row of rows) {
                const rowStr = JSON.stringify(row);

                let transactionDate = parseExcelDate(getRowVal(row, ["transactiondate", "date", "createdat"]));
                let description = getRowVal(row, ["description", "activity", "details", "item"]);
                let orderNumber = getRowVal(row, ["ordernumber", "order", "orderid"]);
                let domainName = getRowVal(row, ["domainname", "domain", "primarydomain", "customerdomain"]);
                let customerId = getRowVal(row, ["customerid", "customer", "accountid", "clientid"]);
                let amountStr = getRowVal(row, ["amount", "cost", "total", "price", "inr", "value", "subtotalinr", "amountinr"]);

                const fullText = (description + " " + rowStr).trim();
                const lowerText = fullText.toLowerCase();

                if (lowerText.includes("starting balance") || lowerText.includes("ending balance") || lowerText.includes("subtotal")) {
                    continue; // Skip statement balance / subtotal summary rows
                }

                let isGstRow = lowerText.includes("gst") || lowerText.includes("tax");
                let commitmentType = isGstRow ? "GST / Tax Summary" : extractCommitmentType(fullText, keywordRules);
                let seats = isGstRow ? 0 : extractSeatsFromText(fullText);
                let skuPlan = isGstRow ? "GST Tax" : extractSkuPlanFromText(description || fullText);

                if (isGstRow) {
                    domainName = "GST Tax (Integrated GST)";
                    customerId = "GST-TAX";
                    if (!orderNumber) orderNumber = "GST-" + (transactionDate ? transactionDate.replace(/[^0-9]/g, '') : "TAX");
                } else {
                    if (!domainName) domainName = extractDomainFromText(fullText);
                    if (!customerId) customerId = extractCustomerIdFromText(fullText);
                    if (!orderNumber) orderNumber = extractOrderNumberFromText(fullText);
                }

                if (!transactionDate) {
                    const match = rowStr.match(/([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/);
                    if (match) transactionDate = match[1];
                }

                let amountClean = amountStr ? parseFloat(String(amountStr).replace(/[^0-9.-]/g, "")) : 0.00;
                let amount = isNaN(amountClean) ? 0.00 : amountClean;

                const result = await insertAccountActivity(company, {
                    transaction_date: transactionDate || "N/A",
                    description: description || rowStr,
                    order_number: orderNumber || "N/A",
                    domain_name: domainName || "N/A",
                    customer_id: customerId || "N/A",
                    commitment_type: commitmentType,
                    seats: seats,
                    sku_plan: skuPlan,
                    amount: isNaN(amount) ? 0.00 : amount,
                    file_name: fileName,
                    raw_data: row
                });

                if (result.inserted) insertedCount++;
                else if (result.updated) updatedCount++;
                else skippedCount++;
            }
        }

        await removeExistingDuplicates();
        await logUpload(fileName, "Account Activities", fileSize, insertedCount + updatedCount, company);

        const compLabel = company.toLowerCase().includes("satva") ? "SatvaWeb" : "JeenWeb";

        try {
            await createAuditLog(
                req.user?.id || null,
                req.user?.username || req.user?.email || "Admin User",
                req.headers['x-device-id'] || "Web Client",
                "Upload Center",
                "uploaded",
                null,
                { file_name: fileName, file_type: "Account Activities", company: compLabel, records_processed: insertedCount + updatedCount }
            );
        } catch (e) {}

        res.status(200).json({
            success: true,
            message: `Account Activities for ${compLabel} processed: ${insertedCount} new inserted, ${updatedCount} modified updated, ${skippedCount} unchanged skipped`,
            recordCount: insertedCount + updatedCount,
            insertedCount,
            updatedCount,
            skippedCount,
            company: compLabel
        });

    } catch (error) {
        console.error("Account Activities Upload Error:", error);
        res.status(500).json({ success: false, message: "Failed to process Account Activities file", error: error.message });
    }
};

// 2. Upload Master Account (File 2) for specific company
const uploadMasterAccount = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const company = req.params.company || req.query.company || "jeenweb";
        const fileName = req.file.originalname;
        const fileSize = formatBytes(req.file.size);
        const ext = fileName.split(".").pop().toLowerCase();

        let insertedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        if (["xlsx", "xls", "csv"].includes(ext)) {
            const workbook = xlsx.read(req.file.buffer, { type: "buffer", cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: false });

            for (const row of rows) {
                const rowStr = JSON.stringify(row);

                let domainName = getRowVal(row, ["customer", "customername", "domainname", "domain", "primarydomain", "customerdomain"]);
                let product = getRowVal(row, ["product", "service", "item"]);
                let skuPlan = getRowVal(row, ["sku", "skuplan", "plan", "subscription"]);
                let startDate = parseExcelDate(getRowVal(row, ["creationdatepst", "creationdate", "startdate", "start", "purchasedate"]));
                let status = getRowVal(row, ["subscriptionstatus", "status", "state"]);
                let paymentPlan = getRowVal(row, ["paymentplan", "payment", "planterm"]);
                let endDate = parseExcelDate(getRowVal(row, ["renewaldatepst", "renewaldate", "enddate", "end", "expirydate"]));
                let totalSeats = getRowVal(row, ["purchasedlicenses", "totalseats", "total", "seats", "licenses"]);
                let assignedSeats = getRowVal(row, ["assignedlicenses", "assignedseats", "assigned", "used"]);
                let subscriptionId = getRowVal(row, ["subscriptionid", "subscription", "subid", "provisioningid"]);
                let customerId = getRowVal(row, ["cloudidentityid", "customeruid", "customerid", "accountid"]);
                let orderNumber = getRowVal(row, ["provisioningid", "ordernumber", "order", "orderid"]);

                if (!domainName) domainName = extractDomainFromText(rowStr);
                if (!customerId) customerId = extractCustomerIdFromText(rowStr);
                if (!orderNumber) orderNumber = extractOrderNumberFromText(rowStr);

                const result = await insertMasterAccount(company, {
                    domain_name: domainName || "N/A",
                    product: product || "Google Workspace",
                    sku_plan: skuPlan || "Google Workspace Business Starter",
                    start_date: startDate || "N/A",
                    status: status || "Active",
                    payment_plan: paymentPlan || "Annual Plan",
                    end_date: endDate || "N/A",
                    total_seats: parseInt(totalSeats) || 1,
                    assigned_seats: parseInt(assignedSeats) || parseInt(totalSeats) || 1,
                    subscription_id: subscriptionId || "N/A",
                    customer_id: customerId || "N/A",
                    order_number: orderNumber || "N/A",
                    file_name: fileName,
                    raw_data: row
                });

                if (result.inserted) insertedCount++;
                else if (result.updated) updatedCount++;
                else skippedCount++;
            }
        }

        await removeExistingDuplicates();
        await logUpload(fileName, "Master Account", fileSize, insertedCount + updatedCount, company);

        const compLabel = company.toLowerCase().includes("satva") ? "SatvaWeb" : "JeenWeb";

        try {
            await createAuditLog(
                req.user?.id || null,
                req.user?.username || req.user?.email || "Admin User",
                req.headers['x-device-id'] || "Web Client",
                "Upload Center",
                "uploaded",
                null,
                { file_name: fileName, file_type: "Master Account", company: compLabel, records_processed: insertedCount + updatedCount }
            );
        } catch (e) {}

        res.status(200).json({
            success: true,
            message: `Master Account for ${compLabel} processed: ${insertedCount} new inserted, ${updatedCount} modified updated, ${skippedCount} unchanged skipped`,
            recordCount: insertedCount + updatedCount,
            insertedCount,
            updatedCount,
            skippedCount,
            company: compLabel
        });

    } catch (error) {
        console.error("Master Account Upload Error:", error);
        res.status(500).json({ success: false, message: "Failed to process Master Account file", error: error.message });
    }
};

// 3. Get Upload Logs & History Data per company or all
const getHistory = async (req, res) => {
    try {
        const company = req.query.company || req.params.company || "all";
        await removeExistingDuplicates();
        const logs = await getUploadLogs(company);
        const rawAccountActivities = await getAccountActivities(company);
        const rawMasterAccounts = await getMasterAccounts(company);

        const accountActivities = rawAccountActivities.map(a => ({
            ...a,
            transaction_date: parseExcelDate(a.transaction_date)
        }));

        const masterAccounts = rawMasterAccounts.map(m => ({
            ...m,
            start_date: parseExcelDate(m.start_date),
            end_date: parseExcelDate(m.end_date)
        }));

        res.status(200).json({
            success: true,
            logs,
            accountActivities,
            masterAccounts
        });
    } catch (error) {
        console.error("Get History Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch upload history" });
    }
};

// 4. Get Formatted Joined Transactions with seller_company filter
const getTransactions = async (req, res) => {
    try {
        const company = req.query.company || req.params.company || "all";
        await removeExistingDuplicates();
        const rawTransactions = await getJoinedTransactions(company);

        const formatted = rawTransactions.map(t => {
            let cleanDate = "-";
            if (t.transaction_date) {
                const dObj = new Date(t.transaction_date);
                if (!isNaN(dObj.getTime())) {
                    cleanDate = dObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                } else {
                    cleanDate = String(t.transaction_date);
                }
            }

            const compLabel = (t.company && String(t.company).toLowerCase().includes("satva")) ? "Panel 2 (SatvaWeb)" : "Panel 1 (JeenWeb)";

            return {
                id: t.id,
                seller_company: compLabel,
                date: cleanDate,
                billing_month: t.billing_month || "2026-08",
                activity_category: t.commitment_type || deriveActivityCategory(t.description),
                plan_type: t.sku_plan || "Google Workspace Business Starter",
                product: t.product || "Google Workspace",
                domain: t.domain_name || "N/A",
                customer_id: t.customer_id || "N/A",
                seats: t.seats || 1,
                amount: parseFloat(t.amount) || 0.00,
                order_number: t.order_number || "N/A",
                description: t.description || "N/A",
                creation_date: t.creation_date ? new Date(t.creation_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-",
                renewal_date: t.renewal_date ? new Date(t.renewal_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-",
                payment_plan: t.payment_plan || "-"
            };
        });

        res.status(200).json({
            success: true,
            count: formatted.length,
            transactions: formatted
        });
    } catch (error) {
        console.error("Get Transactions Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch transactions" });
    }
};

// 5. Delete Single Record
const deleteRecord = async (req, res) => {
    try {
        const { id } = req.params;
        await deleteUploadLog(id);
        res.status(200).json({ success: true, message: "Record deleted from MySQL" });
    } catch (error) {
        console.error("Delete Record Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete record" });
    }
};

// 6. Clear Account Activities SQL Table per company
const clearAccountActivitiesData = async (req, res) => {
    try {
        const company = req.params.company || req.query.company || "jeenweb";
        await truncateCompanyAccountActivities(company);
        const compLabel = company.toLowerCase().includes("satva") ? "SatvaWeb" : "JeenWeb";
        res.status(200).json({ success: true, message: `All ${compLabel} Account Activities data cleared from SQL` });
    } catch (error) {
        console.error("Clear Account Activities Error:", error);
        res.status(500).json({ success: false, message: "Failed to clear Account Activities table" });
    }
};

// 7. Clear Master Account SQL Table per company
const clearMasterAccountData = async (req, res) => {
    try {
        const company = req.params.company || req.query.company || "jeenweb";
        await truncateCompanyMasterAccounts(company);
        const compLabel = company.toLowerCase().includes("satva") ? "SatvaWeb" : "JeenWeb";
        res.status(200).json({ success: true, message: `All ${compLabel} Master Account data cleared from SQL` });
    } catch (error) {
        console.error("Clear Master Account Error:", error);
        res.status(500).json({ success: false, message: "Failed to clear Master Account table" });
    }
};

// 8. Clear All Upload SQL Tables per company or total
const clearAllData = async (req, res) => {
    try {
        const company = req.params.company || req.query.company || "all";
        await truncateAllUploads(company);
        const compLabel = company === "all" ? "All Companies" : (company.toLowerCase().includes("satva") ? "SatvaWeb" : "JeenWeb");
        res.status(200).json({ success: true, message: `All ${compLabel} upload data cleared from MySQL` });
    } catch (error) {
        console.error("Clear All Data Error:", error);
        res.status(500).json({ success: false, message: "Failed to clear SQL database" });
    }
};

// 9. Update Single Transaction Activity Category
const updateTransactionCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { activity_category } = req.body;

        if (!activity_category || !activity_category.trim()) {
            return res.status(400).json({ success: false, message: "Activity Category is required" });
        }

        const resUpdate = await updateTransactionCategoryInDb(id, activity_category.trim());
        if (!resUpdate.success) {
            return res.status(404).json({ success: false, message: resUpdate.message || "Transaction not found" });
        }

        // Create audit log for this update
        try {
            await createAuditLog(
                req.user?.id || null,
                req.user?.name || req.user?.username || req.user?.email || "Admin User",
                req.headers['x-device-id'] || "Web Client",
                "Transactions Center",
                "updated",
                { transaction_id: id, domain: resUpdate.domainName, activity_category: resUpdate.oldCategory },
                { transaction_id: id, domain: resUpdate.domainName, activity_category: activity_category.trim() }
            );
        } catch (auditErr) {
            console.error("Audit Log Creation Error on Category Update:", auditErr);
        }

        return res.status(200).json({
            success: true,
            message: `Transaction category updated to '${activity_category}'`,
            oldCategory: resUpdate.oldCategory,
            newCategory: activity_category
        });
    } catch (error) {
        console.error("Update Transaction Category Error:", error);
        return res.status(500).json({ success: false, message: "Failed to update transaction category" });
    }
};

module.exports = {
    uploadAccountActivities,
    uploadMasterAccount,
    getHistory,
    getTransactions,
    updateTransactionCategory,
    deleteRecord,
    clearAccountActivitiesData,
    clearMasterAccountData,
    clearAllData
};
