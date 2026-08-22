const db = require("../config/db.js");

async function cleanSummaryRows() {
    console.log("=== CHECKING STATEMENT SUMMARY / BALANCE ROWS IN ACTIVITIES TABLES ===");

    const [naRows] = await db.execute(`
        SELECT * FROM panel1_activities 
        WHERE (domain_name = 'N/A' OR domain_name IS NULL OR domain_name = '')
           OR LOWER(description) LIKE '%starting balance%'
           OR LOWER(description) LIKE '%ending balance%'
           OR LOWER(description) LIKE '%subtotal%'
           OR LOWER(description) LIKE '%total charges%'
    `);

    console.log(`Found ${naRows.length} summary/balance rows in 'panel1_activities':`);
    naRows.forEach(r => {
        console.log(`ID: ${r.id} | Amount: ₹${r.amount} | Desc: ${r.description.slice(0, 100)}`);
    });

    if (naRows.length > 0) {
        await db.execute(`
            DELETE FROM panel1_activities 
            WHERE (domain_name = 'N/A' OR domain_name IS NULL OR domain_name = '')
               OR LOWER(description) LIKE '%starting balance%'
               OR LOWER(description) LIKE '%ending balance%'
               OR LOWER(description) LIKE '%subtotal%'
               OR LOWER(description) LIKE '%total charges%'
        `);
        console.log(`✓ Deleted ${naRows.length} non-transaction summary/balance rows from 'panel1_activities'.`);
    }

    const [cnt] = await db.execute("SELECT COUNT(*) as cnt, SUM(amount) as total_amt FROM panel1_activities");
    console.log(`✓ Cleaned 'panel1_activities': ${cnt[0].cnt} transactions, Total Amount: ₹${parseFloat(cnt[0].total_amt).toFixed(2)}`);

    process.exit(0);
}

cleanSummaryRows();
