const db = require("../config/db.js");

async function inspect() {
    try {
        const [jM] = await db.execute("SELECT * FROM jeenweb_master_accounts LIMIT 5");
        console.log("--- JEENWEB MASTER ACCOUNTS (5) ---");
        console.log(JSON.stringify(jM, null, 2));

        const [sM] = await db.execute("SELECT * FROM satvaweb_master_accounts LIMIT 5");
        console.log("--- SATVAWEB MASTER ACCOUNTS (5) ---");
        console.log(JSON.stringify(sM, null, 2));

        const [jA] = await db.execute("SELECT * FROM jeenweb_account_activities WHERE amount > 0 LIMIT 5");
        console.log("--- JEENWEB ACCOUNT ACTIVITIES > 0 (5) ---");
        console.log(JSON.stringify(jA, null, 2));

        process.exit(0);
    } catch (err) {
        console.error("Inspect error:", err);
        process.exit(1);
    }
}

inspect();
