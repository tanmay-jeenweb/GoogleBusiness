const db = require("../config/db.js");

const initClientTables = async () => {
    // 1. Clients Table
    const createClientsTable = `
        CREATE TABLE IF NOT EXISTS clients (
            id INT AUTO_INCREMENT PRIMARY KEY,
            client_name VARCHAR(255) NOT NULL,
            client_email VARCHAR(255) DEFAULT NULL,
            client_phone VARCHAR(50) DEFAULT NULL,
            client_gst VARCHAR(50) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    await db.execute(createClientsTable);

    // 2. Sub-Clients Table
    const createSubClientsTable = `
        CREATE TABLE IF NOT EXISTS subclients (
            id INT AUTO_INCREMENT PRIMARY KEY,
            parent_client_id INT NOT NULL,
            subclient_name VARCHAR(255) NOT NULL,
            subclient_email VARCHAR(255) DEFAULT NULL,
            subclient_phone VARCHAR(50) DEFAULT NULL,
            subclient_gst VARCHAR(50) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_client_id) REFERENCES clients(id) ON DELETE CASCADE
        )
    `;
    await db.execute(createSubClientsTable);

    // 3. Domain Mappings Table
    const createDomainMappingsTable = `
        CREATE TABLE IF NOT EXISTS domain_mappings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            domain_name VARCHAR(255) NOT NULL UNIQUE,
            customer_id VARCHAR(100) DEFAULT NULL,
            client_id INT DEFAULT NULL,
            subclient_id INT DEFAULT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
            FOREIGN KEY (subclient_id) REFERENCES subclients(id) ON DELETE SET NULL
        )
    `;
    await db.execute(createDomainMappingsTable);
};

// Create a new Client
const createClient = async ({ client_name, client_email, client_phone, client_gst }) => {
    const query = `
        INSERT INTO clients (client_name, client_email, client_phone, client_gst)
        VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
        client_name.trim(),
        client_email ? client_email.trim() : null,
        client_phone ? client_phone.trim() : null,
        client_gst ? client_gst.trim() : null
    ]);
    return result.insertId;
};

// Fetch all Clients with their Sub-Clients and Assigned Domains nested
const getAllClientsWithSubclients = async () => {
    const [clients] = await db.execute(`SELECT * FROM clients ORDER BY created_at DESC`);
    const [subclients] = await db.execute(`SELECT * FROM subclients ORDER BY created_at ASC`);
    const [mappings] = await db.execute(`SELECT * FROM domain_mappings`);

    const clientMap = clients.map(c => {
        const clientSubclients = subclients.filter(s => s.parent_client_id === c.id).map(s => ({
            ...s,
            domains: mappings.filter(m => m.subclient_id === s.id)
        }));

        return {
            ...c,
            domains: mappings.filter(m => m.client_id === c.id && (!m.subclient_id || m.subclient_id === 0)),
            subclients: clientSubclients
        };
    });

    return clientMap;
};

// Delete a Client
const deleteClient = async (id) => {
    await db.execute(`DELETE FROM domain_mappings WHERE client_id = ?`, [id]);
    await db.execute(`DELETE FROM subclients WHERE parent_client_id = ?`, [id]);
    const [result] = await db.execute(`DELETE FROM clients WHERE id = ?`, [id]);
    return result;
};

