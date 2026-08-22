const db = require("../config/db.js");

// Date standardizer & parser helper
const parseDateToObj = (dateStr) => {
    if (!dateStr || dateStr === "-" || dateStr === "N/A" || dateStr === "null") return null;
    const str = String(dateStr).trim();

    // 1. Slashes like '8/2/27', '08/02/2027', '9/8/25'
    if (str.includes('/')) {
        const parts = str.split('/').map(p => p.trim());
        if (parts.length === 3) {
            let m = parseInt(parts[0]);
            let d = parseInt(parts[1]);
            let y = parseInt(parts[2]);
            if (y < 100) y += 2000;
            if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000) {
                return new Date(y, m - 1, d);
            }
        }
    }

    // 2. Standard JS Date parser (handles 'August 2, 2027', '2027-08-02', etc.)
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        return parsed;
    }

    return null;
};

async function testPerfectPayable() {
    const [jM] = await db.execute("SELECT * FROM jeenweb_master_accounts");
    const [sM] = await db.execute("SELECT * FROM satvaweb_master_accounts");
    const [jA] = await db.execute("SELECT * FROM jeenweb_account_activities");
    const [sA] = await db.execute("SELECT * FROM satvaweb_account_activities");

    const masterRows = [...jM, ...sM];
    const actRows = [...jA, ...sA];

    console.log(`Loaded ${masterRows.length} master rows, ${actRows.length} activity rows.`);

    // Test parse dates
    const sampleDate1 = parseDateToObj("August 2, 2027");
    console.log("Parsed 'August 2, 2027':", sampleDate1 ? sampleDate1.toISOString().slice(0, 10) : "Failed");

    const sampleDate2 = parseDateToObj("8/2/27");
    console.log("Parsed '8/2/27':", sampleDate2 ? sampleDate2.toISOString().slice(0, 10) : "Failed");

    const sampleDate3 = parseDateToObj("10/11/26");
    console.log("Parsed '10/11/26':", sampleDate3 ? sampleDate3.toISOString().slice(0, 10) : "Failed");

    process.exit(0);
}

testPerfectPayable();
