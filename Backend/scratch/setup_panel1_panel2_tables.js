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

async function setupTables() {
    console.log("=== CREATING PANEL 1 AND PANEL 2 DATABASE TABLES ===");

    // 1. Panel 1 Accounts Registry
    await db.execute(`
        CREATE TABLE IF NOT EXISTS panel1_accounts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            domain VARCHAR(255) NOT NULL,
            customer_id VARCHAR(50) DEFAULT NULL,
            cloud_identity_id VARCHAR(50) DEFAULT NULL,
            product VARCHAR(255) DEFAULT 'Google Workspace',
            sku VARCHAR(255) DEFAULT 'Google Workspace Business Starter',
            subscription_status VARCHAR(50) DEFAULT 'Active',
            payment_plan VARCHAR(100) DEFAULT 'Annual Plan (Monthly Payment)',
            creation_date DATE DEFAULT NULL,
            renewal_date DATE DEFAULT NULL,
            assigned_licenses INT DEFAULT 0,
            purchased_licenses INT DEFAULT 0,
            raw_data LONGTEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_p1_domain (domain)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ 'panel1_accounts' table ready.");

    // 2. Panel 1 Monthly Activities
    await db.execute(`
        CREATE TABLE IF NOT EXISTS panel1_activities (
            id INT AUTO_INCREMENT PRIMARY KEY,
            billing_month VARCHAR(7) NOT NULL,
            transaction_date DATE DEFAULT NULL,
            description TEXT,
            order_number VARCHAR(100) DEFAULT NULL,
            domain_name VARCHAR(255) DEFAULT NULL,
            customer_id VARCHAR(50) DEFAULT NULL,
            commitment_type VARCHAR(100) DEFAULT NULL,
            seats INT DEFAULT 1,
            sku_plan VARCHAR(255) DEFAULT NULL,
            amount DECIMAL(15, 2) DEFAULT 0.00,
            file_name VARCHAR(255) DEFAULT NULL,
            raw_data LONGTEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_p1_month (billing_month),
            INDEX idx_p1_domain (domain_name),
            INDEX idx_p1_cid (customer_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ 'panel1_activities' table ready.");

    // 3. Panel 2 Accounts Registry
    await db.execute(`
        CREATE TABLE IF NOT EXISTS panel2_accounts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            domain VARCHAR(255) NOT NULL,
            customer_id VARCHAR(50) DEFAULT NULL,
            cloud_identity_id VARCHAR(50) DEFAULT NULL,
            product VARCHAR(255) DEFAULT 'Google Workspace',
            sku VARCHAR(255) DEFAULT 'Google Workspace Business Starter',
            subscription_status VARCHAR(50) DEFAULT 'Active',
            payment_plan VARCHAR(100) DEFAULT 'Annual Plan (Monthly Payment)',
            creation_date DATE DEFAULT NULL,
            renewal_date DATE DEFAULT NULL,
            assigned_licenses INT DEFAULT 0,
            purchased_licenses INT DEFAULT 0,
            raw_data LONGTEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_p2_domain (domain)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ 'panel2_accounts' table ready.");

    // 4. Panel 2 Monthly Activities
    await db.execute(`
        CREATE TABLE IF NOT EXISTS panel2_activities (
            id INT AUTO_INCREMENT PRIMARY KEY,
            billing_month VARCHAR(7) NOT NULL,
            transaction_date DATE DEFAULT NULL,
            description TEXT,
            order_number VARCHAR(100) DEFAULT NULL,
            domain_name VARCHAR(255) DEFAULT NULL,
            customer_id VARCHAR(50) DEFAULT NULL,
            commitment_type VARCHAR(100) DEFAULT NULL,
            seats INT DEFAULT 1,
            sku_plan VARCHAR(255) DEFAULT NULL,
            amount DECIMAL(15, 2) DEFAULT 0.00,
            file_name VARCHAR(255) DEFAULT NULL,
            raw_data LONGTEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_p2_month (billing_month),
            INDEX idx_p2_domain (domain_name),
            INDEX idx_p2_cid (customer_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✓ 'panel2_activities' table ready.");

    // 5. Migrate data into panel1_accounts & panel2_accounts
    const [accRows] = await db.execute("SELECT * FROM accounts");
    let p1AccCount = 0;
    let p2AccCount = 0;

    for (const a of accRows) {
        const targetTable = (a.company && a.company.includes("2")) ? "panel2_accounts" : "panel1_accounts";
        try {
            await db.execute(`
                INSERT INTO ${targetTable} (domain, customer_id, cloud_identity_id, provisioning_id, product, sku, subscription_status, payment_plan, creation_date, renewal_date, assigned_licenses, purchased_licenses, raw_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    customer_id = VALUES(customer_id),
                    sku = VALUES(sku),
                    creation_date = VALUES(creation_date),
                    renewal_date = VALUES(renewal_date),
                    purchased_licenses = VALUES(purchased_licenses)
            `, [
                a.domain, a.customer_id, a.cloud_identity_id, a.provisioning_id, a.product, a.sku,
                a.subscription_status, a.payment_plan, a.creation_date, a.renewal_date,
                a.assigned_licenses, a.purchased_licenses, a.raw_data
            ]);
            if (targetTable === "panel1_accounts") p1AccCount++; else p2AccCount++;
        } catch (e) {}
    }
    console.log(`✓ Migrated ${p1AccCount} rows to 'panel1_accounts' and ${p2AccCount} rows to 'panel2_accounts'.`);

    // 6. Migrate data into panel1_activities & panel2_activities
    const [actRows] = await db.execute("SELECT * FROM account_activities");
    let p1ActCount = 0;
    let p2ActCount = 0;

    for (const act of actRows) {
        const targetTable = (act.company && act.company.includes("2")) ? "panel2_activities" : "panel1_activities";
        const sqlDate = parseToSqlDate(act.transaction_date) || "2026-08-15";
        const bMonth = act.billing_month || sqlDate.slice(0, 7) || "2026-08";

        await db.execute(`
            INSERT INTO ${targetTable} (billing_month, transaction_date, description, order_number, domain_name, customer_id, commitment_type, seats, sku_plan, amount, raw_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            bMonth,
            sqlDate,
            act.description,
            act.order_number,
            act.domain_name,
            act.customer_id,
            act.commitment_type,
            act.seats || 1,
            act.sku_plan,
            act.amount || 0.00,
            act.raw_data
        ]);
        if (targetTable === "panel1_activities") p1ActCount++; else p2ActCount++;
    }
    console.log(`✓ Migrated ${p1ActCount} activity rows to 'panel1_activities' and ${p2ActCount} to 'panel2_activities'.`);

    console.log("=== PANEL 1 AND PANEL 2 TABLE SETUP COMPLETE ===");
    process.exit(0);
}

setupTables();
