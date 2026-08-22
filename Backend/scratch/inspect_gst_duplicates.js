const db = require("../config/db.js");

const inspect = async () => {
    const [rows] = await db.execute(`SELECT * FROM account_activities WHERE domain_name LIKE '%GST%' OR description LIKE '%GST%' OR customer_id LIKE '%GST%'`);
    console.log("GST Rows in account_activities:", JSON.stringify(rows, null, 2));
    process.exit(0);
};

inspect().catch(e => { console.error(e); process.exit(1); });
