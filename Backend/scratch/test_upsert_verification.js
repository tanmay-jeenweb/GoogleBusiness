const db = require("../config/db.js");
const { insertMasterAccount, insertAccountActivity, removeExistingDuplicates } = require("../models/uploadModel.js");

const test = async () => {
    console.log("=== VERIFYING UPSERT & MERGE LOGIC ===");

    // Test 1: Uploading a domain for the first time
    const res1 = await insertMasterAccount("Panel 1", {
        domain_name: "testupsertdomain.com",
        customer_id: "C00TEST999",
        sku_plan: "Google Workspace Business Starter",
        status: "Active",
        payment_plan: "Annual Plan (Monthly Payment)",
        start_date: "2025-01-01",
        end_date: "2026-01-01",
        total_seats: 10,
        assigned_seats: 10
    });
    console.log("Initial Insert Result:", res1);

    // Test 2: Uploading the exact same domain again (no changes)
    const res2 = await insertMasterAccount("Panel 1", {
        domain_name: "testupsertdomain.com",
        customer_id: "C00TEST999",
        sku_plan: "Google Workspace Business Starter",
        status: "Active",
        payment_plan: "Annual Plan (Monthly Payment)",
        start_date: "2025-01-01",
        end_date: "2026-01-01",
        total_seats: 10,
        assigned_seats: 10
    });
    console.log("Duplicate Upload Result (Should UPDATE/Skip, NOT create new ID):", res2);

    // Test 3: Uploading the domain with updated seat count (e.g. upgraded to 15 seats)
    const res3 = await insertMasterAccount("Panel 1", {
        domain_name: "testupsertdomain.com",
        customer_id: "C00TEST999",
        sku_plan: "Google Workspace Business Starter",
        status: "Active",
        payment_plan: "Annual Plan (Monthly Payment)",
        start_date: "2025-01-01",
        end_date: "2026-01-01",
        total_seats: 15,
        assigned_seats: 15
    });
    console.log("Updated Seats Upload Result (Should UPDATE existing ID):", res3);

    // Verify row count for testupsertdomain.com in master_accounts
    const [rows] = await db.execute(`SELECT * FROM master_accounts WHERE domain = 'testupsertdomain.com'`);
    console.log(`Database rows for testupsertdomain.com (Count should be 1):`, rows.length);
    console.log(`Updated row data:`, {
        id: rows[0]?.id,
        domain: rows[0]?.domain,
        purchased_licenses: rows[0]?.purchased_licenses
    });

    // Cleanup test domain
    await db.execute(`DELETE FROM master_accounts WHERE domain = 'testupsertdomain.com'`);
    console.log("Cleanup complete.");

    process.exit(0);
};

test().catch(e => { console.error(e); process.exit(1); });
