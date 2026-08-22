const { getUploadLogs, getAccountActivities, getMasterAccounts } = require("../models/uploadModel.js");

async function testNavbarLogs() {
    console.log("=== TESTING NAVBAR UPLOAD TIMESTAMP DATA ===");
    const logs = await getUploadLogs();
    const acts = await getAccountActivities();
    const masters = await getMasterAccounts();

    console.log(`Upload Logs Count: ${logs.length}`);
    console.log(`Account Activities Count: ${acts.length}`);
    console.log(`Master Accounts Count: ${masters.length}`);

    const isP1 = (c) => !c || c === "Panel 1" || c === "panel1" || c === "jeenweb" || c === "JeenWeb";
    const isP2 = (c) => c === "Panel 2" || c === "panel2" || c === "satvaweb" || c === "SatvaWeb";

    const logP1Act = logs.find(l => isP1(l.company) && (l.file_type === "Account Activities" || l.file_type === "ACCOUNT_ACTIVITIES"));
    const actsP1 = acts.filter(a => isP1(a.company));
    const dateP1Act = logP1Act?.uploaded_at || (actsP1.length > 0 ? (actsP1[0].created_at || actsP1[0].uploaded_at) : null);

    const logP1Mas = logs.find(l => isP1(l.company) && (l.file_type === "Master Account" || l.file_type === "MASTER_ACCOUNTS"));
    const masP1 = masters.filter(m => isP1(m.company));
    const dateP1Mas = logP1Mas?.uploaded_at || (masP1.length > 0 ? (masP1[0].created_at || masP1[0].uploaded_at) : null);

    console.log("Panel 1 Account Activity Timestamp:", dateP1Act);
    console.log("Panel 1 Master Account Timestamp:", dateP1Mas);

    process.exit(0);
}

testNavbarLogs();
