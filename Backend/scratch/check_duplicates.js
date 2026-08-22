const db = require("../config/db.js");

const checkDuplicates = async () => {
    const [rows] = await db.execute("SELECT * FROM account_activities");

    const map = new Map();
    const duplicates = [];

    rows.forEach(r => {
        // Skip GST Tax line
        if (r.commitment_type === 'GST / Tax Summary' || r.customer_id === 'GST-TAX') return;

        const amt = parseFloat(r.amount) || 0;
        const key = `${r.domain_name}_${r.order_number}_${amt}_${r.transaction_date}_${r.seats}`;
        if (map.has(key)) {
            duplicates.push({ original: map.get(key), dup: r });
        } else {
            map.set(key, r);
        }
    });

    console.log(`Total Domain Activity Rows: ${rows.length - 1}`);
    console.log(`Unique Domain Activity Rows: ${map.size}`);
    console.log(`Duplicate Rows Found: ${duplicates.length}`);

    if (duplicates.length > 0) {
        console.log("\nSample Duplicate Rows (first 10):");
        duplicates.slice(0, 10).forEach((d, i) => {
            console.log(`[${i+1}] Original ID ${d.original.id} vs Duplicate ID ${d.dup.id} -> Domain: ${d.dup.domain_name}, Order: ${d.dup.order_number}, Date: ${d.dup.transaction_date}, Amt: ₹${d.dup.amount}`);
        });
    }

    process.exit(0);
};

checkDuplicates().catch(e => { console.error(e); process.exit(1); });
