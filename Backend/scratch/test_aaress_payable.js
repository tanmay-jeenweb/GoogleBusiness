const { getGooglePayableReport } = require("../models/dashboardModel.js");

const test = async () => {
    const report = await getGooglePayableReport("all", 2026, 7); // Aug 2026
    const aaress = report.rows.find(r => r.domain_name.includes("aaress"));
    console.log("Aaress payable report row:", JSON.stringify(aaress, null, 2));
    process.exit(0);
};

test().catch(e => { console.error(e); process.exit(1); });
