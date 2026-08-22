const db = require("../config/db.js");

async function testAllTables() {
    try {
        const [tables] = await db.execute("SHOW TABLES");
        console.log("--- ALL TABLES IN DATABASE ---");
        console.log(tables);

        const [lM] = await db.execute("SELECT COUNT(*) as cnt FROM master_accounts");
        console.log("master_accounts count:", lM[0].cnt);

        const [jM] = await db.execute("SELECT COUNT(*) as cnt FROM jeenweb_master_accounts");
        console.log("jeenweb_master_accounts count:", jM[0].cnt);

        const [sM] = await db.execute("SELECT COUNT(*) as cnt FROM satvaweb_master_accounts");
        console.log("satvaweb_master_accounts count:", sM[0].cnt);

        const [lA] = await db.execute("SELECT COUNT(*) as cnt FROM account_activities");
        console.log("account_activities count:", lA[0].cnt);

        const [jA] = await db.execute("SELECT COUNT(*) as cnt FROM jeenweb_account_activities");
        console.log("jeenweb_account_activities count:", jA[0].cnt);

        const [sA] = await db.execute("SELECT COUNT(*) as cnt FROM satvaweb_account_activities");
        console.log("satvaweb_account_activities count:", sA[0].cnt);

        if (lM[0].cnt > 0) {
            const [samples] = await db.execute("SELECT * FROM master_accounts LIMIT 5");
            console.log("\n--- SAMPLES FROM master_accounts ---");
            console.log(JSON.stringify(samples, null, 2));
        }

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

testAllTables();
