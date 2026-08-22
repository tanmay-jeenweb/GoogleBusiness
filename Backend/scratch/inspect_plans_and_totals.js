const db = require("../config/db.js");

const inspect = async () => {
    const [rows] = await db.execute("SELECT * FROM account_activities");
    console.log("Total rows in account_activities:", rows.length);

    let totalSum = 0;
    const planSet = new Set();
    const commitmentSet = new Set();

    rows.forEach(r => {
        const amt = parseFloat(r.amount) || 0;
        totalSum += amt;
        if (r.payment_plan) planSet.add(r.payment_plan);
        if (r.sku_plan) planSet.add(r.sku_plan);
        if (r.commitment_type) commitmentSet.add(r.commitment_type);
    });

    console.log("Total Amount Sum in account_activities: ₹", totalSum.toFixed(2));
    console.log("Unique Payment Plans / SKUs:", Array.from(planSet));
    console.log("Unique Commitment Types:", Array.from(commitmentSet));
    process.exit(0);
};

inspect().catch(e => { console.error(e); process.exit(1); });
