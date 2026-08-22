const db = require("../config/db.js");

const test = async () => {
    const [actRows] = await db.execute(`SELECT * FROM account_activities WHERE domain_name LIKE '%aaress%' OR customer_id LIKE '%C025eevtx%'`);
    console.log("Account Activities matching aaress:", actRows);
    process.exit(0);
};

test().catch(e => { console.error(e); process.exit(1); });
