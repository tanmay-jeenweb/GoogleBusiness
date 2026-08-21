const db = require("../config/db.js");

const initUploadTables = async () => {
    // 1. Account Activities Table (File 1)
    const createAccountActivitiesTable = `
        CREATE TABLE IF NOT EXISTS account_activities (
            id INT AUTO_INCREMENT PRIMARY KEY,
            transaction_date VARCHAR(100) DEFAULT NULL,
            description TEXT DEFAULT NULL,
            order_number VARCHAR(100) DEFAULT NULL,
            domain_name VARCHAR(255) DEFAULT NULL,
            customer_id VARCHAR(100) DEFAULT NULL,
            amount DECIMAL(12, 2) DEFAULT 0.00,
            file_name VARCHAR(255) DEFAULT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    await db.execute(createAccountActivitiesTable);

    // 2. Master Accounts Table (File 2)
    const createMasterAccountsTable = `
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
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    await db.execute(createMasterAccountsTable);

    // 3. Upload Logs Table
    const createUploadLogsTable = `
        CREATE TABLE IF NOT EXISTS upload_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            file_name VARCHAR(255) NOT NULL,
            file_type VARCHAR(50) NOT NULL,
            file_size VARCHAR(50) DEFAULT '0 B',
            record_count INT DEFAULT 0,
            status VARCHAR(50) DEFAULT 'Ready',
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    await db.execute(createUploadLogsTable);
};

// Insert parsed row into account_activities
const insertAccountActivity = async (data) => {
    const query = `
        INSERT INTO account_activities 
        (transaction_date, description, order_number, domain_name, customer_id, amount, file_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
        data.transaction_date || null,
        data.description || null,
        data.order_number || null,
        data.domain_name || null,
        data.customer_id || null,
        data.amount ? parseFloat(String(data.amount).replace(/,/g, "")) : 0.00,
        data.file_name || null
    ]);
    return result;
};

// Insert parsed row into master_accounts
const insertMasterAccount = async (data) => {
    const query = `
        INSERT INTO master_accounts
        (domain_name, product, sku_plan, start_date, status, payment_plan, end_date, total_seats, assigned_seats, subscription_id, customer_id, order_number, file_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        data.file_name || null
    ]);
    return result;
};

// Log upload metadata
const logUpload = async (fileName, fileType, fileSize, recordCount) => {
    const query = `
        INSERT INTO upload_logs (file_name, file_type, file_size, record_count, status)
        VALUES (?, ?, ?, ?, 'Ready')
    `;
    const [result] = await db.execute(query, [fileName, fileType, fileSize, recordCount]);
    return result;
};

// Get all upload logs / history
const getUploadLogs = async () => {
    const query = `SELECT * FROM upload_logs ORDER BY uploaded_at DESC`;
    const [rows] = await db.execute(query);
    return rows;
};

// Get all account activities
const getAccountActivities = async () => {
    const query = `SELECT * FROM account_activities ORDER BY uploaded_at DESC`;
    const [rows] = await db.execute(query);
    return rows;
};

// Get all master accounts
const getMasterAccounts = async () => {
    const query = `SELECT * FROM master_accounts ORDER BY uploaded_at DESC`;
    const [rows] = await db.execute(query);
    return rows;
};

// Delete record from upload_logs
const deleteUploadLog = async (id) => {
    const query = `DELETE FROM upload_logs WHERE id = ?`;
    const [result] = await db.execute(query, [id]);
    return result;
};

// Truncate / Clear SQL Data
const truncateAccountActivities = async () => {
    await db.execute(`TRUNCATE TABLE account_activities`);
    await db.execute(`DELETE FROM upload_logs WHERE file_type = 'Account Activities'`);
};

const truncateMasterAccounts = async () => {
    await db.execute(`TRUNCATE TABLE master_accounts`);
    await db.execute(`DELETE FROM upload_logs WHERE file_type = 'Master Account'`);
};

const truncateAllUploads = async () => {
    await db.execute(`TRUNCATE TABLE account_activities`);
    await db.execute(`TRUNCATE TABLE master_accounts`);
    await db.execute(`TRUNCATE TABLE upload_logs`);
};

module.exports = {
    initUploadTables,
    insertAccountActivity,
    insertMasterAccount,
    logUpload,
    getUploadLogs,
    getAccountActivities,
    getMasterAccounts,
    deleteUploadLog,
    truncateAccountActivities,
    truncateMasterAccounts,
    truncateAllUploads
};
