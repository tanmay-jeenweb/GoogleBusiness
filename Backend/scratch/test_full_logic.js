const db = require("../config/db.js");

const parseDateToObj = (dateStr) => {
    if (!dateStr || dateStr === "-" || dateStr === "N/A" || dateStr === "null") return null;
    const str = String(dateStr).trim();

    if (str.includes('/')) {
        const parts = str.split('/').map(p => p.trim());
        if (parts.length === 3) {
            let m = parseInt(parts[0]);
            let d = parseInt(parts[1]);
            let y = parseInt(parts[2]);
            if (y < 100) y += 2000;
            if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000) {
                return new Date(y, m - 1, d);
            }
        }
    }

    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        return parsed;
    }

    return null;
};

async function testFullLogic() {
    const [jM] = await db.execute("SELECT * FROM jeenweb_master_accounts");
    const [sM] = await db.execute("SELECT * FROM satvaweb_master_accounts");
    const [jA] = await db.execute("SELECT * FROM jeenweb_account_activities");
    const [sA] = await db.execute("SELECT * FROM satvaweb_account_activities");

    const masterRows = [...jM, ...sM];
    const actRows = [...jA, ...sA];

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

        const info = {
            domain_name: dName,
            customer_id: cId,
            product: raw.Product || m.product || "Google Workspace",
            sku_plan: skuPlan,
            start_date: startDate,
            end_date: endDate,
            status,
            payment_plan: paymentPlan,
            seats,
            company: m.company === "satvaweb" ? "Panel 2" : "Panel 1"
        };

        if (dName && dName !== 'N/A') masterMap.set(dName.toLowerCase().trim(), info);
        if (cId && cId !== 'N/A') masterMap.set(cId.toLowerCase().trim(), info);
    });

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

        // Parse End Date
        let expiryDateObj = parseDateToObj(m.end_date);
        let startDateObj = parseDateToObj(m.start_date);

        // Fallback: If expiryDate is missing but start_date & annual plan are present, compute expiry
        if (!expiryDateObj && startDateObj) {
            const planText = String(m.payment_plan || '').toLowerCase();
            const yearAdd = planText.includes('3 year') ? 3 : 1;
            expiryDateObj = new Date(startDateObj.getFullYear() + yearAdd, startDateObj.getMonth(), startDateObj.getDate());
        }

        let expiryMonthKey = null;
        if (expiryDateObj) {
            expiryMonthKey = `${expiryDateObj.getFullYear()}-${String(expiryDateObj.getMonth() + 1).padStart(2, '0')}`;
        }

        let domainRowTotal = 0;
        const monthsGrid = rollingMonths.map(rm => {
            let amount = monthlyBilling;
            let isExpiryMonth = false;
            let isExpired = false;

            if (expiryDateObj) {
                const cellDate = new Date(rm.year, rm.monthIndex, 1);
                if (rm.key === expiryMonthKey) {
                    isExpiryMonth = true;
                    amount = monthlyBilling;
                } else if (cellDate > expiryDateObj && rm.key !== expiryMonthKey) {
                    isExpired = true;
                    amount = 0;
                }
            }

            domainRowTotal += amount;
            return { monthKey: rm.key, amount, isExpiryMonth, isExpired };
        });

        reportRows.push({
            company,
            domain_name: dName,
            customer_id: cId,
            sku_plan: skuPlan,
            start_date: m.start_date || "-",
            end_date: m.end_date || "-",
            expiry_month_key: expiryMonthKey,
            total_seats: totalSeats,
            monthly_billing: monthlyBilling,
            domain_total: domainRowTotal
        });
    });

    console.log(`Processed ${reportRows.length} rows.`);
    const sampleWithExpiry = reportRows.filter(r => r.end_date !== "-");
    console.log("Sample Master Rows with Expiry:", JSON.stringify(sampleWithExpiry, null, 2));

    process.exit(0);
}

testFullLogic();
