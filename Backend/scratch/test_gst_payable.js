const { getGooglePayableReport } = require("../models/dashboardModel.js");

const test = async () => {
    const report = await getGooglePayableReport("all", 2026, 7);
    const gstRow = report.rows.find(r => r.domain_name.includes("GST") || r.customer_id.includes("GST"));
    console.log("GST Row in Google Payable Report:", JSON.stringify(gstRow, null, 2));
    console.log("Current Month Monthly Payable Total:", report.summary.total_monthly_payable);
    console.log("12-Month Grand Total:", report.summary.grand_total_12mo);
    process.exit(0);
};

test().catch(e => { console.error(e); process.exit(1); });
