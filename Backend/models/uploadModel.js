const db = require("../config/db.js");

// Initialize 4 MySQL Tables for JeenWeb and SatvaWeb
const initUploadTables = async () => {
    const companies = ["jeenweb", "satvaweb"];

    for (const company of companies) {
        // 1. Account Activities Table per company
        const createAccountActivitiesTable = `
            CREATE TABLE IF NOT EXISTS ${company}_account_activities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                transaction_date VARCHAR(100) DEFAULT NULL,
                description TEXT DEFAULT NULL,
                order_number VARCHAR(100) DEFAULT NULL,
                domain_name VARCHAR(255) DEFAULT NULL,
                customer_id VARCHAR(100) DEFAULT NULL,
                commitment_type VARCHAR(100) DEFAULT NULL,
                seats INT DEFAULT 1,
                sku_plan VARCHAR(255) DEFAULT NULL,
                amount DECIMAL(12, 2) DEFAULT 0.00,
                file_name VARCHAR(255) DEFAULT NULL,
                raw_data LONGTEXT DEFAULT NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await db.execute(createAccountActivitiesTable);

        // Auto alter table if new columns don't exist yet
        try { await db.execute(`ALTER TABLE ${company}_account_activities ADD COLUMN commitment_type VARCHAR(100) DEFAULT NULL`); } catch (e) {}
        try { await db.execute(`ALTER TABLE ${company}_account_activities ADD COLUMN seats INT DEFAULT 1`); } catch (e) {}
        try { await db.execute(`ALTER TABLE ${company}_account_activities ADD COLUMN sku_plan VARCHAR(255) DEFAULT NULL`); } catch (e) {}
        try { await db.execute(`ALTER TABLE ${company}_account_activities ADD COLUMN raw_data LONGTEXT DEFAULT NULL`); } catch (e) {}

        // 2. Master Accounts Table per company
        const createMasterAccountsTable = `
            CREATE TABLE IF NOT EXISTS ${company}_master_accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                domain_name VARCHAR(255) DEFAULT NULL,
                product VARCHAR(255) DEFAULT NULL,
                sku_plan VARCHAR(255) DEFAULT NULL,
                start_date VARCHAR(100) DEFAULT NULL,
                status VARCHAR(50) DEFAULT NULL,
                payment_plan VARCHAR(255) DEFAULT NULL,
                end_date VARCHAR(100) DEFAULT NULL,
                total_seats INT DEFAULT 0,
                assigned_seats INT DEFAULT 0,
                subscription_id VARCHAR(100) DEFAULT NULL,
                customer_id VARCHAR(100) DEFAULT NULL,
                order_number VARCHAR(100) DEFAULT NULL,
                file_name VARCHAR(255) DEFAULT NULL,
                raw_data LONGTEXT DEFAULT NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await db.execute(createMasterAccountsTable);

        try { await db.execute(`ALTER TABLE ${company}_master_accounts ADD COLUMN raw_data LONGTEXT DEFAULT NULL`); } catch (e) {}
    }

    // 3. Backward compatible legacy tables
    await db.execute(`
        CREATE TABLE IF NOT EXISTS account_activities (
            id INT AUTO_INCREMENT PRIMARY KEY,
            transaction_date VARCHAR(100) DEFAULT NULL,
            description TEXT DEFAULT NULL,
            order_number VARCHAR(100) DEFAULT NULL,
            domain_name VARCHAR(255) DEFAULT NULL,
            customer_id VARCHAR(100) DEFAULT NULL,
            commitment_type VARCHAR(100) DEFAULT NULL,
            seats INT DEFAULT 1,
            sku_plan VARCHAR(255) DEFAULT NULL,
            amount DECIMAL(12, 2) DEFAULT 0.00,
            file_name VARCHAR(255) DEFAULT NULL,
            raw_data LONGTEXT DEFAULT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS master_accounts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            domain_name VARCHAR(255) DEFAULT NULL,
            product VARCHAR(255) DEFAULT NULL,
            sku_plan VARCHAR(255) DEFAULT NULL,
            start_date VARCHAR(100) DEFAULT NULL,
            status VARCHAR(50) DEFAULT NULL,
            payment_plan VARCHAR(255) DEFAULT NULL,
            end_date VARCHAR(100) DEFAULT NULL,
            total_seats INT DEFAULT 0,
            assigned_seats INT DEFAULT 0,
            subscription_id VARCHAR(100) DEFAULT NULL,
            customer_id VARCHAR(100) DEFAULT NULL,
            order_number VARCHAR(100) DEFAULT NULL,
            file_name VARCHAR(255) DEFAULT NULL,
            raw_data LONGTEXT DEFAULT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 4. Upload Logs Table
    const createUploadLogsTable = `
        CREATE TABLE IF NOT EXISTS upload_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            company VARCHAR(50) DEFAULT 'jeenweb',
            file_name VARCHAR(255) NOT NULL,
            file_type VARCHAR(50) NOT NULL,
            file_size VARCHAR(50) DEFAULT '0 B',
            record_count INT DEFAULT 0,
            status VARCHAR(50) DEFAULT 'Ready',
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    await db.execute(createUploadLogsTable);
    try { await db.execute(`ALTER TABLE upload_logs ADD COLUMN company VARCHAR(50) DEFAULT 'jeenweb'`); } catch (e) {}
};

// Normalize company string to 'jeenweb' or 'satvaweb'
const cleanCompany = (comp) => {
    if (!comp) return "jeenweb";
    const c = String(comp).toLowerCase().trim();
    if (c.includes("satva")) return "satvaweb";
    return "jeenweb";
};

// Check existing Account Activity record with smart fallback
const findExistingAccountActivity = async (company, data) => {
    const comp = cleanCompany(company);
    if (!data.order_number || data.order_number === 'N/A') {
        if (!data.domain_name || data.domain_name === 'N/A' || !data.transaction_date || data.transaction_date === 'N/A') return null;
        const [rows] = await db.execute(`
            SELECT * FROM ${comp}_account_activities 
            WHERE domain_name = ? AND transaction_date = ? AND amount = ?
            LIMIT 1
        `, [data.domain_name, data.transaction_date, data.amount ? parseFloat(String(data.amount).replace(/,/g, "")) : 0.00]);
        return rows.length > 0 ? rows[0] : null;
    }
    const query = `
        SELECT * FROM ${comp}_account_activities 
        WHERE order_number = ? AND (customer_id = ? OR domain_name = ?)
        LIMIT 1
    `;
    const [rows] = await db.execute(query, [
        data.order_number,
        data.customer_id || '',
        data.domain_name || ''
    ]);
    return rows.length > 0 ? rows[0] : null;
};

// Check existing Master Account record
const findExistingMasterAccount = async (company, data) => {
    const comp = cleanCompany(company);
    if ((!data.domain_name || data.domain_name === 'N/A') && (!data.customer_id || data.customer_id === 'N/A')) return null;
    const query = `
        SELECT id FROM ${comp}_master_accounts 
        WHERE (domain_name = ? AND domain_name != 'N/A')
           OR (customer_id = ? AND customer_id != 'N/A')
           OR (subscription_id = ? AND subscription_id != 'N/A' AND subscription_id != '')
        LIMIT 1
    `;
    const [rows] = await db.execute(query, [
        data.domain_name || '',
        data.customer_id || '',
        data.subscription_id || ''
    ]);
    return rows.length > 0 ? rows[0] : null;
};

// Insert or Smart Upsert Account Activity into specified company table
const insertAccountActivity = async (company, data) => {
    // If called with single argument object
    if (typeof company === 'object' && !data) {
        data = company;
        company = 'jeenweb';
    }
    const comp = cleanCompany(company);
    const existing = await findExistingAccountActivity(comp, data);
    
    const amt = data.amount ? parseFloat(String(data.amount).replace(/,/g, "")) : 0.00;
    const seats = parseInt(data.seats) || 1;

    if (existing) {
        const existingAmt = parseFloat(existing.amount) || 0.00;
        const existingSeats = parseInt(existing.seats) || 1;

        const isModified = (Math.abs(existingAmt - amt) > 0.01) || 
                           (existingSeats !== seats) || 
                           (existing.commitment_type !== data.commitment_type) ||
                           (existing.sku_plan !== data.sku_plan);

        if (isModified) {
            await db.execute(`
                UPDATE ${comp}_account_activities SET
                    transaction_date = COALESCE(?, transaction_date),
                    description = COALESCE(?, description),
                    commitment_type = COALESCE(?, commitment_type),
                    seats = ?,
                    sku_plan = COALESCE(?, sku_plan),
                    amount = ?,
                    file_name = ?,
                    raw_data = ?
                WHERE id = ?
            `, [
                data.transaction_date || null,
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

    const query = `
        INSERT INTO ${comp}_account_activities 
        (transaction_date, description, order_number, domain_name, customer_id, commitment_type, seats, sku_plan, amount, file_name, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
        data.transaction_date || null,
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

// Insert or Update Master Account in specified company table
const insertMasterAccount = async (company, data) => {
    if (typeof company === 'object' && !data) {
        data = company;
        company = 'jeenweb';
    }
    const comp = cleanCompany(company);
    const existing = await findExistingMasterAccount(comp, data);
    if (existing) {
        const updateQuery = `
            UPDATE ${comp}_master_accounts SET
                product = COALESCE(?, product),
                sku_plan = COALESCE(?, sku_plan),
                start_date = COALESCE(?, start_date),
                status = COALESCE(?, status),
                payment_plan = COALESCE(?, payment_plan),
                end_date = COALESCE(?, end_date),
                total_seats = COALESCE(?, total_seats),
                assigned_seats = COALESCE(?, assigned_seats),
                subscription_id = COALESCE(?, subscription_id),
                order_number = COALESCE(?, order_number),
                file_name = COALESCE(?, file_name),
                raw_data = COALESCE(?, raw_data)
            WHERE id = ?
        `;
        await db.execute(updateQuery, [
            data.product || null,
            data.sku_plan || null,
            data.start_date || null,
            data.status || null,
            data.payment_plan || null,
            data.end_date || null,
            parseInt(data.total_seats) || null,
            parseInt(data.assigned_seats) || null,
            data.subscription_id || null,
            data.order_number || null,
            data.file_name || null,
            data.raw_data ? JSON.stringify(data.raw_data) : null,
            existing.id
        ]);
        return { updated: true, duplicate: false, id: existing.id };
    }

    const query = `
        INSERT INTO ${comp}_master_accounts
        (domain_name, product, sku_plan, start_date, status, payment_plan, end_date, total_seats, assigned_seats, subscription_id, customer_id, order_number, file_name, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
        data.domain_name || null,
        data.product || null,
        data.sku_plan || null,
        data.start_date || null,
        data.status || null,
        data.payment_plan || null,
        data.end_date || null,
        parseInt(data.total_seats) || 0,
        parseInt(data.assigned_seats) || 0,
        data.subscription_id || null,
        data.customer_id || null,
        data.order_number || null,
        data.file_name || null,
        data.raw_data ? JSON.stringify(data.raw_data) : null
    ]);

    // Mirror to legacy table for backward compatibility
    try {
        await db.execute(`
            INSERT INTO master_accounts
            (domain_name, product, sku_plan, start_date, status, payment_plan, end_date, total_seats, assigned_seats, subscription_id, customer_id, order_number, file_name, raw_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            data.domain_name || null,
            data.product || null,
            data.sku_plan || null,
            data.start_date || null,
            data.status || null,
            data.payment_plan || null,
            data.end_date || null,
            parseInt(data.total_seats) || 0,
            parseInt(data.assigned_seats) || 0,
            data.subscription_id || null,
            data.customer_id || null,
            data.order_number || null,
            data.file_name || null,
            data.raw_data ? JSON.stringify(data.raw_data) : null
        ]);
    } catch (e) {}

    return { inserted: true, id: result.insertId };
};

// Clean duplicate records per company
const removeExistingDuplicates = async () => {
    const companies = ["jeenweb", "satvaweb", "legacy"];
    for (const c of companies) {
        const prefix = c === "legacy" ? "" : `${c}_`;
        try {
            await db.execute(`
                DELETE a1 FROM ${prefix}account_activities a1
                INNER JOIN ${prefix}account_activities a2 
                WHERE a1.id > a2.id 
                  AND a1.order_number = a2.order_number 
                  AND a1.order_number != 'N/A'
                  AND a1.customer_id = a2.customer_id;
            `);

            await db.execute(`
                DELETE m1 FROM ${prefix}master_accounts m1
                INNER JOIN ${prefix}master_accounts m2 
                WHERE m1.id > m2.id 
                  AND m1.domain_name = m2.domain_name 
                  AND m1.domain_name != 'N/A';
            `);
        } catch (e) {}
    }
};

// Log upload metadata with company
const logUpload = async (fileName, fileType, fileSize, recordCount, company = "jeenweb") => {
    const query = `
        INSERT INTO upload_logs (company, file_name, file_type, file_size, record_count, status)
        VALUES (?, ?, ?, ?, ?, 'Ready')
    `;
    const [result] = await db.execute(query, [cleanCompany(company), fileName, fileType, fileSize, recordCount]);
    return result;
};

// Get all upload logs / history
const getUploadLogs = async (company) => {
    let query = `SELECT * FROM upload_logs ORDER BY uploaded_at DESC`;
    const params = [];
    if (company && company !== "all") {
        query = `SELECT * FROM upload_logs WHERE company = ? ORDER BY uploaded_at DESC`;
        params.push(cleanCompany(company));
    }
    const [rows] = await db.execute(query, params);
    return rows;
};

// Get account activities by company
const getAccountActivities = async (company) => {
    if (!company || company === "all") {
        const [j] = await db.execute(`SELECT *, 'JeenWeb' as company FROM jeenweb_account_activities`);
        const [s] = await db.execute(`SELECT *, 'SatvaWeb' as company FROM satvaweb_account_activities`);
        const [l] = await db.execute(`SELECT *, 'JeenWeb' as company FROM account_activities`);
        const combined = [...j, ...s, ...l];
        // unique by id/order
        const unique = [];
        const seen = new Set();
        for (const row of combined) {
            const key = `${row.order_number}_${row.customer_id}_${row.transaction_date}_${row.company}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(row);
            }
        }
        return unique;
    }
    const comp = cleanCompany(company);
    const [rows] = await db.execute(`SELECT *, ? as company FROM ${comp}_account_activities ORDER BY uploaded_at DESC`, [comp === 'satvaweb' ? 'SatvaWeb' : 'JeenWeb']);
    return rows;
};

// Get master accounts by company
const getMasterAccounts = async (company) => {
    if (!company || company === "all") {
        const [j] = await db.execute(`SELECT *, 'JeenWeb' as company FROM jeenweb_master_accounts`);
        const [s] = await db.execute(`SELECT *, 'SatvaWeb' as company FROM satvaweb_master_accounts`);
        const [l] = await db.execute(`SELECT *, 'JeenWeb' as company FROM master_accounts`);
        const combined = [...j, ...s, ...l];
        const unique = [];
        const seen = new Set();
        for (const row of combined) {
            const key = `${row.domain_name}_${row.customer_id}_${row.company}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(row);
            }
        }
        return unique;
    }
    const comp = cleanCompany(company);
    const [rows] = await db.execute(`SELECT *, ? as company FROM ${comp}_master_accounts ORDER BY uploaded_at DESC`, [comp === 'satvaweb' ? 'SatvaWeb' : 'JeenWeb']);
    return rows;
};

// Joined Transaction query linking company tables
const getJoinedTransactions = async (companyFilter = "all") => {
    const compFilter = String(companyFilter).toLowerCase();
    
    let queryJeenWeb = `
        SELECT 
            a.id,
            'JeenWeb' AS seller_company,
            a.transaction_date,
            a.description,
            a.order_number,
            a.domain_name,
            a.customer_id,
            a.commitment_type,
            COALESCE(a.seats, m.total_seats, 1) AS seats,
            COALESCE(a.sku_plan, m.sku_plan, 'Google Workspace Business Starter') AS sku_plan,
            a.amount,
            COALESCE(m.product, 'Google Workspace') AS product,
            COALESCE(m.status, 'Active') AS status,
            a.uploaded_at
        FROM jeenweb_account_activities a
        LEFT JOIN jeenweb_master_accounts m 
            ON (a.customer_id = m.customer_id OR a.domain_name = m.domain_name)
    `;

    let querySatvaWeb = `
        SELECT 
            a.id,
            'SatvaWeb' AS seller_company,
            a.transaction_date,
            a.description,
            a.order_number,
            a.domain_name,
            a.customer_id,
            a.commitment_type,
            COALESCE(a.seats, m.total_seats, 1) AS seats,
            COALESCE(a.sku_plan, m.sku_plan, 'Google Workspace Business Starter') AS sku_plan,
            a.amount,
            COALESCE(m.product, 'Google Workspace') AS product,
            COALESCE(m.status, 'Active') AS status,
            a.uploaded_at
        FROM satvaweb_account_activities a
        LEFT JOIN satvaweb_master_accounts m 
            ON (a.customer_id = m.customer_id OR a.domain_name = m.domain_name)
    `;

    let queryLegacy = `
        SELECT 
            a.id,
            'JeenWeb' AS seller_company,
            a.transaction_date,
            a.description,
            a.order_number,
            a.domain_name,
            a.customer_id,
            a.commitment_type,
            COALESCE(a.seats, m.total_seats, 1) AS seats,
            COALESCE(a.sku_plan, m.sku_plan, 'Google Workspace Business Starter') AS sku_plan,
            a.amount,
            COALESCE(m.product, 'Google Workspace') AS product,
            COALESCE(m.status, 'Active') AS status,
            a.uploaded_at
        FROM account_activities a
        LEFT JOIN master_accounts m 
            ON (a.customer_id = m.customer_id OR a.domain_name = m.domain_name)
    `;

    let rows = [];
    if (compFilter === "satvaweb" || compFilter === "satva") {
        const [s] = await db.execute(`${querySatvaWeb} ORDER BY a.uploaded_at DESC`);
        rows = s;
    } else if (compFilter === "jeenweb" || compFilter === "jeen") {
        const [j] = await db.execute(`${queryJeenWeb} ORDER BY a.uploaded_at DESC`);
        const [l] = await db.execute(`${queryLegacy} ORDER BY a.uploaded_at DESC`);
        rows = [...j, ...l];
    } else {
        const [j] = await db.execute(`${queryJeenWeb}`);
        const [s] = await db.execute(`${querySatvaWeb}`);
        const [l] = await db.execute(`${queryLegacy}`);
        rows = [...j, ...s, ...l];
    }

    // Deduplicate joined results
    const unique = [];
    const seen = new Set();
    for (const r of rows) {
        const key = `${r.seller_company}_${r.order_number}_${r.customer_id}_${r.transaction_date}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(r);
        }
    }
    unique.sort((a, b) => new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0));
    return unique;
};

// Delete record from upload_logs
const deleteUploadLog = async (id) => {
    const query = `DELETE FROM upload_logs WHERE id = ?`;
    const [result] = await db.execute(query, [id]);
    return result;
};

// Truncate company SQL tables
const truncateCompanyAccountActivities = async (company = "jeenweb") => {
    const comp = cleanCompany(company);
    await db.execute(`TRUNCATE TABLE ${comp}_account_activities`);
    if (comp === "jeenweb") {
        try { await db.execute(`TRUNCATE TABLE account_activities`); } catch (e) {}
    }
    await db.execute(`DELETE FROM upload_logs WHERE company = ? AND file_type = 'Account Activities'`, [comp]);
};

const truncateCompanyMasterAccounts = async (company = "jeenweb") => {
    const comp = cleanCompany(company);
    await db.execute(`TRUNCATE TABLE ${comp}_master_accounts`);
    if (comp === "jeenweb") {
        try { await db.execute(`TRUNCATE TABLE master_accounts`); } catch (e) {}
    }
    await db.execute(`DELETE FROM upload_logs WHERE company = ? AND file_type = 'Master Account'`, [comp]);
};

const truncateAllUploads = async (company) => {
    if (!company || company === "all") {
        await db.execute(`TRUNCATE TABLE jeenweb_account_activities`);
        await db.execute(`TRUNCATE TABLE jeenweb_master_accounts`);
        await db.execute(`TRUNCATE TABLE satvaweb_account_activities`);
        await db.execute(`TRUNCATE TABLE satvaweb_master_accounts`);
        try { await db.execute(`TRUNCATE TABLE account_activities`); } catch (e) {}
        try { await db.execute(`TRUNCATE TABLE master_accounts`); } catch (e) {}
        await db.execute(`TRUNCATE TABLE upload_logs`);
    } else {
        const comp = cleanCompany(company);
        await db.execute(`TRUNCATE TABLE ${comp}_account_activities`);
        await db.execute(`TRUNCATE TABLE ${comp}_master_accounts`);
        if (comp === "jeenweb") {
            try { await db.execute(`TRUNCATE TABLE account_activities`); } catch (e) {}
            try { await db.execute(`TRUNCATE TABLE master_accounts`); } catch (e) {}
        }
        await db.execute(`DELETE FROM upload_logs WHERE company = ?`, [comp]);
    }
};

module.exports = {
    initUploadTables,
    insertAccountActivity,
    insertMasterAccount,
    removeExistingDuplicates,
    logUpload,
    getUploadLogs,
    getAccountActivities,
    getMasterAccounts,
    getJoinedTransactions,
    deleteUploadLog,
    truncateCompanyAccountActivities,
    truncateCompanyMasterAccounts,
    truncateAllUploads
};
