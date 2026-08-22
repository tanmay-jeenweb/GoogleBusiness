const db = require("../config/db.js");

const cleanGstDuplicates = async () => {
    console.log("Cleaning duplicate GST rows in account_activities...");

    // Keep only the earliest ID for GST rows per billing_month
    const [rows] = await db.execute(`
        SELECT id, billing_month, amount, company FROM account_activities 
        WHERE customer_id = 'GST-TAX' OR domain_name LIKE '%GST Tax%' OR commitment_type = 'GST / Tax Summary'
        ORDER BY id ASC
    `);

    console.log("Found GST rows:", rows);

    if (rows.length > 1) {
        const keepId = rows[0].id;
        const deleteIds = rows.slice(1).map(r => r.id);
        console.log(`Keeping GST row ID ${keepId}, deleting duplicate IDs:`, deleteIds);
        
        await db.execute(`DELETE FROM account_activities WHERE id IN (${deleteIds.join(',')})`);
        console.log("Duplicate GST rows deleted successfully.");
    } else {
        console.log("No duplicate GST rows found.");
    }

    process.exit(0);
};

cleanGstDuplicates().catch(e => { console.error(e); process.exit(1); });
