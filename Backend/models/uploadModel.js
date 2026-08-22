const db = require("../config/db.js");

// Initialize MySQL Tables for Unified Master Accounts and Account Activities
const initUploadTables = async () => {
    // 1. Master Accounts Registry (Unified for Panel 1 and Panel 2)
    await db.execute(`
        CREATE TABLE IF NOT EXISTS master_accounts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            company VARCHAR(50) NOT NULL DEFAULT 'Panel 1',
            domain VARCHAR(255) NOT NULL,
            customer_id VARCHAR(100) DEFAULT NULL,
            cloud_identity_id VARCHAR(100) DEFAULT NULL,
            provisioning_id VARCHAR(100) DEFAULT NULL,
            order_number VARCHAR(100) DEFAULT NULL,
            product VARCHAR(255) DEFAULT 'Google Workspace',
            sku VARCHAR(255) DEFAULT 'Google Workspace Business Starter',
            subscription_status VARCHAR(50) DEFAULT 'Active',
            payment_plan VARCHAR(100) DEFAULT 'Annual Plan (Monthly Payment)',
            creation_date DATE DEFAULT NULL,
            renewal_date DATE DEFAULT NULL,
            assigned_licenses INT DEFAULT 0,
            purchased_licenses INT DEFAULT 0,
            file_name VARCHAR(255) DEFAULT NULL,
            raw_data LONGTEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_ma_domain (domain),
            INDEX idx_ma_customer_id (customer_id),
            INDEX idx_ma_company (company)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Account Activities (Unified for Panel 1 and Panel 2)
    await db.execute(`
        CREATE TABLE IF NOT EXISTS account_activities (
            id INT AUTO_INCREMENT PRIMARY KEY,
            company VARCHAR(50) NOT NULL DEFAULT 'Panel 1',
            billing_month VARCHAR(7) NOT NULL,
            transaction_date DATE DEFAULT NULL,
            description TEXT,
            order_number VARCHAR(100) DEFAULT NULL,
            domain_name VARCHAR(255) DEFAULT NULL,
            customer_id VARCHAR(100) DEFAULT NULL,
            commitment_type VARCHAR(100) DEFAULT NULL,
            seats INT DEFAULT 1,
            sku_plan VARCHAR(255) DEFAULT NULL,
            amount DECIMAL(15, 2) DEFAULT 0.00,
            file_name VARCHAR(255) DEFAULT NULL,
            raw_data LONGTEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_aa_month (billing_month),
            INDEX idx_aa_domain (domain_name),
            INDEX idx_aa_customer_id (customer_id),
            INDEX idx_aa_company (company)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. Upload Logs Table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS upload_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            company VARCHAR(50) DEFAULT 'Panel 1',
            file_name VARCHAR(255) NOT NULL,
            file_type VARCHAR(50) NOT NULL,
            file_size VARCHAR(50) DEFAULT '0 B',
            record_count INT DEFAULT 0,
            status VARCHAR(50) DEFAULT 'Ready',
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Migrate any legacy table data automatically
    try {
        await migrateLegacyTablesToUnified();
    } catch (err) {
        console.log("Legacy migration note:", err.message);
    }
};

const migrateLegacyTablesToUnified = async () => {
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
        console.log("Legacy migration note:", e.message);
    }
};

const getCompanyLabel = (comp) => {
    if (!comp) return "Panel 1";
    const c = String(comp).toLowerCase().trim();
    if (c.includes("satva") || c.includes("panel 2") || c.includes("panel2")) return "Panel 2";
    return "Panel 1";
};

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
        return `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
    }

    return null;
};

const findExistingAccountActivity = async (company, data) => {
    const label = getCompanyLabel(company);
    const amt = data.amount ? parseFloat(String(data.amount).replace(/,/g, "")) : 0.00;
    const orderNum = (data.order_number && data.order_number !== 'N/A') ? String(data.order_number).trim() : null;
    const dName = (data.domain_name && data.domain_name !== 'N/A') ? String(data.domain_name).trim() : null;
    const cId = (data.customer_id && data.customer_id !== 'N/A') ? String(data.customer_id).trim() : null;

    // Check if this is a GST Tax summary row
    const isGst = (data.commitment_type === 'GST / Tax Summary') || 
                  (dName && dName.toLowerCase().includes('gst tax')) || 
                  (cId === 'GST-TAX');

    if (isGst) {
        const sqlDate = parseToSqlDate(data.transaction_date);
        const bMonth = (data.billing_month && String(data.billing_month).trim()) 
            ? String(data.billing_month).trim().slice(0, 7) 
            : (sqlDate ? sqlDate.slice(0, 7) : "2026-08");

        const [gstRows] = await db.execute(`
            SELECT * FROM account_activities 
            WHERE (customer_id = 'GST-TAX' OR domain_name LIKE '%GST Tax%' OR commitment_type = 'GST / Tax Summary')
              AND billing_month = ?
            LIMIT 1
        `, [bMonth]);
        if (gstRows.length > 0) return gstRows[0];
    }

    if (!orderNum) {
        if (!dName || !data.transaction_date || data.transaction_date === 'N/A') return null;
        const [rows] = await db.execute(`
            SELECT * FROM account_activities 
            WHERE domain_name = ? AND amount = ?
            LIMIT 1
        `, [dName, amt]);
        return rows.length > 0 ? rows[0] : null;
    }

    const [rows] = await db.execute(`
        SELECT * FROM account_activities 
        WHERE order_number = ? 
          AND (customer_id = ? OR domain_name = ?)
        LIMIT 1
    `, [orderNum, cId || '', dName || '']);
    return rows.length > 0 ? rows[0] : null;
};

const findExistingMasterAccount = async (company, data) => {
    const label = getCompanyLabel(company);
    const dName = (data.domain_name || data.domain || '').trim();
    const cId = (data.customer_id || '').trim();
    if ((!dName || dName === 'N/A') && (!cId || cId === 'N/A')) return null;

    const [rows] = await db.execute(`
        SELECT * FROM master_accounts 
        WHERE ((domain = ? AND domain != 'N/A')
           OR (customer_id = ? AND customer_id != 'N/A')
           OR (cloud_identity_id = ? AND cloud_identity_id != 'N/A'))
        LIMIT 1
    `, [dName, cId, cId]);
    return rows.length > 0 ? rows[0] : null;
};

const insertAccountActivity = async (company, data) => {
    if (typeof company === 'object' && !data) {
        data = company;
        company = 'Panel 1';
    }
    const label = getCompanyLabel(company);
    const existing = await findExistingAccountActivity(label, data);

    const amt = data.amount ? parseFloat(String(data.amount).replace(/[^0-9.-]/g, "")) || 0.00 : 0.00;
    const seats = parseInt(data.seats) || 1;
    const sqlDate = parseToSqlDate(data.transaction_date);
    const billingMonth = (data.billing_month && String(data.billing_month).trim()) 
        ? String(data.billing_month).trim().slice(0, 7) 
        : (sqlDate ? sqlDate.slice(0, 7) : "2026-08");

    if (existing) {
        const existingAmt = parseFloat(existing.amount) || 0.00;
        const existingSeats = parseInt(existing.seats) || 1;

        const isModified = (Math.abs(existingAmt - amt) > 0.01) || 
                           (existingSeats !== seats) || 
                           (existing.commitment_type !== data.commitment_type) ||
                           (existing.sku_plan !== data.sku_plan);

        if (isModified) {
            await db.execute(`
                UPDATE account_activities SET
                    company = ?,
                    description = COALESCE(?, description),
                    commitment_type = COALESCE(?, commitment_type),
                    seats = ?,
                    sku_plan = COALESCE(?, sku_plan),
                    amount = ?,
                    file_name = ?,
                    raw_data = ?
                WHERE id = ?
            `, [
                label,
                data.description || null,
                data.commitment_type || null,
                seats,
                data.sku_plan || null,
                amt,
                data.file_name || null,
                data.raw_data ? JSON.stringify(data.raw_data) : null,
                existing.id
            ]);
            return { inserted: false, updated: true, duplicate: false, id: existing.id };
        } else {
            return { inserted: false, updated: false, duplicate: true, id: existing.id };
        }
    }

    const [result] = await db.execute(`
        INSERT INTO account_activities 
        (company, billing_month, transaction_date, description, order_number, domain_name, customer_id, commitment_type, seats, sku_plan, amount, file_name, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        label,
        billingMonth,
        sqlDate,
        data.description || null,
        data.order_number || null,
        data.domain_name || null,
        data.customer_id || null,
        data.commitment_type || null,
        seats,
        data.sku_plan || null,
        amt,
        data.file_name || null,
        data.raw_data ? JSON.stringify(data.raw_data) : null
    ]);

    return { inserted: true, updated: false, duplicate: false, id: result.insertId };
};

