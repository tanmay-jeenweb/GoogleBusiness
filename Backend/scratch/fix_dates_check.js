const db = require("../config/db.js");

async function checkMasterDates() {
    const [rows] = await db.execute("SELECT id, domain_name, customer_id, start_date, end_date, raw_data FROM jeenweb_master_accounts");
    console.log(`Checking ${rows.length} master rows in jeenweb_master_accounts:`);

    rows.forEach(r => {
        let raw = {};
        if (r.raw_data) {
            try { raw = typeof r.raw_data === 'string' ? JSON.parse(r.raw_data) : r.raw_data; } catch(e) {}
        }

        const startFromRaw = raw["Creation date (PST)"] || raw["Creation Date"] || raw["Start Date"] || r.start_date;
        const endFromRaw = raw["Renewal date (PST)"] || raw["Renewal Date"] || raw["End Date"] || r.end_date;

        console.log(`ID ${r.id}: ${r.domain_name} (${r.customer_id})`);
        console.log(`   Table start_date: "${r.start_date}" | Extracted Start: "${startFromRaw}"`);
        console.log(`   Table end_date: "${r.end_date}" | Extracted Expiry: "${endFromRaw}"`);
        console.log(`   Raw keys:`, Object.keys(raw));
    });

    process.exit(0);
}

checkMasterDates();
