const db = require("../config/db.js");

async function testExtraction() {
    const [jM] = await db.execute("SELECT * FROM jeenweb_master_accounts");
    const [jA] = await db.execute("SELECT * FROM jeenweb_account_activities WHERE amount > 0");

    console.log(`Found ${jM.length} Master Accounts rows.`);
    console.log(`Found ${jA.length} Account Activity non-zero billing rows.`);

    // Build Activity Map by domain_name or customer_id
    const actMap = new Map();
    jA.forEach(a => {
        const d = (a.domain_name && a.domain_name !== 'N/A') ? a.domain_name.trim().toLowerCase() : null;
        const c = (a.customer_id && a.customer_id !== 'N/A') ? a.customer_id.trim().toLowerCase() : null;
        const amt = parseFloat(a.amount) || 0;
        const seats = parseInt(a.seats) || 1;

        if (d) actMap.set(d, { amount: amt, seats, date: a.transaction_date, desc: a.description });
        if (c) actMap.set(c, { amount: amt, seats, date: a.transaction_date, desc: a.description });
    });

    let matchedCount = 0;
    let totalMonthlyPayable = 0;

    jM.forEach((m, idx) => {
        let raw = {};
        if (m.raw_data) {
            try { raw = typeof m.raw_data === 'string' ? JSON.parse(m.raw_data) : m.raw_data; } catch(e) {}
        }

        const domainName = raw.Customer || raw["Customer Name"] || (m.domain_name !== 'N/A' ? m.domain_name : null) || "N/A";
        const customerId = raw["Cloud Identity Id"] || raw.CustomerId || (m.customer_id !== 'N/A' ? m.customer_id : null) || "N/A";
        const skuPlan = raw.Sku || raw.SKU || (m.sku_plan !== 'N/A' ? m.sku_plan : null) || "Google Workspace";
        const startDate = raw["Creation date (PST)"] || (m.start_date !== 'N/A' ? m.start_date : null) || "-";
        const endDate = raw["Renewal date (PST)"] || (m.end_date !== 'N/A' ? m.end_date : null) || "-";
        const status = raw["Subscription status"] || m.status || "Active";
        const paymentPlan = raw["Payment plan"] || m.payment_plan || "Annual Plan (Monthly Payment)";
        const seats = parseInt(raw["Assigned licenses"] || raw["Purchased licenses"] || m.total_seats) || 1;

        const dKey = domainName.toLowerCase();
        const cKey = customerId.toLowerCase();
        const act = actMap.get(dKey) || actMap.get(cKey) || null;

        if (act) matchedCount++;
        const monthlyBilling = act ? act.amount : 0;
        totalMonthlyPayable += monthlyBilling;

        if (idx < 5) {
            console.log(`\nRow #${idx + 1}:`);
            console.log(`Domain: ${domainName} | CID: ${customerId}`);
            console.log(`SKU: ${skuPlan} | Plan: ${paymentPlan}`);
            console.log(`Start: ${startDate} | End/Renewal: ${endDate} | Status: ${status}`);
            console.log(`Seats: ${seats} | Act Billed: ₹${monthlyBilling}`);
        }
    });

    console.log(`\nMatched ${matchedCount} out of ${jM.length} Master Accounts with Activity billing.`);
    console.log(`Total Monthly Payable: ₹${totalMonthlyPayable.toFixed(2)}`);
    process.exit(0);
}

testExtraction();
