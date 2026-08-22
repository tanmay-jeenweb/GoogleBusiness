const db = require("../config/db.js");

async function inspectActivityDates() {
    console.log("=== INSPECTING TRANSACTION DATES & AMOUNTS IN ACCOUNT ACTIVITIES ===");

    const [dates] = await db.execute(`
        SELECT transaction_date, COUNT(*) as cnt, SUM(CAST(amount AS DECIMAL(10,2))) as total_amt
        FROM jeenweb_account_activities
        GROUP BY transaction_date
        ORDER BY cnt DESC
        LIMIT 25
    `);

    console.log("Top 25 transaction_date formats in jeenweb_account_activities:");
    console.log(dates);

    // Let's also check if there are transactions for different months (e.g., July 2026, September 2026, etc.)
    const [sampleRows] = await db.execute(`
        SELECT id, transaction_date, domain_name, customer_id, amount, description
        FROM jeenweb_account_activities
        WHERE amount > 0
        LIMIT 10
    `);

    console.log("\nSample non-zero billing rows:");
    console.log(JSON.stringify(sampleRows, null, 2));

    process.exit(0);
}

inspectActivityDates();
