const db = require("../config/db.js");

async function cleanOldTables() {
    console.log("=== CHECKING AND CLEANING OLD REDUNDANT TABLES IN MYSQL DATABASE ===");

    const [tables] = await db.execute("SHOW TABLES");
    console.log("Tables currently in database:");
    console.log(tables);

    const tablesToDrop = [
        "jeenweb_master_accounts",
        "satvaweb_master_accounts",
        "jeenweb_account_activities",
        "satvaweb_account_activities",
        "master_accounts"
    ];

    for (const t of tablesToDrop) {
        try {
            await db.execute(`DROP TABLE IF EXISTS ${t}`);
            console.log(`✓ Dropped redundant table: ${t}`);
        } catch (err) {
            console.error(`Error dropping ${t}:`, err.message);
        }
    }

    const [remainingTables] = await db.execute("SHOW TABLES");
    console.log("\nRemaining Clean Tables in database:");
    console.log(remainingTables);

    process.exit(0);
}

cleanOldTables();
