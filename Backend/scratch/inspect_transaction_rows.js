const db = require("../config/db.js");

const inspectRows = async () => {
    const [activities] = await db.execute("SELECT * FROM account_activities");
    console.log("Sample activities (first 10):");
    activities.slice(0, 10).forEach((a, i) => {
        console.log(`[${i+1}] Date: ${a.transaction_date}, Month: ${a.billing_month}, Domain: ${a.domain_name}, Commitment: ${a.commitment_type}, Amount: ${a.amount}, Desc: ${a.description?.slice(0, 60)}`);
    });

    const [gstRows] = await db.execute("SELECT * FROM account_activities WHERE commitment_type LIKE '%GST%' OR domain_name LIKE '%GST%' OR description LIKE '%GST%'");
    console.log(`\nGST / Tax Summary rows count: ${gstRows.length}, Total GST Amount: ₹${gstRows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0).toFixed(2)}`);

    const [joined] = await db.execute(`
        SELECT a.*, m.payment_plan AS master_payment_plan, m.sku AS master_sku
        FROM account_activities a
        LEFT JOIN master_accounts m ON (a.domain_name = m.domain OR a.customer_id = m.customer_id)
    `);

    const planSet = new Set();
    joined.forEach(r => {
        const plan = r.master_payment_plan || r.payment_plan || "Annual Plan (Monthly Payment)";
        planSet.add(plan);
    });

    console.log("\nAll Unique Joined Payment Plans:", Array.from(planSet));
    process.exit(0);
};

inspectRows().catch(e => { console.error(e); process.exit(1); });
