const db = require("../config/db.js");

// Fetch Customer Accounts Registry with Lifetime Billing, Seats, Client Mapping
const getAccountsRegistry = async () => {
    // 1. Fetch domain mappings to map domains to client names
    const [mappings] = await db.execute(`
        SELECT dm.domain_name, dm.customer_id, dm.client_id, dm.subclient_id,
               c.client_name, sc.subclient_name
        FROM domain_mappings dm
        LEFT JOIN clients c ON dm.client_id = c.id
        LEFT JOIN subclients sc ON dm.subclient_id = sc.id
    `);

    const mappingMap = new Map();
    mappings.forEach(m => {
        if (m.domain_name) {
            mappingMap.set(m.domain_name.toLowerCase().trim(), {
                client_id: m.client_id,
                client_name: m.client_name || null,
                subclient_name: m.subclient_name || null
            });
        }
    });

    // 2. Fetch Master Accounts (Prioritize company tables)
    let masterRows = [];
    try {
        const [jM] = await db.execute(`SELECT * FROM jeenweb_master_accounts`);
        const [sM] = await db.execute(`SELECT * FROM satvaweb_master_accounts`);
        masterRows = [...jM, ...sM];
        if (masterRows.length === 0) {
            const [lM] = await db.execute(`SELECT * FROM master_accounts`);
            masterRows = lM;
        }
    } catch (e) {}

    // 3. Fetch Account Activities (Prioritize company tables)
    let actRows = [];
    try {
        const [jA] = await db.execute(`SELECT * FROM jeenweb_account_activities`);
        const [sA] = await db.execute(`SELECT * FROM satvaweb_account_activities`);
        actRows = [...jA, ...sA];
        if (actRows.length === 0) {
            const [lA] = await db.execute(`SELECT * FROM account_activities`);
            actRows = lA;
        }
    } catch (e) {}

    // Aggregate data by unique domain_name
    const registryMap = new Map();

    // Process Master Accounts first
    masterRows.forEach(m => {
        if (!m.domain_name || m.domain_name === 'N/A') return;
        const dKey = String(m.domain_name).trim().toLowerCase();
        const dName = String(m.domain_name).trim();

        if (!registryMap.has(dKey)) {
            const mapped = mappingMap.get(dKey);
            registryMap.set(dKey, {
                domain_name: dName,
                client_name: mapped ? (mapped.subclient_name ? `${mapped.client_name} (${mapped.subclient_name})` : mapped.client_name) : "Unassigned",
                customer_id: m.customer_id && m.customer_id !== 'N/A' ? String(m.customer_id).trim() : 'N/A',
                sku_plan: m.product || m.sku_plan || 'Google Workspace Business Starter',
                payment_plan: m.payment_plan && m.payment_plan !== 'N/A' ? m.payment_plan : 'N/A',
                assigned_seats: parseInt(m.assigned_seats) || 0,
                total_seats: parseInt(m.total_seats) || 0,
                created_date: m.start_date && m.start_date !== 'N/A' ? m.start_date : 'N/A',
                end_date: m.end_date || 'N/A',
                status: (m.status || 'ACTIVE').toUpperCase(),
                lifetime_billing: 0,
                activities_count: 0
            });
        }
    });

    // Process Account Activities to calculate Lifetime Billing & fill gaps
    actRows.forEach(a => {
        if (!a.domain_name || a.domain_name === 'N/A') return;
        const dKey = String(a.domain_name).trim().toLowerCase();
        const dName = String(a.domain_name).trim();
        const amt = parseFloat(a.amount) || 0;

        if (!registryMap.has(dKey)) {
            const mapped = mappingMap.get(dKey);
            registryMap.set(dKey, {
                domain_name: dName,
                client_name: mapped ? (mapped.subclient_name ? `${mapped.client_name} (${mapped.subclient_name})` : mapped.client_name) : "Unassigned",
                customer_id: a.customer_id && a.customer_id !== 'N/A' ? String(a.customer_id).trim() : 'N/A',
                sku_plan: a.sku_plan || 'Google Workspace Business Starter',
                payment_plan: 'N/A',
                assigned_seats: parseInt(a.seats) || 0,
                total_seats: parseInt(a.seats) || 0,
                created_date: a.transaction_date || 'N/A',
                end_date: 'N/A',
                status: 'ACTIVE',
                lifetime_billing: amt,
                activities_count: 1
            });
        } else {
            const entry = registryMap.get(dKey);
            entry.lifetime_billing += amt;
            entry.activities_count += 1;
            if (entry.customer_id === 'N/A' && a.customer_id && a.customer_id !== 'N/A') {
                entry.customer_id = String(a.customer_id).trim();
            }
            if (!entry.assigned_seats && a.seats) {
                entry.assigned_seats = parseInt(a.seats) || 0;
            }
        }
    });

    const result = Array.from(registryMap.values());
    result.sort((a, b) => b.lifetime_billing - a.lifetime_billing);

    return result;
};

