const db = require("../config/db.js");

async function verifyAllMasterRows() {
    console.log("=== VERIFYING ALL MASTER ACCOUNT ROWS IN MYSQL DATABASE ===");

    const [jM] = await db.execute("SELECT id, domain_name, customer_id, product, sku_plan, start_date, end_date, file_name, uploaded_at FROM jeenweb_master_accounts");
    console.log(`\njeenweb_master_accounts has ${jM.length} rows:`);
    console.log(JSON.stringify(jM, null, 2));

    const [sM] = await db.execute("SELECT id, domain_name, customer_id, product, sku_plan, start_date, end_date, file_name, uploaded_at FROM satvaweb_master_accounts");
    console.log(`\nsatvaweb_master_accounts has ${sM.length} rows:`);
    console.log(JSON.stringify(sM, null, 2));

    const [lM] = await db.execute("SELECT id, domain_name, customer_id, product, sku_plan, start_date, end_date, file_name, uploaded_at FROM master_accounts");
    console.log(`\nmaster_accounts has ${lM.length} rows:`);
    console.log(JSON.stringify(lM, null, 2));

    process.exit(0);
}

verifyAllMasterRows();
