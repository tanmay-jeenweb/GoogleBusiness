const db = require("../config/db.js");

const cleanDuplicates = async () => {
    // Delete ID 243, ID 1355, ID 1360 or any row with domain 'N/A' and amount >= 90000
    const [res] = await db.execute("DELETE FROM account_activities WHERE (domain_name = 'N/A' OR domain_name IS NULL OR domain_name LIKE '%GST%') AND amount >= 90000");
    console.log(`✓ Deleted ${res.affectedRows} duplicate/statement summary rows from 'account_activities'.`);

    // Insert 1 clean GST Tax Summary row if needed for GST filter
    await db.execute(`
        INSERT INTO account_activities (company, billing_month, transaction_date, description, order_number, domain_name, customer_id, commitment_type, seats, sku_plan, amount, file_name)
        VALUES ('Panel 1', '2026-08', '2026-08-01', 'Integrated GST Tax Summary for Statement', 'GST-STATEMENT-2026-08', 'GST Tax (Integrated GST)', 'GST-TAX', 'GST / Tax Summary', 0, 'GST Tax', 92171.12, 'Statement.pdf')
    `);
    console.log("✓ Added 1 clean GST / Tax Summary row (₹92,171.12).");

    const [all] = await db.execute("SELECT COUNT(*) as cnt FROM account_activities");
    console.log(`Total rows remaining: ${all[0].cnt}`);
    process.exit(0);
};

cleanDuplicates().catch(e => { console.error(e); process.exit(1); });
