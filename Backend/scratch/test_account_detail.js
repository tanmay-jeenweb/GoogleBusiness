const { getAccountDetail } = require("../models/accountModel.js");

async function testDetail() {
    console.log("=== TESTING ACCOUNT DETAIL FOR RONAKFARMA.COM & RAYNAPROPERTIES.COM ===");
    const ronak = await getAccountDetail("ronakfarma.com");
    console.log("RonakFarma Account Detail:");
    console.log(JSON.stringify(ronak, null, 2));

    const rayna = await getAccountDetail("raynaproperties.com");
    console.log("\nRaynaProperties Account Detail:");
    console.log(JSON.stringify(rayna, null, 2));

    process.exit(0);
}

testDetail();
