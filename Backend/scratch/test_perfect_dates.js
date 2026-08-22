const db = require("../config/db.js");

const parseExcelDateFormatted = (val) => {
    if (!val || val === 'N/A' || val === '-' || val === 'null') return "-";
    const str = String(val).trim();
    if (!str || str === 'N/A' || str === '-') return "-";

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    if (str.includes('/')) {
        const parts = str.split('/').map(p => p.trim());
        if (parts.length === 3) {
            let m = parseInt(parts[0]);
            let d = parseInt(parts[1]);
            let y = parseInt(parts[2]);
            if (y < 100) y += 2000;
            if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000) {
                return `${months[m - 1]} ${d}, ${y}`;
            }
        }
    }

    const dObj = new Date(str);
    if (!isNaN(dObj.getTime()) && dObj.getFullYear() >= 2000) {
        return `${months[dObj.getMonth()]} ${dObj.getDate()}, ${dObj.getFullYear()}`;
    }

    return str;
};

async function testPerfectDates() {
    const [jM] = await db.execute("SELECT * FROM jeenweb_master_accounts");
    const [sM] = await db.execute("SELECT * FROM satvaweb_master_accounts");

    const masterRows = [...jM, ...sM];
    const masterMap = new Map();

    masterRows.forEach(m => {
        let raw = {};
        if (m.raw_data) {
            try { raw = typeof m.raw_data === 'string' ? JSON.parse(m.raw_data) : m.raw_data; } catch(e) {}
        }

        const dNameTable = (m.domain_name && m.domain_name !== 'N/A') ? m.domain_name.trim() : null;
        const cIdTable = (m.customer_id && m.customer_id !== 'N/A') ? m.customer_id.trim() : null;
        const dNameRaw = raw.Customer || raw["Customer Name"] || null;
        const cIdRaw = raw["Cloud Identity Id"] || raw["Customer uid"] || null;

        const rawStart = raw["Creation date (PST)"] || raw["Creation Date"] || raw["Start Date"];
        const rawEnd = raw["Renewal date (PST)"] || raw["Renewal Date"] || raw["End Date"];

        const startDate = parseExcelDateFormatted(rawStart || m.start_date);
        const endDate = parseExcelDateFormatted(rawEnd || m.end_date);
        const skuPlan = raw.Sku || raw.SKU || m.sku_plan || "Google Workspace Business Starter";
        const paymentPlan = raw["Payment plan"] || m.payment_plan || "Annual Plan (Monthly Payment)";
        const seats = parseInt(raw["Purchased licenses"] || raw["Assigned licenses"] || m.total_seats) || 1;

        const info = {
            domain_name: dNameRaw || dNameTable || "N/A",
            customer_id: cIdRaw || cIdTable || "N/A",
            start_date: startDate,
            end_date: endDate,
            sku_plan: skuPlan,
            payment_plan: paymentPlan,
            seats: seats
        };

        [dNameTable, cIdTable, dNameRaw, cIdRaw].forEach(k => {
            if (k && k !== 'N/A' && k !== '-') {
                masterMap.set(k.toLowerCase().trim(), info);
            }
        });
    });

    console.log("Master Map Keys Count:", masterMap.size);
    console.log("Master Map Entries:");
    for (const [k, v] of masterMap.entries()) {
        console.log(`Key: "${k}" => Domain: ${v.domain_name} | Start: "${v.start_date}" | Expiry: "${v.end_date}"`);
    }

    process.exit(0);
}

testPerfectDates();
