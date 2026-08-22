const db = require("../config/db.js");

async function testMatrixLogic() {
    const [jM] = await db.execute("SELECT * FROM jeenweb_master_accounts");
    const [sM] = await db.execute("SELECT * FROM satvaweb_master_accounts");
    const [jA] = await db.execute("SELECT * FROM jeenweb_account_activities");
    const [sA] = await db.execute("SELECT * FROM satvaweb_account_activities");

    const masterRows = [...jM, ...sM];
    const actRows = [...jA, ...sA];

    // Generate Rolling 12 Months starting from current month (Aug 2026)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const rollingMonths = [];
    const baseDate = new Date(2026, 7, 1); // August 2026

    for (let i = 0; i < 12; i++) {
        const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        const label = `${monthNames[m]} ${y}`;
        rollingMonths.push({ key, label, year: y, monthIndex: m });
    }

    console.log("Rolling 12 Months:", rollingMonths.map(m => m.label).join(" -> "));

    // Map Master Accounts
    const masterMap = new Map();
    masterRows.forEach(m => {
        let raw = {};
        if (m.raw_data) {
            try { raw = typeof m.raw_data === 'string' ? JSON.parse(m.raw_data) : m.raw_data; } catch(e) {}
        }

        const dName = raw.Customer || raw["Customer Name"] || (m.domain_name && m.domain_name !== 'N/A' ? m.domain_name : null);
        const cId = raw["Cloud Identity Id"] || raw.CustomerId || (m.customer_id && m.customer_id !== 'N/A' ? m.customer_id : null);
        const skuPlan = raw.Sku || raw.SKU || (m.sku_plan && m.sku_plan !== 'N/A' && m.sku_plan !== '-' ? m.sku_plan : null) || "Google Workspace Business Starter";
        const startDate = raw["Creation date (PST)"] || (m.start_date && m.start_date !== 'N/A' ? m.start_date : null) || "-";
        const endDate = raw["Renewal date (PST)"] || (m.end_date && m.end_date !== 'N/A' ? m.end_date : null) || "-";
        const status = raw["Subscription status"] || (m.status && m.status !== '-' ? m.status : "Active");
        const paymentPlan = raw["Payment plan"] || (m.payment_plan && m.payment_plan !== '-' ? m.payment_plan : "Annual Plan (Monthly Payment)");
        const seats = parseInt(raw["Purchased licenses"] || raw["Assigned licenses"] || m.total_seats) || 1;

        const info = { domain_name: dName, customer_id: cId, product: raw.Product || m.product || "Google Workspace", sku_plan: skuPlan, start_date: startDate, end_date: endDate, status, payment_plan: paymentPlan, seats, company: m.company === "satvaweb" ? "Panel 2" : "Panel 1" };

        if (dName && dName !== 'N/A') masterMap.set(dName.toLowerCase().trim(), info);
        if (cId && cId !== 'N/A') masterMap.set(cId.toLowerCase().trim(), info);
    });

    // Map Activity Rows
    const domainBillingMap = new Map();
    actRows.forEach(a => {
        const desc = String(a.description || '').toLowerCase();
        if (desc.includes('starting balance') || desc.includes('ending balance')) return;

        const dName = (a.domain_name && a.domain_name !== 'N/A') ? a.domain_name.trim() : null;
        const cId = (a.customer_id && a.customer_id !== 'N/A') ? a.customer_id.trim() : null;
        const key = dName ? dName.toLowerCase() : (cId ? cId.toLowerCase() : null);

        if (!key) return;

        const amt = parseFloat(a.amount) || 0;
        const seats = parseInt(a.seats) || 1;
        const sku = a.sku_plan || "Google Workspace Business Starter";
        const comp = a.company === "satvaweb" ? "Panel 2" : "Panel 1";

        if (!domainBillingMap.has(key)) {
            domainBillingMap.set(key, { domain_name: dName || "N/A", customer_id: cId || "N/A", sku_plan: sku, seats, max_monthly_billing: amt, company: comp });
        } else {
            const existing = domainBillingMap.get(key);
            if (amt > existing.max_monthly_billing) existing.max_monthly_billing = amt;
            if (seats > existing.seats) existing.seats = seats;
            if (cId && existing.customer_id === 'N/A') existing.customer_id = cId;
            if (dName && existing.domain_name === 'N/A') existing.domain_name = dName;
        }
    });

    const allKeys = new Set([...masterMap.keys(), ...domainBillingMap.keys()]);
    const processedKeys = new Set();

    const reportRows = [];
    const monthColumnTotals = Array(12).fill(0);
    let overallGrandTotal = 0;
    let totalSeatsAll = 0;

    allKeys.forEach(key => {
        const m = masterMap.get(key) || {};
        const a = domainBillingMap.get(key) || {};

        const dName = m.domain_name || a.domain_name || key;
        const cId = m.customer_id || a.customer_id || "N/A";

        const uniqueIdKey = `${dName.toLowerCase()}_${cId.toLowerCase()}`;
        if (processedKeys.has(uniqueIdKey)) return;
        processedKeys.add(uniqueIdKey);

        const skuPlan = m.sku_plan || a.sku_plan || "Google Workspace Business Starter";
        const company = m.company || a.company || "Panel 1";
        const totalSeats = m.seats || a.seats || 1;
        const monthlyBilling = a.max_monthly_billing || 0;

        totalSeatsAll += totalSeats;

        // Parse End Date
        let expiryDateObj = null;
        let expiryMonthKey = null;
        if (m.end_date && m.end_date !== "-") {
            const parsed = new Date(m.end_date);
            if (!isNaN(parsed.getTime())) {
                expiryDateObj = parsed;
                expiryMonthKey = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
            }
        }

        // Build 12-Month Projected Grid for this domain
        let domainRowTotal = 0;
        const monthsGrid = rollingMonths.map(rm => {
            let amount = monthlyBilling;
            let isExpiryMonth = false;
            let isExpired = false;

            if (expiryDateObj) {
                const cellDate = new Date(rm.year, rm.monthIndex, 1);
                // End month calculation
                if (rm.key === expiryMonthKey) {
                    isExpiryMonth = true;
                    amount = monthlyBilling;
                } else if (cellDate > expiryDateObj && rm.key !== expiryMonthKey) {
                    isExpired = true;
                    amount = 0;
                }
            }

            domainRowTotal += amount;
            return {
                monthKey: rm.key,
                amount: amount,
                isExpiryMonth,
                isExpired
            };
        });

        // Add to column totals
        monthsGrid.forEach((cell, idx) => {
            monthColumnTotals[idx] += cell.amount;
        });

        overallGrandTotal += domainRowTotal;

        reportRows.push({
            company,
            domain_name: dName,
            customer_id: cId,
            sku_plan: skuPlan,
            start_date: m.start_date || "-",
            end_date: m.end_date || "-",
            total_seats: totalSeats,
            monthly_billing: monthlyBilling,
            per_seat_rate: totalSeats > 0 ? monthlyBilling / totalSeats : 0,
            months_grid: monthsGrid,
            domain_total: domainRowTotal
        });
    });

    console.log(`Processed ${reportRows.length} domains.`);
    console.log(`Overall 12-Month Grand Total: ₹${overallGrandTotal.toFixed(2)}`);
    console.log("Month Column Totals:");
    rollingMonths.forEach((rm, idx) => {
        console.log(`  ${rm.label}: ₹${monthColumnTotals[idx].toFixed(2)}`);
    });

    process.exit(0);
}

testMatrixLogic();
