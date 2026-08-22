const db = require("../config/db.js");

const inspect = async () => {
    const [m] = await db.execute(`SELECT * FROM master_accounts WHERE domain LIKE '%aaress%' OR raw_data LIKE '%aaress%'`);
    console.log("Master Accounts for aaress:", m);

    const [a] = await db.execute(`SELECT * FROM account_activities WHERE domain_name LIKE '%aaress%' OR description LIKE '%aaress%'`);
    console.log("Account Activities for aaress:", a);
    process.exit(0);
};

inspect().catch(e => { console.error(e); process.exit(1); });