// Create a Sub-Client under a Parent Client
const createSubClient = async ({ parent_client_id, subclient_name, subclient_email, subclient_phone, subclient_gst }) => {
    const query = `
        INSERT INTO subclients (parent_client_id, subclient_name, subclient_email, subclient_phone, subclient_gst)
        VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
        parent_client_id,
        subclient_name.trim(),
        subclient_email ? subclient_email.trim() : null,
        subclient_phone ? subclient_phone.trim() : null,
        subclient_gst ? subclient_gst.trim() : null
    ]);
    return result.insertId;
};

// Delete a Sub-Client
const deleteSubClient = async (id) => {
    await db.execute(`DELETE FROM domain_mappings WHERE subclient_id = ?`, [id]);
    const [result] = await db.execute(`DELETE FROM subclients WHERE id = ?`, [id]);
    return result;
};

// Extract distinct uploaded domains across all 4 MySQL company tables that are NOT mapped to any client yet
const getUnassignedDomains = async () => {
    // 1. Get mapped domain names
    const [mappedRows] = await db.execute(`SELECT domain_name FROM domain_mappings WHERE client_id IS NOT NULL`);
    const mappedSet = new Set(mappedRows.map(r => r.domain_name.toLowerCase().trim()));

    // 2. Query master account tables
    let masterRows = [];
    try {
        const [jMaster] = await db.execute(`SELECT domain_name, customer_id, sku_plan, total_seats FROM jeenweb_master_accounts WHERE domain_name IS NOT NULL AND domain_name != 'N/A'`);
        const [sMaster] = await db.execute(`SELECT domain_name, customer_id, sku_plan, total_seats FROM satvaweb_master_accounts WHERE domain_name IS NOT NULL AND domain_name != 'N/A'`);
        const [lMaster] = await db.execute(`SELECT domain_name, customer_id, sku_plan, total_seats FROM master_accounts WHERE domain_name IS NOT NULL AND domain_name != 'N/A'`);
        masterRows = [...jMaster, ...sMaster, ...lMaster];
    } catch (e) {}

    // 3. Query account activities tables
    let actRows = [];
    try {
        const [jAct] = await db.execute(`SELECT domain_name, customer_id, sku_plan, seats FROM jeenweb_account_activities WHERE domain_name IS NOT NULL AND domain_name != 'N/A'`);
        const [sAct] = await db.execute(`SELECT domain_name, customer_id, sku_plan, seats FROM satvaweb_account_activities WHERE domain_name IS NOT NULL AND domain_name != 'N/A'`);
        const [lAct] = await db.execute(`SELECT domain_name, customer_id, sku_plan, seats FROM account_activities WHERE domain_name IS NOT NULL AND domain_name != 'N/A'`);
        actRows = [...jAct, ...sAct, ...lAct];
    } catch (e) {}

    // Combine & aggregate distinct domains
    const domainMap = new Map();

    const processRow = (row) => {
        if (!row.domain_name) return;
        const dName = String(row.domain_name).trim().toLowerCase();
        if (!dName || dName === 'n/a' || dName.length <= 3) return;
        if (mappedSet.has(dName)) return; // Exclude assigned domains!

        if (!domainMap.has(dName)) {
            domainMap.set(dName, {
                domain_name: String(row.domain_name).trim(),
                customer_id: row.customer_id && row.customer_id !== 'N/A' ? String(row.customer_id).trim() : 'N/A',
                sku_plan: row.sku_plan && row.sku_plan !== 'N/A' ? String(row.sku_plan).trim() : 'N/A',
                active_seats: parseInt(row.total_seats || row.seats) || 1
            });
        } else {
            const existing = domainMap.get(dName);
            if (existing.customer_id === 'N/A' && row.customer_id && row.customer_id !== 'N/A') {
                existing.customer_id = String(row.customer_id).trim();
            }
            if (existing.sku_plan === 'N/A' && row.sku_plan && row.sku_plan !== 'N/A') {
                existing.sku_plan = String(row.sku_plan).trim();
            }
            const seats = parseInt(row.total_seats || row.seats) || 1;
            if (seats > existing.active_seats) {
                existing.active_seats = seats;
            }
        }
    };

    masterRows.forEach(processRow);
    actRows.forEach(processRow);

    return Array.from(domainMap.values());
};

// Assign domain(s) to Client & Sub-Client
const assignDomainMapping = async ({ domain_names, client_id, subclient_id, customer_id }) => {
    const domains = Array.isArray(domain_names) ? domain_names : [domain_names];
    const cId = parseInt(client_id);
    const sId = subclient_id ? parseInt(subclient_id) : null;

    for (const d of domains) {
        if (!d) continue;
        const cleanDomain = String(d).trim();
        const query = `
            INSERT INTO domain_mappings (domain_name, customer_id, client_id, subclient_id)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                customer_id = COALESCE(VALUES(customer_id), customer_id),
                client_id = VALUES(client_id),
                subclient_id = VALUES(subclient_id),
                assigned_at = CURRENT_TIMESTAMP
        `;
        await db.execute(query, [cleanDomain, customer_id || null, cId, sId]);
    }
};

// Unassign / Unlink domain from Client
const unassignDomainMapping = async (domain_name) => {
    const cleanDomain = String(domain_name).trim();
    await db.execute(`DELETE FROM domain_mappings WHERE domain_name = ?`, [cleanDomain]);
};

module.exports = {
    initClientTables,
    createClient,
    getAllClientsWithSubclients,
    deleteClient,
    createSubClient,
    deleteSubClient,
    getUnassignedDomains,
    assignDomainMapping,
    unassignDomainMapping
};
