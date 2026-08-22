const { getFinancialOverview } = require("../models/dashboardModel.js");

const test = async () => {
    const data = await getFinancialOverview("August 2026");
    console.log("Financial Overview for August 2026:");
    console.log("Total Billing: ₹", data.growth_metrics.total_billing.toFixed(2));
    console.log("Unique Customers:", data.growth_metrics.unique_customer_accounts);
    console.log("Committed Seats:", data.growth_metrics.committed_seats_active);
    process.exit(0);
};

test().catch(e => { console.error(e); process.exit(1); });
