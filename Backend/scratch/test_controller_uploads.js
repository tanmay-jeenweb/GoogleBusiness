const xlsx = require('xlsx');
const { uploadAccountActivities, uploadMasterAccount } = require('../controllers/uploadController.js');

// Create mock Excel file buffer for Account Activities
const wbAct = xlsx.utils.book_new();
const wsActData = [
    { "Transaction Date": "2026-08-20", "Description": "Commitment Increase - 5 seats domain: testcompany.com", "Order Number": "ORD-111", "Domain Name": "testcompany.com", "Customer ID": "CUST-111", "Amount": "1,200.00" }
];
const wsAct = xlsx.utils.json_to_sheet(wsActData);
xlsx.utils.book_append_sheet(wbAct, wsAct, "Activities");
const bufAct = xlsx.write(wbAct, { type: "buffer", bookType: "xlsx" });

// Create mock Excel file buffer for Master Account
const wbMas = xlsx.utils.book_new();
const wsMasData = [
    { "Domain Name": "testcompany.com", "Customer ID": "CUST-111", "Product": "Google Workspace", "SKU Plan": "Google Workspace Business Starter", "Start Date": "2026-01-01", "Status": "Active", "Payment Plan": "Annual Plan", "End Date": "2027-01-01", "Total Seats": 10, "Assigned Seats": 8 }
];
const wsMas = xlsx.utils.json_to_sheet(wsMasData);
xlsx.utils.book_append_sheet(wbMas, wsMas, "Master");
const bufMas = xlsx.write(wbMas, { type: "buffer", bookType: "xlsx" });

const runTest = async () => {
    console.log("Running controller upload tests...");

    // 1. Test Account Activities
    const req1 = {
        file: { originalname: "activities_test.xlsx", size: bufAct.length, buffer: bufAct },
        params: { company: "jeenweb" },
        query: {},
        user: { id: 1, name: "Admin" },
        headers: {}
    };
    const res1 = {
        status: (code) => ({
            json: (data) => console.log('Account Activities Response Code:', code, data)
        })
    };
    await uploadAccountActivities(req1, res1);

    // 2. Test Master Account
    const req2 = {
        file: { originalname: "master_test.xlsx", size: bufMas.length, buffer: bufMas },
        params: { company: "jeenweb" },
        query: {},
        user: { id: 1, name: "Admin" },
        headers: {}
    };
    const res2 = {
        status: (code) => ({
            json: (data) => console.log('Master Account Response Code:', code, data)
        })
    };
    await uploadMasterAccount(req2, res2);

    process.exit(0);
};

runTest().catch(e => {
    console.error('Test controller uploads error:', e);
    process.exit(1);
});
