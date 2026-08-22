const db = require("../config/db.js");

const cleanTestRows = async () => {
    await db.execute("DELETE FROM account_activities WHERE domain_name IN ('testdomain.com', 'sampletest.com', 'testcompany.com')");
    await db.execute("DELETE FROM master_accounts WHERE domain IN ('testdomain.com', 'sampletest.com', 'testcompany.com')");
    console.log("✓ Test rows removed.");

    const [rows] = await db.execute("SELECT * FROM account_activities");
    let totalSum = 0;
    let pureSum = 0;
    let gstSum = 0;

    rows.forEach(r => {
        const amt = parseFloat(r.amount) || 0;
        totalSum += amt;
        if (r.commitment_type === 'GST / Tax Summary' || r.domain_name?.includes('GST Tax')) {
            gstSum += amt;
        } else {
            pureSum += amt;
        }
    });

    console.log(`Total DB Rows: ${rows.length}`);
    console.log(`Pure Domain Transactions Total: ₹${pureSum.toFixed(2)} (${rows.length - 1} rows)`);
    console.log(`GST Tax Line Item: ₹${gstSum.toFixed(2)} (1 row)`);
    console.log(`Combined Total: ₹${totalSum.toFixed(2)}`);

    process.exit(0);
};

cleanTestRows().catch(e => { console.error(e); process.exit(1); });
