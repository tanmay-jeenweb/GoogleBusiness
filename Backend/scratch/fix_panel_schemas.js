const db = require("../config/db.js");

async function fixSchemas() {
    console.log("=== FIXING PANEL 1 & PANEL 2 ACCOUNT TABLE SCHEMAS ===");

    const tables = ["panel1_accounts", "panel2_accounts"];
    for (const t of tables) {
        try {
            await db.execute(`ALTER TABLE ${t} ADD COLUMN provisioning_id VARCHAR(50) DEFAULT NULL`);
            console.log(`✓ Added provisioning_id to ${t}`);
        } catch (e) {}

        try {
            await db.execute(`ALTER TABLE ${t} ADD COLUMN order_number VARCHAR(100) DEFAULT NULL`);
            console.log(`✓ Added order_number to ${t}`);
        } catch (e) {}
    }

    console.log("=== SCHEMAS FIXED ===");
    process.exit(0);
}

fixSchemas();
