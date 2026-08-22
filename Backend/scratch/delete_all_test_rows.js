const db = require("../config/db.js");

const deleteAllTestRows = async () => {
    console.log("Cleaning all test rows from database...");

    const [resAct] = await db.execute(`
        DELETE FROM account_activities 
        WHERE domain_name LIKE '%test%' 
           OR domain_name LIKE '%sample%' 
           OR order_number LIKE '%test%' 
           OR order_number LIKE '%ORD-111%' 
           OR order_number LIKE '%ORD-98765%'
           OR order_number LIKE '%ORD12345%'
           OR customer_id LIKE '%CUST-111%'
           OR customer_id LIKE '%CUST-888%'
    `);
    console.log(`✓ Deleted ${resAct.affectedRows} test rows from 'account_activities'.`);

    const [resMas] = await db.execute(`
        DELETE FROM master_accounts 
        WHERE domain LIKE '%test%' 
           OR domain LIKE '%sample%' 
           OR customer_id LIKE '%CUST-111%' 
           OR customer_id LIKE '%CUST-888%'
           OR order_number LIKE '%ORD-111%' 
           OR order_number LIKE '%ORD-98765%'
           OR order_number LIKE '%ORD12345%'
    `);
    console.log(`✓ Deleted ${resMas.affectedRows} test rows from 'master_accounts'.`);

    const [resLog] = await db.execute(`
        DELETE FROM upload_logs 
        WHERE file_name LIKE '%test%' 
           OR file_name LIKE '%sample%'
    `);
    console.log(`✓ Deleted ${resLog.affectedRows} test logs from 'upload_logs'.`);

    const [cntAct] = await db.execute("SELECT COUNT(*) as cnt, SUM(amount) as total_amt FROM account_activities WHERE commitment_type != 'GST / Tax Summary' AND domain_name NOT LIKE '%GST Tax%'");
    console.log(`\nFinal Database State:`);
    console.log(`Pure Domain Activity Rows: ${cntAct[0].cnt}`);
    console.log(`Clean Domain Total: ₹${parseFloat(cntAct[0].total_amt).toFixed(2)}`);

    process.exit(0);
};

deleteAllTestRows().catch(e => {
    console.error("Delete test rows error:", e);
    process.exit(1);
});