// Fetch single-domain deep analytics & 12-Month Payment Schedule Timeline
const getAccountDetail = async (domainName) => {
    const cleanDomain = String(domainName).trim().toLowerCase();

    // 1. Fetch domain mapping
    const [mappings] = await db.execute(`
        SELECT dm.domain_name, dm.customer_id, dm.client_id, dm.subclient_id,
               c.client_name, sc.subclient_name
        FROM domain_mappings dm
        LEFT JOIN clients c ON dm.client_id = c.id
        LEFT JOIN subclients sc ON dm.subclient_id = sc.id
        WHERE LOWER(TRIM(dm.domain_name)) = ?
    `, [cleanDomain]);

    const mapped = mappings[0] || null;

    // 2. Fetch Master Profile
    let masterProfile = null;
    try {
        const [jM] = await db.execute(`SELECT * FROM jeenweb_master_accounts WHERE LOWER(TRIM(domain_name)) = ?`, [cleanDomain]);
        const [sM] = await db.execute(`SELECT * FROM satvaweb_master_accounts WHERE LOWER(TRIM(domain_name)) = ?`, [cleanDomain]);
        masterProfile = jM[0] || sM[0] || null;

        if (!masterProfile) {
            const [lM] = await db.execute(`SELECT * FROM master_accounts WHERE LOWER(TRIM(domain_name)) = ?`, [cleanDomain]);
            masterProfile = lM[0] || null;
        }
    } catch (e) {}

    // 3. Fetch Activity Events
    let actEvents = [];
    try {
        const [jA] = await db.execute(`SELECT * FROM jeenweb_account_activities WHERE LOWER(TRIM(domain_name)) = ? ORDER BY id ASC`, [cleanDomain]);
        const [sA] = await db.execute(`SELECT * FROM satvaweb_account_activities WHERE LOWER(TRIM(domain_name)) = ? ORDER BY id ASC`, [cleanDomain]);
        actEvents = [...jA, ...sA];

        if (actEvents.length === 0) {
            const [lA] = await db.execute(`SELECT * FROM account_activities WHERE LOWER(TRIM(domain_name)) = ? ORDER BY id ASC`, [cleanDomain]);
            actEvents = lA;
        }
    } catch (e) {}

    // Calculate aggregated metrics
    const totalBilling = actEvents.reduce((sum, ev) => sum + (parseFloat(ev.amount) || 0), 0);
    const activeSeats = masterProfile?.assigned_seats || masterProfile?.total_seats || (actEvents.length > 0 ? actEvents[actEvents.length - 1].seats : 0) || 0;
    const customerId = masterProfile?.customer_id || (actEvents.length > 0 ? actEvents[0].customer_id : "N/A");
    const latestProduct = masterProfile?.product || masterProfile?.sku_plan || (actEvents.length > 0 ? actEvents[0].sku_plan : "Google Workspace Business Starter");
    const status = (masterProfile?.status || "ACTIVE").toUpperCase();

    const firstActivityDate = actEvents.length > 0 ? actEvents[0].transaction_date : (masterProfile?.start_date || "N/A");
    const lastActivityDate = actEvents.length > 0 ? actEvents[actEvents.length - 1].transaction_date : (masterProfile?.start_date || "N/A");

    // Format Payment Schedule Timeline
    const timeline = actEvents.map(ev => ({
        id: ev.id,
        month: ev.transaction_date ? String(ev.transaction_date).substring(0, 7) : 'Aug 2026',
        date: ev.transaction_date || 'N/A',
        activity: ev.commitment_type || (ev.description ? ev.description.split(',')[0] : 'Account Transaction'),
        seats: parseInt(ev.seats) || 0,
        amount: parseFloat(ev.amount) || 0,
        order_number: ev.order_number || 'N/A'
    }));

    return {
        domain_name: domainName,
        customer_id: customerId,
        status,
        lifetime_billing: totalBilling,
        active_seats: activeSeats,
        linked_client: mapped ? (mapped.subclient_name ? `${mapped.client_name} (${mapped.subclient_name})` : mapped.client_name) : "Unassigned",
        linked_client_id: mapped?.client_id || null,
        latest_product: latestProduct,
        first_activity_seen: firstActivityDate,
        last_activity_seen: lastActivityDate,
        total_ingested_events: actEvents.length,
        master_profile: {
            sku: masterProfile?.sku_plan || masterProfile?.product || "N/A",
            payment_plan: masterProfile?.payment_plan || "N/A",
            subscription_status: masterProfile?.status || "N/A",
            assigned_seats: masterProfile?.assigned_seats || 0,
            total_seats: masterProfile?.total_seats || 0,
            start_date: masterProfile?.start_date || "N/A",
            end_date: masterProfile?.end_date || "N/A",
            subscription_id: masterProfile?.subscription_id || "N/A",
            order_number: masterProfile?.order_number || "N/A"
        },
        timeline
    };
};

module.exports = {
    getAccountsRegistry,
    getAccountDetail
};
