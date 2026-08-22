const { getJoinedTransactions } = require('../models/uploadModel.js');

const inspect = async () => {
    const txns = await getJoinedTransactions('all');
    console.log("Total transactions fetched:", txns.length);

    const paymentPlansSet = new Set();
    const skuPlansSet = new Set();

    txns.forEach(t => {
        const pPlan = t.payment_plan || t.paymentPlan || null;
        if (pPlan && pPlan !== 'N/A' && pPlan.trim()) {
            paymentPlansSet.add(pPlan.trim());
        }
        const sku = t.sku_plan || t.sku || t.plan_type || null;
        if (sku && sku !== 'N/A' && sku.trim()) {
            skuPlansSet.add(sku.trim());
        }
    });

    console.log("\nUnique Payment Plans / Terms found in data:");
    console.log(Array.from(paymentPlansSet));

    console.log("\nUnique SKU / Plan Types found in data:");
    console.log(Array.from(skuPlansSet));

    process.exit(0);
};

inspect().catch(e => { console.error(e); process.exit(1); });
