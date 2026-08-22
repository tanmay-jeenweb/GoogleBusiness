const db = require("../config/db.js");

const inspectGstAndDups = async () => {
    const [rows] = await db.execute("SELECT * FROM account_activities WHERE amount > 50000 OR domain_name IS NULL OR domain_name = 'N/A' OR domain_name LIKE '%GST%' OR commitment_type LIKE '%GST%' OR description LIKE '%GST%'");

    console.log(`Found ${rows.length} large/GST/summary rows:`);
    rows.forEach(r => {
        console.log(`ID: ${r.id}, Date: ${r.transaction_date}, Domain: '${r.domain_name}', CustomerID: '${r.customer_id}', Commitment: '${r.commitment_type}', PaymentPlan: '${r.payment_plan}', Amount: ₹${r.amount}`);
    });

    process.exit(0);
};

inspectGstAndDups().catch(e => { console.error(e); process.exit(1); });
