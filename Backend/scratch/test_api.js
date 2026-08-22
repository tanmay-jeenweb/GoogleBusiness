const { getGooglePayableReport } = require("../models/dashboardModel.js");

async function testApi() {
    try {
        const res = await getGooglePayableReport("all");
        console.log("--- GOOGLE PAYABLE HYBRID API REPORT RESULT ---");
        console.log("Total Contracts / Domains:", res.summary.total_contracts);
        console.log("Total Est. Monthly Payable to Google:", res.summary.total_monthly_payable);

        console.log("\nTop 5 Billed Domains:");
        res.rows.slice(0, 5).forEach((r, idx) => {
            console.log(`#${idx + 1}: ${r.domain_name} (${r.customer_id})`);
            console.log(`   Plan: ${r.sku_plan} | Seats: ${r.total_seats} | Company: ${r.company}`);
            console.log(`   Start: ${r.start_date} | Expiry: ${r.end_date}`);
            console.log(`   Latest Monthly Billing: ₹${r.latest_monthly_billing} | Per Seat: ₹${r.per_seat_cost.toFixed(2)}`);
        });

        const ronak = res.rows.find(r => r.domain_name.toLowerCase().includes("ronakfarma"));
        if (ronak) {
            console.log("\n--- RONAKFARMA.COM ENTRY ---");
            console.log(JSON.stringify(ronak, null, 2));
        }

        process.exit(0);
    } catch (err) {
        console.error("Test API error:", err);
        process.exit(1);
    }
}

testApi();
