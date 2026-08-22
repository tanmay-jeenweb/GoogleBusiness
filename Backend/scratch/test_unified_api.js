const db = require("../config/db.js");

async function testUnifiedReport() {
    console.log("=== TESTING DASHBOARD QUERY ON UNIFIED ACCOUNTS & ACTIVITIES TABLES ===");

    const [masterRows] = await db.execute("SELECT * FROM accounts");
    const [actRows] = await db.execute("SELECT * FROM account_activities");

    console.log(`Loaded ${masterRows.length} rows from 'accounts' table.`);
    console.log(`Loaded ${actRows.length} rows from 'account_activities' table.`);

    // 1. Map Master Accounts by domain and customer_id
    const masterMap = new Map();
    masterRows.forEach(m => {
        const info = {
            domain_name: m.domain,
            customer_id: m.customer_id || m.cloud_identity_id || "N/A",
            product: m.product || "Google Workspace",
            sku_plan: m.sku || "Google Workspace Business Starter",
            start_date: m.creation_date ? new Date(m.creation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "-",
            end_date: m.renewal_date ? new Date(m.renewal_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "-",
            renewal_date_obj: m.renewal_date ? new Date(m.renewal_date) : null,
            status: m.subscription_status || "Active",
            payment_plan: m.payment_plan || "Annual Plan (Monthly Payment)",
            seats: m.purchased_licenses || m.assigned_licenses || 1,
            company: m.company || "Panel 1"
        };

        if (m.domain && m.domain !== 'N/A') masterMap.set(m.domain.toLowerCase().trim(), info);
        if (m.customer_id && m.customer_id !== 'N/A') masterMap.set(m.customer_id.toLowerCase().trim(), info);
        if (m.cloud_identity_id && m.cloud_identity_id !== 'N/A') masterMap.set(m.cloud_identity_id.toLowerCase().trim(), info);
    });

    // 2. Map Account Activities by domain or customer_id
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
        const comp = a.company || "Panel 1";

        if (!domainBillingMap.has(key)) {
            domainBillingMap.set(key, {
                domain_name: dName || "N/A",
                customer_id: cId || "N/A",
                sku_plan: sku,
                seats: seats,
                total_monthly_billing: amt,
                company: comp
            });
        } else {
            const existing = domainBillingMap.get(key);
            existing.total_monthly_billing += amt;
            if (seats > existing.seats) existing.seats = seats;
            if (cId && existing.customer_id === 'N/A') existing.customer_id = cId;
            if (dName && existing.domain_name === 'N/A') existing.domain_name = dName;
        }
    });

    console.log(`Mapped ${domainBillingMap.size} unique domains from unified 'account_activities'.`);
    let totalAugBilling = 0;
    domainBillingMap.forEach(v => totalAugBilling += v.total_monthly_billing);
    console.log(`Total August Billing across all domains: ₹${totalAugBilling.toFixed(2)}`);

    process.exit(0);
}

testUnifiedReport();
