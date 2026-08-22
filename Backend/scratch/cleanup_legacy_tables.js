const db = require("../config/db.js");

const cleanupLegacyTables = async () => {
    console.log("Starting legacy tables cleanup...");

    // 1. Ensure master_accounts migration
    try {
        const [p1Acc] = await db.execute(`SHOW TABLES LIKE 'panel1_accounts'`);
        if (p1Acc.length > 0) {
            await db.execute(`
                INSERT IGNORE INTO master_accounts (company, domain, customer_id, cloud_identity_id, provisioning_id, order_number, product, sku, subscription_status, payment_plan, creation_date, renewal_date, assigned_licenses, purchased_licenses, raw_data, created_at)
                SELECT 'Panel 1', domain, customer_id, cloud_identity_id, provisioning_id, order_number, product, sku, subscription_status, payment_plan, creation_date, renewal_date, assigned_licenses, purchased_licenses, raw_data, created_at
                FROM panel1_accounts
            `);
        }
        const [p2Acc] = await db.execute(`SHOW TABLES LIKE 'panel2_accounts'`);
        if (p2Acc.length > 0) {
            await db.execute(`
                INSERT IGNORE INTO master_accounts (company, domain, customer_id, cloud_identity_id, provisioning_id, order_number, product, sku, subscription_status, payment_plan, creation_date, renewal_date, assigned_licenses, purchased_licenses, raw_data, created_at)
                SELECT 'Panel 2', domain, customer_id, cloud_identity_id, provisioning_id, order_number, product, sku, subscription_status, payment_plan, creation_date, renewal_date, assigned_licenses, purchased_licenses, raw_data, created_at
                FROM panel2_accounts
            `);
        }

        const [p1Act] = await db.execute(`SHOW TABLES LIKE 'panel1_activities'`);
        if (p1Act.length > 0) {
            await db.execute(`
                INSERT IGNORE INTO account_activities (company, billing_month, transaction_date, description, order_number, domain_name, customer_id, commitment_type, seats, sku_plan, amount, file_name, raw_data, created_at)
                SELECT 'Panel 1', billing_month, transaction_date, description, order_number, domain_name, customer_id, commitment_type, seats, sku_plan, amount, file_name, raw_data, created_at
                FROM panel1_activities
            `);
        }
        const [p2Act] = await db.execute(`SHOW TABLES LIKE 'panel2_activities'`);
        if (p2Act.length > 0) {
            await db.execute(`
                INSERT IGNORE INTO account_activities (company, billing_month, transaction_date, description, order_number, domain_name, customer_id, commitment_type, seats, sku_plan, amount, file_name, raw_data, created_at)
                SELECT 'Panel 2', billing_month, transaction_date, description, order_number, domain_name, customer_id, commitment_type, seats, sku_plan, amount, file_name, raw_data, created_at
                FROM panel2_activities
            `);
        }
    } catch (e) {
        console.log("Migration check note:", e.message);
    }

    // 2. Drop legacy unused tables
    const legacyTables = ["panel1_accounts", "panel1_activities", "panel2_accounts", "panel2_activities", "accounts", "imports"];
    for (const tbl of legacyTables) {
        try {
            await db.execute(`DROP TABLE IF EXISTS ${tbl}`);
            console.log(`✓ Dropped legacy table '${tbl}'`);
        } catch (err) {
            console.error(`Failed to drop table '${tbl}':`, err.message);
        }
    }

    // 3. Print remaining clean tables list
    const [tables] = await db.execute("SHOW TABLES");
    console.log("Remaining Clean Tables:", tables.map(r => Object.values(r)[0]));
    process.exit(0);
};

cleanupLegacyTables().catch(err => {
    console.error("Cleanup error:", err);
    process.exit(1);
});
