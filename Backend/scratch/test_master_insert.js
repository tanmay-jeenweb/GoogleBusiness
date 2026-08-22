const { insertMasterAccount } = require("../models/uploadModel.js");

async function testInsert() {
    try {
        console.log("Testing insertMasterAccount...");
        const res = await insertMasterAccount("jeenweb", {
            domain_name: "testdomain123.com",
            customer_id: "C0012345",
            product: "Google Workspace",
            sku_plan: "Google Workspace Business Starter",
            start_date: "August 2, 2024",
            status: "Active",
            payment_plan: "Annual Plan (Monthly Payment)",
            end_date: "August 2, 2027",
            total_seats: "69",
            assigned_seats: "69",
            subscription_id: "SUB123",
            order_number: "7343318904",
            file_name: "test_master.csv",
            raw_data: { Customer: "testdomain123.com" }
        });
        console.log("Test Insert Result:", res);
        process.exit(0);
    } catch (err) {
        console.error("Test Insert ERROR STACK TRACE:");
        console.error(err);
        process.exit(1);
    }
}

testInsert();
