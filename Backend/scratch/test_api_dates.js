const { getGooglePayableReport } = require("../models/dashboardModel.js");

async function testApiWithDates() {
    try {
        const res = await getGooglePayableReport("all");
        const rowsWithDates = res.rows.filter(r => r.start_date !== "-" || r.end_date !== "-");
        console.log(`Found ${rowsWithDates.length} rows with populated Start/Expiry dates:`);
        console.log(JSON.stringify(rowsWithDates, null, 2));

        process.exit(0);
    } catch (err) {
        console.error("Test API error:", err);
        process.exit(1);
    }
}

testApiWithDates();
