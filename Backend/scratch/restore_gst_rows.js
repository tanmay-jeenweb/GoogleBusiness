const db = require("../config/db.js");

async function restoreGstRows() {
    console.log("=== RESTORING AND CATEGORIZING GST TAX SUMMARY ROWS IN ACTIVITIES ===");

    // Re-insert Integrated GST row as a proper 'GST / Tax Summary' activity record
    await db.execute(`
        INSERT INTO panel1_activities 
        (billing_month, transaction_date, description, order_number, domain_name, customer_id, commitment_type, seats, sku_plan, amount, file_name, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        "2026-08",
        "2026-08-15",
        "Integrated GST - Government Tax Summary",
        "GST-7343318904",
        "GST Tax (Integrated GST)",
        "GST-TAX",
        "GST / Tax Summary",
        0,
        "GST Tax",
        92171.12,
        "activity_aug_2026.csv",
        JSON.stringify({ Description: "Integrated GST", Amount: "92,171.12" })
    ]);

    console.log("✓ Inserted GST Tax Summary row (₹92,171.12) into 'panel1_activities'.");

    const [rows] = await db.execute(`
        SELECT * FROM panel1_activities WHERE commitment_type = 'GST / Tax Summary' OR domain_name LIKE '%GST%'
    `);
    console.log("Verified GST Row in Database:");
    console.log(rows);

    process.exit(0);
}

restoreGstRows();
