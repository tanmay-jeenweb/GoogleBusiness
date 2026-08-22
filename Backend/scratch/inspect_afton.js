const db = require("../config/db.js");

const inspect = async () => {
    const [m] = await db.execute(`SELECT * FROM master_accounts WHERE domain LIKE '%aftonlondon%' OR raw_data LIKE '%aftonlondon%'`);
    console.log("Master Accounts for aftonlondon:", JSON.stringify(m, null, 2));

    const [a] = await db.execute(`SELECT * FROM account_activities WHERE domain_name LIKE '%aftonlondon%' OR description LIKE '%aftonlondon%'`);
    console.log("Account Activities for aftonlondon:", JSON.stringify(a, null, 2));

    const { getGooglePayableReport } = require("../models/dashboardModel.js");
    const report = await getGooglePayableReport("all", 2026, 7);
    const aftonReport = report.rows.find(r => r.domain_name.includes("aftonlondon"));
    console.log("Payable Report row for aftonlondon:", JSON.stringify(aftonReport, null, 2));

    process.exit(0);
};

inspect().catch(e => { console.error(e); process.exit(1); });
