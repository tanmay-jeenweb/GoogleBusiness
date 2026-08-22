const { getFinancialOverview } = require("../models/dashboardModel.js");

const test = async () => {
    const data = await getFinancialOverview("All Months");
    console.log("Dashboard Financial Overview Total Billing: ₹", data.growth_metrics.total_billing.toFixed(2));
    console.log("Unique Customer Accounts:", data.growth_metrics.unique_customer_accounts);
    console.log("Committed Seats Active:", data.growth_metrics.committed_seats_active);
    process.exit(0);
};

test().catch(e => { console.error(e); process.exit(1); });
