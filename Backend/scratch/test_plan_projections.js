const { getGooglePayableReport } = require("../models/dashboardModel.js");

const test = async () => {
    const report = await getGooglePayableReport("all", 2026, 7);
    
    const flexiSample = report.rows.find(r => (r.payment_plan || '').toLowerCase().includes("flex"));
    const yearlySample = report.rows.find(r => (r.payment_plan || '').toLowerCase().includes("yearly"));
    const monthlySample = report.rows.find(r => (r.payment_plan || '').toLowerCase().includes("monthly") && !r.payment_plan.toLowerCase().includes("yearly"));

    console.log("Flexi Sample:", flexiSample ? {
        domain: flexiSample.domain_name,
        plan: flexiSample.payment_plan,
        end_date: flexiSample.end_date,
        grid_sample: flexiSample.months_grid.slice(0, 5)
    } : "None found");

    console.log("Yearly Sample:", yearlySample ? {
        domain: yearlySample.domain_name,
        plan: yearlySample.payment_plan,
        end_date: yearlySample.end_date,
        grid_sample: yearlySample.months_grid.slice(0, 5)
    } : "None found");

    console.log("Monthly Sample:", monthlySample ? {
        domain: monthlySample.domain_name,
        plan: monthlySample.payment_plan,
        end_date: monthlySample.end_date,
        grid_sample: monthlySample.months_grid.slice(0, 5)
    } : "None found");

    process.exit(0);
};

test().catch(e => { console.error(e); process.exit(1); });
