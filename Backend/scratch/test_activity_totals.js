const db = require("../config/db.js");

// Standardize any activity transaction_date string to YYYY-MM
const normalizeTransactionMonth = (dateStr) => {
    if (!dateStr || dateStr === 'N/A' || dateStr === '-') return "2026-08"; // Fallback to August 2026 if blank
    const str = String(dateStr).trim();

    const monthMap = {
        jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
        jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
    };

    // 1. Slash dates like '8/2/26', '08/15/2026', '8/26'
    if (str.includes('/')) {
        const parts = str.split('/').map(p => p.trim());
        if (parts.length === 3) {
            let m = parseInt(parts[0]);
            let y = parseInt(parts[2]);
            if (y < 100) y += 2000;
            return `${y}-${String(m).padStart(2, '0')}`;
        }
        if (parts.length === 2) {
            let m = parseInt(parts[0]);
            let y = parseInt(parts[1]);
            if (y < 100) y += 2000;
            return `${y}-${String(m).padStart(2, '0')}`;
        }
    }

    // 2. Month name strings like 'Aug 1 – 19, 2026', 'Aug 1 – 31, 2026', 'August 2026'
    const lower = str.toLowerCase();
    for (const [mName, mNum] of Object.entries(monthMap)) {
        if (lower.includes(mName)) {
            const yearMatch = str.match(/20\d{2}/);
            const y = yearMatch ? yearMatch[0] : "2026";
            return `${y}-${mNum}`;
        }
    }

    // 3. Fallback standard JS Date
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    return "2026-08";
};

async function testActivityTotals() {
    const [rows] = await db.execute("SELECT id, transaction_date, domain_name, customer_id, seats, amount, description FROM jeenweb_account_activities");

    console.log(`Testing normalization on ${rows.length} activity rows...`);

    const monthCountMap = new Map();
    let totalAmountAll = 0;

    rows.forEach(r => {
        const mKey = normalizeTransactionMonth(r.transaction_date);
        const amt = parseFloat(r.amount) || 0;
        totalAmountAll += amt;

        if (!monthCountMap.has(mKey)) {
            monthCountMap.set(mKey, { count: 0, total_amt: 0 });
        }
        const entry = monthCountMap.get(mKey);
        entry.count++;
        entry.total_amt += amt;
    });

    console.log("\nNormalized Month Groups:");
    for (const [mKey, val] of monthCountMap.entries()) {
        console.log(`Month ${mKey}: ${val.count} rows | Total Amount: ₹${val.total_amt.toFixed(2)}`);
    }
    console.log(`Overall Raw Total Amount across all activity rows: ₹${totalAmountAll.toFixed(2)}`);

    process.exit(0);
}

testActivityTotals();
