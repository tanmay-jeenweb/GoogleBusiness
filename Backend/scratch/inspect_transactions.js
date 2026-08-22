const { getJoinedTransactions } = require("../models/uploadModel.js");

async function inspectTxns() {
    console.log("=== INSPECTING JOINED TRANSACTIONS FROM DATABASE ===");
    const txns = await getJoinedTransactions("all");
    console.log(`Total Joined Transactions: ${txns.length}`);
    if (txns.length > 0) {
        console.log("Sample Transaction #1:");
        console.log(txns[0]);
        console.log("\nSample Transaction #2:");
        console.log(txns[1]);
    }
    process.exit(0);
}

inspectTxns();