const insertMasterAccount = async (company, data) => {
    if (typeof company === 'object' && !data) {
        data = company;
        company = 'Panel 1';
    }
    const label = getCompanyLabel(company);
    const existing = await findExistingMasterAccount(label, data);

    const creationDate = parseToSqlDate(data.start_date || data.creation_date);
    const renewalDate = parseToSqlDate(data.end_date || data.renewal_date);
    const domain = (data.domain_name && String(data.domain_name).trim()) || (data.domain && String(data.domain).trim()) || "N/A";
    const cId = (data.customer_id && String(data.customer_id).trim()) || "N/A";

    if (existing) {
        await db.execute(`
            UPDATE master_accounts SET
                company = ?,
                customer_id = COALESCE(NULLIF(?, 'N/A'), customer_id),
                cloud_identity_id = COALESCE(NULLIF(?, 'N/A'), cloud_identity_id),
                product = COALESCE(NULLIF(?, ''), product),
                sku = COALESCE(NULLIF(?, ''), sku),
                subscription_status = COALESCE(NULLIF(?, ''), subscription_status),
                payment_plan = COALESCE(NULLIF(?, ''), payment_plan),
                creation_date = COALESCE(?, creation_date),
                renewal_date = COALESCE(?, renewal_date),
                purchased_licenses = COALESCE(?, purchased_licenses),
                assigned_licenses = COALESCE(?, assigned_licenses),
                file_name = COALESCE(?, file_name),
                raw_data = COALESCE(?, raw_data)
            WHERE id = ?
        `, [
            label, cId, cId, data.product || null, data.sku_plan || null, data.status || null, data.payment_plan || null,
            creationDate, renewalDate, parseInt(data.total_seats) || null, parseInt(data.assigned_seats) || null,
            data.file_name || null, data.raw_data ? JSON.stringify(data.raw_data) : null, existing.id
        ]);
        return { inserted: false, updated: true, duplicate: false, id: existing.id };
    }

    const [result] = await db.execute(`
        INSERT INTO master_accounts 
        (company, domain, customer_id, cloud_identity_id, provisioning_id, product, sku, subscription_status, payment_plan, creation_date, renewal_date, assigned_licenses, purchased_licenses, file_name, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        label, domain, cId, cId, data.order_number || null, data.product || "Google Workspace",
        data.sku_plan || null, data.status || "Active", data.payment_plan || "Annual Plan (Monthly Payment)",
        creationDate, renewalDate, parseInt(data.assigned_seats) || 0, parseInt(data.total_seats) || 0,
        data.file_name || null, data.raw_data ? JSON.stringify(data.raw_data) : null
    ]);

    return { inserted: true, updated: false, duplicate: false, id: result.insertId };
};

const removeExistingDuplicates = async () => {
    try {
        await db.execute(`
            DELETE a1 FROM account_activities a1
            INNER JOIN account_activities a2 
            WHERE a1.id > a2.id 
              AND (a1.customer_id = 'GST-TAX' OR a1.domain_name LIKE '%GST Tax%' OR a1.commitment_type = 'GST / Tax Summary')
              AND (a2.customer_id = 'GST-TAX' OR a2.domain_name LIKE '%GST Tax%' OR a2.commitment_type = 'GST / Tax Summary')
              AND a1.billing_month = a2.billing_month;
        `);

        await db.execute(`
            DELETE a1 FROM account_activities a1
            INNER JOIN account_activities a2 
            WHERE a1.id > a2.id 
              AND a1.order_number = a2.order_number 
              AND a1.order_number != 'N/A'
              AND a1.customer_id = a2.customer_id;
        `);

        await db.execute(`
            DELETE m1 FROM master_accounts m1
            INNER JOIN master_accounts m2 
            WHERE m1.id > m2.id 
              AND m1.domain = m2.domain 
              AND m1.domain != 'N/A';
        `);
    } catch (e) {}
};

const logUpload = async (fileName, fileType, fileSize, recordCount, company = "Panel 1") => {
    const label = getCompanyLabel(company);
    const query = `
        INSERT INTO upload_logs (company, file_name, file_type, file_size, record_count, status)
        VALUES (?, ?, ?, ?, ?, 'Ready')
    `;
    const [result] = await db.execute(query, [label, fileName, fileType, fileSize, recordCount]);
    return result.insertId;
};

const getUploadLogs = async () => {
    const [rows] = await db.execute(`SELECT * FROM upload_logs ORDER BY uploaded_at DESC`);
    return rows;
};

const getAccountActivities = async (company = "all") => {
    if (company === "all") {
        const [rows] = await db.execute(`SELECT * FROM account_activities ORDER BY id DESC`);
        return rows;
    }
    const label = getCompanyLabel(company);
    const [rows] = await db.execute(`SELECT * FROM account_activities WHERE company = ? ORDER BY id DESC`, [label]);
    return rows;
};

const getMasterAccounts = async (company = "all") => {
    if (company === "all") {
        const [rows] = await db.execute(`SELECT * FROM master_accounts ORDER BY id DESC`);
        return rows;
    }
    const label = getCompanyLabel(company);
    const [rows] = await db.execute(`SELECT * FROM master_accounts WHERE company = ? ORDER BY id DESC`, [label]);
    return rows;
};

const getJoinedTransactions = async (company = "all") => {
    let whereClause = "";
    let params = [];
    if (company && company !== "all") {
        const label = getCompanyLabel(company);
        whereClause = "WHERE a.company = ?";
        params.push(label);
    }

    const query = `
        SELECT 
            a.*, 
            m.creation_date, 
            m.renewal_date, 
            m.payment_plan,
            a.company AS seller_company
        FROM account_activities a
        LEFT JOIN master_accounts m ON (a.domain_name = m.domain OR (a.customer_id IS NOT NULL AND a.customer_id = m.customer_id AND a.customer_id != 'N/A'))
        ${whereClause}
        ORDER BY a.id DESC
    `;
    const [rows] = await db.execute(query, params);
    return rows;
};

const updateTransactionCategoryInDb = async (id, newCategory) => {
    const [rows] = await db.execute(`SELECT * FROM account_activities WHERE id = ?`, [id]);
    if (rows.length === 0) {
        return { success: false, message: "Transaction record not found" };
    }
    const oldCategory = rows[0].commitment_type;
    const domainName = rows[0].domain_name;
    await db.execute(`UPDATE account_activities SET commitment_type = ? WHERE id = ?`, [newCategory, id]);
    return { success: true, oldCategory, newCategory, domainName };
};

const deleteUploadLog = async (id) => {
    await db.execute(`DELETE FROM upload_logs WHERE id = ?`, [id]);
    return true;
};

const truncateCompanyAccountActivities = async (company) => {
    if (company === "all") {
        await db.execute(`TRUNCATE TABLE account_activities`);
    } else {
        const label = getCompanyLabel(company);
        await db.execute(`DELETE FROM account_activities WHERE company = ?`, [label]);
    }
    return true;
};

const truncateCompanyMasterAccounts = async (company) => {
    if (company === "all") {
        await db.execute(`TRUNCATE TABLE master_accounts`);
    } else {
        const label = getCompanyLabel(company);
        await db.execute(`DELETE FROM master_accounts WHERE company = ?`, [label]);
    }
    return true;
};

const truncateAllUploads = async () => {
    await db.execute(`TRUNCATE TABLE master_accounts`);
    await db.execute(`TRUNCATE TABLE account_activities`);
    await db.execute(`TRUNCATE TABLE upload_logs`);
    return true;
};

module.exports = {
    initUploadTables,
    insertAccountActivity,
    insertMasterAccount,
    findExistingAccountActivity,
    findExistingMasterAccount,
    removeExistingDuplicates,
    logUpload,
    getUploadLogs,
    getAccountActivities,
    getMasterAccounts,
    getJoinedTransactions,
    updateTransactionCategoryInDb,
    deleteUploadLog,
    truncateCompanyAccountActivities,
    truncateCompanyMasterAccounts,
    truncateAllUploads
};
