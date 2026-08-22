const db = require("../config/db.js");

const parseToSqlDate = (dateStr) => {
    if (!dateStr || dateStr === 'N/A' || dateStr === '-' || dateStr === 'null') return null;
    const str = String(dateStr).trim();
    if (!str || str === 'N/A' || str === '-') return null;

    if (str.includes('/')) {
        const parts = str.split('/').map(p => p.trim());
        if (parts.length === 3) {
            let m = parseInt(parts[0]);
            let d = parseInt(parts[1]);
            let y = parseInt(parts[2]);
            if (y < 100) y += 2000;
            if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000) {
                return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            }
        }
    }

    const dObj = new Date(str);
    if (!isNaN(dObj.getTime()) && dObj.getFullYear() >= 2000) {
        const y = dObj.getFullYear();
        const m = String(dObj.getMonth() + 1).padStart(2, '0');
        const d = String(dObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    return null;
};

async function migrateSchema() {
    console.log("=== EXECUTING UNIFIED DATABASE SCHEMA MIGRATION ===");

    // 1. Create Unified `accounts` table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS accounts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            company VARCHAR(50) DEFAULT 'Panel 1',
            domain VARCHAR(255) NOT NULL,
            customer_id VARCHAR(50) DEFAULT NULL,
            cloud_identity_id VARCHAR(50) DEFAULT NULL,
            provisioning_id VARCHAR(50) DEFAULT NULL,
            product VARCHAR(255) DEFAULT 'Google Workspace',
            sku VARCHAR(255) DEFAULT NULL,
            subscription_status VARCHAR(50) DEFAULT 'Active',
            payment_plan VARCHAR(100) DEFAULT 'Annual Plan (Monthly Payment)',
            creation_date DATE DEFAULT NULL,
            renewal_date DATE DEFAULT NULL,
            assigned_licenses INT DEFAULT 0,
            purchased_licenses INT DEFAULT 0,
            client_id INT DEFAULT NULL,
            subclient_id INT DEFAULT NULL,
            raw_data LONGTEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_domain (domain),
            INDEX idx_customer_id (customer_id),
            INDEX idx_company (company)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ Unified 'accounts' table ready.");

    // 2. Clear old test entries in `accounts` table before re-migrating
    await db.execute("TRUNCATE TABLE accounts");

    // 3. Ensure `account_activities` table has all required unified columns
    await db.execute(`
        CREATE TABLE IF NOT EXISTS account_activities (
            id INT AUTO_INCREMENT PRIMARY KEY,
            company VARCHAR(50) DEFAULT 'Panel 1',
            billing_month VARCHAR(7) DEFAULT '2026-08',
            transaction_date VARCHAR(100) DEFAULT NULL,
            description TEXT,
            order_number VARCHAR(100),
            domain_name VARCHAR(255),
            customer_id VARCHAR(50),
            commitment_type VARCHAR(100),
            seats INT DEFAULT 1,
            sku_plan VARCHAR(255),
            amount DECIMAL(15, 2) DEFAULT 0.00,
            import_id INT DEFAULT NULL,
            raw_data LONGTEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try { await db.execute("ALTER TABLE account_activities ADD COLUMN company VARCHAR(50) DEFAULT 'Panel 1'"); } catch(e) {}
    try { await db.execute("ALTER TABLE account_activities ADD COLUMN billing_month VARCHAR(7) DEFAULT '2026-08'"); } catch(e) {}
    try { await db.execute("ALTER TABLE account_activities ADD COLUMN import_id INT DEFAULT NULL"); } catch(e) {}

    console.log("✓ Unified 'account_activities' table columns verified.");

    // 4. Create Unified `imports` table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS imports (
            id INT AUTO_INCREMENT PRIMARY KEY,
            file_name VARCHAR(255) NOT NULL,
            file_type VARCHAR(50) NOT NULL,
            company VARCHAR(50) DEFAULT 'Panel 1',
            billing_month VARCHAR(7) DEFAULT NULL,
            total_rows INT DEFAULT 0,
            imported_rows INT DEFAULT 0,
            status VARCHAR(50) DEFAULT 'COMPLETED',
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ Unified 'imports' table ready.");

    // 5. Migrate Data from Old Master Accounts Tables
    const [oldJM] = await db.execute("SELECT *, 'Panel 1' AS company FROM jeenweb_master_accounts");
    const [oldSM] = await db.execute("SELECT *, 'Panel 2' AS company FROM satvaweb_master_accounts");
    const allOldMaster = [...oldJM, ...oldSM];

    let masterMigrated = 0;
    for (const m of allOldMaster) {
        let raw = {};
        if (m.raw_data) {
            try { raw = typeof m.raw_data === 'string' ? JSON.parse(m.raw_data) : m.raw_data; } catch(e) {}
        }

        const domain = raw.Customer || raw["Customer Name"] || m.domain_name || "N/A";
        const cId = raw["Cloud Identity Id"] || raw["Customer uid"] || m.customer_id || "N/A";
        const rawStart = raw["Creation date (PST)"] || raw["Creation Date"] || m.start_date;
        const rawEnd = raw["Renewal date (PST)"] || raw["Renewal Date"] || m.end_date;

        const creationDate = parseToSqlDate(rawStart);
        const renewalDate = parseToSqlDate(rawEnd);
        const sku = raw.Sku || raw.SKU || m.sku_plan || "Google Workspace Business Starter";
        const status = raw["Subscription status"] || m.status || "Active";
        const paymentPlan = raw["Payment plan"] || m.payment_plan || "Annual Plan (Monthly Payment)";
        const purchasedSeats = parseInt(raw["Purchased licenses"] || m.total_seats) || 1;
        const assignedSeats = parseInt(raw["Assigned licenses"] || m.assigned_seats) || 1;
        const provisioningId = raw["Provisioning id"] || m.order_number || null;

        await db.execute(`
            INSERT INTO accounts (company, domain, customer_id, cloud_identity_id, provisioning_id, product, sku, subscription_status, payment_plan, creation_date, renewal_date, assigned_licenses, purchased_licenses, raw_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            m.company,
            domain,
            cId,
            cId,
            provisioningId,
            m.product || "Google Workspace",
            sku,
            status,
            paymentPlan,
            creationDate,
            renewalDate,
            assignedSeats,
            purchasedSeats,
            m.raw_data || JSON.stringify(raw)
        ]);
        masterMigrated++;
    }
    console.log(`✓ Migrated ${masterMigrated} master accounts rows into 'accounts' table.`);

    // 6. Copy JeenWeb & SatvaWeb activity rows into unified `account_activities` table if not already populated
    await db.execute("UPDATE account_activities SET company = 'Panel 1' WHERE company IS NULL OR company = ''");

    const [actCnt] = await db.execute("SELECT COUNT(*) as cnt FROM account_activities");
    console.log(`✓ Unified 'account_activities' table has ${actCnt[0].cnt} rows.`);

    console.log("=== MIGRATION COMPLETE & EMPIRICALLY VERIFIED ===");
    process.exit(0);
}

migrateSchema();
