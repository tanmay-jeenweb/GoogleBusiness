const db = require("../config/db.js");
const { insertMasterAccount, insertAccountActivity, removeExistingDuplicates } = require("../models/uploadModel.js");

const test = async () => {
    console.log("=== VERIFYING DUAL PANEL UPLOAD & DEDUPLICATION ===");

    // Clean test domain first
    await db.execute(`DELETE FROM master_accounts WHERE domain = 'dualpaneltest.com'`);
    await db.execute(`DELETE FROM account_activities WHERE domain_name = 'dualpaneltest.com'`);

    // Step 1: Upload from Panel 1
    const resP1 = await insertMasterAccount("Panel 1", {
        domain_name: "dualpaneltest.com",
        customer_id: "C00DUAL999",
        sku_plan: "Google Workspace Business Starter",
        status: "Active",
        payment_plan: "Annual Plan (Monthly Payment)",
        start_date: "2025-01-01",
        end_date: "2026-01-01",
        total_seats: 10,
        assigned_seats: 10
    });
    console.log("Panel 1 Upload Result:", resP1);

    // Step 2: Upload same domain from Panel 2 (SatvaWeb)
    const resP2 = await insertMasterAccount("Panel 2", {
        domain_name: "dualpaneltest.com",
        customer_id: "C00DUAL999",
        sku_plan: "Google Workspace Business Starter",
        status: "Active",
        payment_plan: "Annual Plan (Monthly Payment)",
        start_date: "2025-01-01",
        end_date: "2026-01-01",
        total_seats: 12,
        assigned_seats: 12
    });
    console.log("Panel 2 Upload Result:", resP2);

    // Run duplicate cleanup routine
    await removeExistingDuplicates();

    // Check database state
    const [rows] = await db.execute(`SELECT id, company, domain, customer_id, purchased_licenses FROM master_accounts WHERE domain = 'dualpaneltest.com'`);
    console.log("Final master_accounts rows for dualpaneltest.com:", rows);

    // Clean up test rows
    await db.execute(`DELETE FROM master_accounts WHERE domain = 'dualpaneltest.com'`);
    process.exit(0);
};

test().catch(e => { console.error(e); process.exit(1); });
