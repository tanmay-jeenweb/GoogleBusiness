const { getGooglePayableReport } = require("../models/dashboardModel.js");

const test = async () => {
    const report = await getGooglePayableReport("all", 2026, 7);
    
    const aaress = report.rows.find(r => r.domain_name.includes("aaress"));
    const afton = report.rows.find(r => r.domain_name.includes("aftonlondon.co.uk"));

    console.log("Aaress (has uploaded statement amount):", aaress ? {
        domain: aaress.domain_name,
        monthly_billing: aaress.latest_monthly_billing,
        total: aaress.domain_total
    } : "None");

    console.log("Aftonlondon (no uploaded statement amount):", afton ? {
        domain: afton.domain_name,
        monthly_billing: afton.latest_monthly_billing,
        total: afton.domain_total
    } : "None");

    process.exit(0);
};

test().catch(e => { console.error(e); process.exit(1); });
