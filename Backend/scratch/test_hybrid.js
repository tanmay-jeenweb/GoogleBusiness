const db = require("../config/db.js");

async function testHybrid() {
    const [jM] = await db.execute("SELECT * FROM jeenweb_master_accounts");
    const [sM] = await db.execute("SELECT * FROM satvaweb_master_accounts");
    const [jA] = await db.execute("SELECT * FROM jeenweb_account_activities");
    const [sA] = await db.execute("SELECT * FROM satvaweb_account_activities");

    const masterRows = [...jM, ...sM];
    const actRows = [...jA, ...sA];

    console.log(`Master rows total: ${masterRows.length}`);
    console.log(`Activity rows total: ${actRows.length}`);

    // Map Master Rows by domain and customer_id
    const masterMap = new Map();
    masterRows.forEach(m => {
        let raw = {};
        if (m.raw_data) {
            try { raw = typeof m.raw_data === 'string' ? JSON.parse(m.raw_data) : m.raw_data; } catch(e) {}
        }

        const dName = raw.Customer || raw["Customer Name"] || (m.domain_name !== 'N/A' ? m.domain_name : null);
        const cId = raw["Cloud Identity Id"] || raw.CustomerId || (m.customer_id !== 'N/A' ? m.customer_id : null);
        const skuPlan = raw.Sku || raw.SKU || (m.sku_plan !== 'N/A' ? m.sku_plan : null) || "Google Workspace Business Starter";
        const startDate = raw["Creation date (PST)"] || (m.start_date !== 'N/A' ? m.start_date : null) || "-";
        const endDate = raw["Renewal date (PST)"] || (m.end_date !== 'N/A' ? m.end_date : null) || "-";
        const status = raw["Subscription status"] || m.status || "Active";
        const paymentPlan = raw["Payment plan"] || m.payment_plan || "Annual Plan (Monthly Payment)";
        const seats = parseInt(raw["Purchased licenses"] || raw["Assigned licenses"] || m.total_seats) || 1;

        const info = { domain_name: dName, customer_id: cId, sku_plan: skuPlan, start_date: startDate, end_date: endDate, status, payment_plan: paymentPlan, seats };

        if (dName && dName !== 'N/A') masterMap.set(dName.toLowerCase().trim(), info);
        if (cId && cId !== 'N/A') masterMap.set(cId.toLowerCase().trim(), info);
    });

    // Map Activity Rows by domain / customer_id (grouping to find highest or latest monthly billing)
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

        if (!domainBillingMap.has(key)) {
            domainBillingMap.set(key, {
                domain_name: dName || "N/A",
                customer_id: cId || "N/A",
                sku_plan: sku,
                seats: seats,
                max_monthly_billing: amt,
                latest_date: a.transaction_date,
                company: a.company || "Panel 1"
            });
        } else {
            const existing = domainBillingMap.get(key);
            if (amt > existing.max_monthly_billing) {
                existing.max_monthly_billing = amt;
            }
            if (seats > existing.seats) {
                existing.seats = seats;
            }
            if (cId && existing.customer_id === 'N/A') {
                existing.customer_id = cId;
            }
            if (dName && existing.domain_name === 'N/A') {
                existing.domain_name = dName;
            }
        }
    });

    console.log(`Unique billing domains from activities: ${domainBillingMap.size}`);

    // Combine Master Accounts and Activities
    const allKeys = new Set([...masterMap.keys(), ...domainBillingMap.keys()]);
    let totalMonthlyPayable = 0;
    let count = 0;

    allKeys.forEach(key => {
        const m = masterMap.get(key) || {};
        const a = domainBillingMap.get(key) || {};

        const dName = m.domain_name || a.domain_name || key;
        const cId = m.customer_id || a.customer_id || "N/A";
        const sku = m.sku_plan || a.sku_plan || "Google Workspace Business Starter";
        const seats = m.seats || a.seats || 1;
        const monthlyBilling = a.max_monthly_billing || 0;
        const startDate = m.start_date || "-";
        const endDate = m.end_date || "-";

        totalMonthlyPayable += monthlyBilling;
        count++;

        if (dName.includes("ronakfarma") || dName.includes("1source") || count <= 5) {
            console.log(`\nDomain: ${dName} | CID: ${cId}`);
            console.log(`  SKU: ${sku} | Seats: ${seats}`);
            console.log(`  Start: ${startDate} | End: ${endDate}`);
            console.log(`  Monthly Billing: ₹${monthlyBilling.toFixed(2)} | Rate/Seat: ₹${(monthlyBilling / seats).toFixed(2)}`);
        }
    });

    console.log(`\nTotal Unique Domains: ${count}`);
    console.log(`Total Est. Monthly Payable to Google: ₹${totalMonthlyPayable.toFixed(2)}`);

    process.exit(0);
}

testHybrid();
