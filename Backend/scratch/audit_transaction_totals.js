const db = require("../config/db.js");

const auditTotals = async () => {
    const [rows] = await db.execute("SELECT * FROM account_activities ORDER BY id ASC");
    console.log("Total rows in database:", rows.length);

    let totalSum = 0;
    let gstSum = 0;
    let gstCount = 0;
    let testCount = 0;
    let testSum = 0;
    let normalCount = 0;
    let normalSum = 0;

    const duplicates = [];
    const seenMap = new Map();

    rows.forEach(r => {
        const amt = parseFloat(r.amount) || 0;
        totalSum += amt;

        const isGst = (r.domain_name && r.domain_name.toLowerCase().includes("gst")) ||
                      (r.commitment_type && r.commitment_type.toLowerCase().includes("gst")) ||
                      (r.customer_id && r.customer_id.toLowerCase().includes("gst"));

        const isTest = (r.domain_name && (r.domain_name.includes("test") || r.domain_name.includes("sample"))) ||
                       (r.order_number && (r.order_number.includes("test") || r.order_number.includes("ORD12345") || r.order_number.includes("ORD-98765") || r.order_number.includes("ORD-111")));

        if (isGst) {
            gstCount++;
            gstSum += amt;
            console.log(`[GST Row] ID: ${r.id}, Date: ${r.transaction_date}, Month: ${r.billing_month}, Domain: ${r.domain_name}, Amount: ${amt}`);
        } else if (isTest) {
            testCount++;
            testSum += amt;
            console.log(`[Test Row] ID: ${r.id}, Domain: ${r.domain_name}, Amount: ${amt}`);
        } else {
            normalCount++;
            normalSum += amt;
        }

        // Check exact duplicates
        const key = `${r.order_number}_${r.domain_name}_${r.customer_id}_${amt}_${r.transaction_date}`;
        if (seenMap.has(key)) {
            duplicates.push({ original: seenMap.get(key), duplicate: r });
        } else {
            seenMap.set(key, r);
        }
    });

    console.log("\n=================== BREAKDOWN ===================");
    console.log(`Total Database Sum: ₹${totalSum.toFixed(2)} (${rows.length} rows)`);
    console.log(`GST Tax Summary Rows (${gstCount} rows): ₹${gstSum.toFixed(2)}`);
    console.log(`Test / Sample Rows (${testCount} rows): ₹${testSum.toFixed(2)}`);
    console.log(`Pure Domain Transactions (${normalCount} rows): ₹${normalSum.toFixed(2)}`);
    console.log(`Exact Duplicates Found: ${duplicates.length} rows`);

    if (duplicates.length > 0) {
        console.log("\nSample Duplicates (first 5):");
        duplicates.slice(0, 5).forEach((d, i) => {
            console.log(`  [${i+1}] ID ${d.duplicate.id} is duplicate of ID ${d.original.id} (Domain: ${d.duplicate.domain_name}, Order: ${d.duplicate.order_number}, Amount: ${d.duplicate.amount})`);
        });
    }

    process.exit(0);
};

auditTotals().catch(e => { console.error(e); process.exit(1); });
