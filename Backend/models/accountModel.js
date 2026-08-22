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

    // 2. Fetch Master Accounts
    let masterRows = [];
    try {
        const [mRows] = await db.execute(`SELECT *, domain AS domain_name FROM master_accounts`);
        masterRows = mRows;
    } catch (e) {}

    // 3. Fetch Account Activities
    let actRows = [];
    try {
        const [aRows] = await db.execute(`SELECT * FROM account_activities`);
        actRows = aRows;
    } catch (e) {}

    // Helper to extract a valid date string from row or raw_data
    const extractDate = (row) => {
        if (!row) return null;
        let raw = {};
        if (row.raw_data) {
            try {
                raw = typeof row.raw_data === 'string' ? JSON.parse(row.raw_data) : row.raw_data;
            } catch (e) {}
        }
        const candidate =
            row.creation_date ||
            row.start_date ||
            row.transaction_date ||
            row.creation_date_pst ||
            row.created_at ||
            row.uploaded_at ||
            raw["Creation date (PST)"] ||
            raw["Creation Date"] ||
            raw["Start Date"] ||
            raw["Transaction Date"];

        if (candidate && candidate !== 'N/A' && candidate !== '-' && candidate !== 'null' && candidate !== 'undefined') {
            return String(candidate).trim();
        }
        return null;
    };

    // Aggregate data by unique domain_name
    const registryMap = new Map();

    // Process Master Accounts first
    masterRows.forEach(m => {
        if (!m.domain_name || m.domain_name === 'N/A') return;
        const dKey = String(m.domain_name).trim().toLowerCase();
        const dName = String(m.domain_name).trim();
        const cDate = extractDate(m);

        if (!registryMap.has(dKey)) {
            const mapped = mappingMap.get(dKey);
            registryMap.set(dKey, {
                domain_name: dName,
                client_name: mapped ? (mapped.subclient_name ? `${mapped.client_name} (${mapped.subclient_name})` : mapped.client_name) : "Unassigned",
                customer_id: m.customer_id && m.customer_id !== 'N/A' ? String(m.customer_id).trim() : 'N/A',
                sku_plan: m.product || m.sku_plan || 'Google Workspace Business Starter',
                payment_plan: m.payment_plan && m.payment_plan !== 'N/A' ? m.payment_plan : 'Annual Plan (Monthly Payment)',
                assigned_seats: parseInt(m.assigned_seats || m.assigned_licenses) || 0,
                total_seats: parseInt(m.total_seats || m.purchased_licenses) || 0,
                created_date: cDate || 'N/A',
                end_date: m.end_date || m.renewal_date || 'N/A',
                status: (m.status || m.subscription_status || 'ACTIVE').toUpperCase(),
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
        const aDate = extractDate(a);

        if (!registryMap.has(dKey)) {
            const mapped = mappingMap.get(dKey);
            registryMap.set(dKey, {
                domain_name: dName,
                client_name: mapped ? (mapped.subclient_name ? `${mapped.client_name} (${mapped.subclient_name})` : mapped.client_name) : "Unassigned",
                customer_id: a.customer_id && a.customer_id !== 'N/A' ? String(a.customer_id).trim() : 'N/A',
                sku_plan: a.sku_plan || 'Google Workspace Business Starter',
                payment_plan: 'Annual Plan (Monthly Payment)',
                assigned_seats: parseInt(a.seats) || 0,
                total_seats: parseInt(a.seats) || 0,
                created_date: aDate || 'N/A',
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
            if ((!entry.created_date || entry.created_date === 'N/A') && aDate) {
                entry.created_date = aDate;
            }
            if (!entry.assigned_seats && a.seats) {
                entry.assigned_seats = parseInt(a.seats) || 0;
                entry.total_seats = parseInt(a.seats) || 0;
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
        const [mRows] = await db.execute(`SELECT *, domain AS domain_name FROM master_accounts WHERE LOWER(TRIM(domain)) = ?`, [cleanDomain]);
        masterProfile = mRows[0] || null;
    } catch (e) {}

    // 3. Fetch Activity Events
    let actEvents = [];
    try {
        const [aRows] = await db.execute(`SELECT * FROM account_activities WHERE LOWER(TRIM(domain_name)) = ? ORDER BY id ASC`, [cleanDomain]);
        actEvents = aRows;
    } catch (e) {}

    // Calculate aggregated metrics
    const totalBilling = actEvents.reduce((sum, ev) => sum + (parseFloat(ev.amount) || 0), 0);
    const activeSeats = masterProfile?.assigned_licenses || masterProfile?.purchased_licenses || masterProfile?.assigned_seats || masterProfile?.total_seats || (actEvents.length > 0 ? actEvents[actEvents.length - 1].seats : 0) || 0;
    const customerId = masterProfile?.customer_id || masterProfile?.cloud_identity_id || (actEvents.length > 0 ? actEvents[0].customer_id : "N/A");
    const latestProduct = masterProfile?.sku || masterProfile?.product || masterProfile?.sku_plan || (actEvents.length > 0 ? actEvents[0].sku_plan : "Google Workspace Business Starter");
    const status = (masterProfile?.subscription_status || masterProfile?.status || "Active").toUpperCase();

    const formatToStandardDate = (val) => {
        if (!val || val === 'N/A' || val === '-' || val === 'null') return "N/A";
        const d = new Date(val);
        if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) {
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        }
        return String(val);
    };

    let rawMaster = {};
    if (masterProfile?.raw_data) {
        try { rawMaster = typeof masterProfile.raw_data === 'string' ? JSON.parse(masterProfile.raw_data) : masterProfile.raw_data; } catch(e) {}
    }

    const skuVal = masterProfile?.sku || masterProfile?.sku_plan || rawMaster.Sku || rawMaster.SKU || masterProfile?.product || (actEvents.length > 0 ? actEvents[0].sku_plan : "Google Workspace Business Starter");
    const paymentPlanVal = masterProfile?.payment_plan || rawMaster["Payment plan"] || "Annual Plan (Monthly Payment)";
    const subStatusVal = masterProfile?.subscription_status || masterProfile?.status || rawMaster["Subscription status"] || "Active";

    const assignedSeatsVal = masterProfile?.assigned_licenses || masterProfile?.assigned_seats || parseInt(rawMaster["Assigned licenses"]) || (actEvents.length > 0 ? actEvents[actEvents.length - 1].seats : 1);
    const totalSeatsVal = masterProfile?.purchased_licenses || masterProfile?.total_seats || parseInt(rawMaster["Purchased licenses"]) || (actEvents.length > 0 ? actEvents[actEvents.length - 1].seats : 1);

    const startDateVal = formatToStandardDate(masterProfile?.creation_date || masterProfile?.start_date || rawMaster["Creation date (PST)"] || rawMaster["Creation Date"]);
    const endDateVal = formatToStandardDate(masterProfile?.renewal_date || masterProfile?.end_date || rawMaster["Renewal date (PST)"] || rawMaster["Renewal Date"]);

    const subIdVal = masterProfile?.cloud_identity_id || masterProfile?.customer_id || masterProfile?.subscription_id || rawMaster["Cloud Identity Id"] || (actEvents.length > 0 ? actEvents[0].customer_id : "N/A");
    const orderNoVal = masterProfile?.provisioning_id || masterProfile?.order_number || rawMaster["Provisioning id"] || (actEvents.length > 0 ? actEvents[0].order_number : "N/A");

    const firstActivityDate = formatToStandardDate(actEvents.length > 0 ? actEvents[0].transaction_date : (masterProfile?.creation_date || "N/A"));
    const lastActivityDate = formatToStandardDate(actEvents.length > 0 ? actEvents[actEvents.length - 1].transaction_date : (masterProfile?.creation_date || "N/A"));

    // Format Payment Schedule Timeline
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const timeline = actEvents.map(ev => {
        let monthLabel = "August 2026";
        if (ev.transaction_date) {
            const d = new Date(ev.transaction_date);
            if (!isNaN(d.getTime())) {
                monthLabel = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
            }
        }
        return {
            id: ev.id,
            month: monthLabel,
            date: formatToStandardDate(ev.transaction_date),
            activity: ev.commitment_type || (ev.description ? ev.description.split(',')[0] : 'Account Transaction'),
            seats: parseInt(ev.seats) || 0,
            amount: parseFloat(ev.amount) || 0,
            order_number: ev.order_number || 'N/A'
        };
    });

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
            sku: skuVal,
            payment_plan: paymentPlanVal,
            subscription_status: subStatusVal,
            assigned_seats: assignedSeatsVal,
            total_seats: totalSeatsVal,
            start_date: startDateVal,
            end_date: endDateVal,
            subscription_id: subIdVal,
            order_number: orderNoVal
        },
        timeline
    };
};

module.exports = {
    getAccountsRegistry,
    getAccountDetail
};
