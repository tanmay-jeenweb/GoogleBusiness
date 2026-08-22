const db = require("../config/db.js");

const normalizeTransactionMonth = (dateStr) => {
    if (!dateStr || dateStr === 'N/A' || dateStr === '-') return "2026-08";
    const str = String(dateStr).trim();
    const monthMap = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };

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

    const lower = str.toLowerCase();
    for (const [mName, mNum] of Object.entries(monthMap)) {
        if (lower.includes(mName)) {
            const yearMatch = str.match(/20\d{2}/);
            const y = yearMatch ? yearMatch[0] : "2026";
            return `${y}-${mNum}`;
        }
    }
    return "2026-08";
};

async function testSumByDomain() {
    const [rows] = await db.execute("SELECT id, transaction_date, domain_name, customer_id, seats, amount, description FROM jeenweb_account_activities");

    console.log(`Processing ${rows.length} rows by domain sum for August 2026...`);

    const domainSumMap = new Map();

    rows.forEach(r => {
        const desc = String(r.description || '').toLowerCase();
        if (desc.includes('starting balance') || desc.includes('ending balance')) return;

        const dName = (r.domain_name && r.domain_name !== 'N/A') ? r.domain_name.trim() : null;
        const cId = (r.customer_id && r.customer_id !== 'N/A') ? r.customer_id.trim() : null;
        const key = dName ? dName.toLowerCase() : (cId ? cId.toLowerCase() : null);

        if (!key) return;

        const amt = parseFloat(r.amount) || 0;
        const seats = parseInt(r.seats) || 1;
        const mKey = normalizeTransactionMonth(r.transaction_date);

        if (!domainSumMap.has(key)) {
            domainSumMap.set(key, {
                domain_name: dName || "N/A",
                customer_id: cId || "N/A",
                total_billing_aug: amt,
                max_seats: seats,
                transaction_count: 1
            });
        } else {
            const existing = domainSumMap.get(key);
            existing.total_billing_aug += amt;
            if (seats > existing.max_seats) existing.max_seats = seats;
            existing.transaction_count++;
            if (cId && existing.customer_id === 'N/A') existing.customer_id = cId;
            if (dName && existing.domain_name === 'N/A') existing.domain_name = dName;
        }
    });

    let grandTotalAug = 0;
    domainSumMap.forEach(v => {
        grandTotalAug += v.total_billing_aug;
    });

    console.log(`Unique Domains in August 2026: ${domainSumMap.size}`);
    console.log(`Total August 2026 Google Billing Payout (SUMmed per domain): ₹${grandTotalAug.toFixed(2)}`);

    const sampleRonak = domainSumMap.get("ronakfarma.com");
    if (sampleRonak) {
        console.log("\n--- RONAKFARMA.COM DOMAIN BILLING ---");
        console.log(JSON.stringify(sampleRonak, null, 2));
    }

    process.exit(0);
}

testSumByDomain();
