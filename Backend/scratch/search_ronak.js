const db = require("../config/db.js");

async function searchRonak() {
    console.log("=== SEARCHING FOR RONAKFARMA.COM IN ALL TABLES ===");

    try {
        const [m1] = await db.execute("SELECT * FROM jeenweb_master_accounts WHERE domain_name LIKE '%ronak%' OR customer_id LIKE '%C01686%' OR raw_data LIKE '%ronak%'");
        console.log("jeenweb_master_accounts match count:", m1.length);
        if (m1.length > 0) console.log(JSON.stringify(m1, null, 2));

        const [m2] = await db.execute("SELECT * FROM satvaweb_master_accounts WHERE domain_name LIKE '%ronak%' OR customer_id LIKE '%C01686%' OR raw_data LIKE '%ronak%'");
        console.log("satvaweb_master_accounts match count:", m2.length);
        if (m2.length > 0) console.log(JSON.stringify(m2, null, 2));

        const [m3] = await db.execute("SELECT * FROM master_accounts WHERE domain_name LIKE '%ronak%' OR customer_id LIKE '%C01686%' OR raw_data LIKE '%ronak%'");
        console.log("master_accounts match count:", m3.length);
        if (m3.length > 0) console.log(JSON.stringify(m3, null, 2));

        const [a1] = await db.execute("SELECT * FROM jeenweb_account_activities WHERE domain_name LIKE '%ronak%' OR customer_id LIKE '%C01686%' OR description LIKE '%ronak%' LIMIT 3");
        console.log("\njeenweb_account_activities match count (showing 3):");
        console.log(JSON.stringify(a1, null, 2));

        process.exit(0);
    } catch (err) {
        console.error("Search error:", err);
        process.exit(1);
    }
}

searchRonak();
