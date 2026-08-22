const express = require("express");
const multer = require("multer");
const {
    uploadAccountActivities,
    uploadMasterAccount,
    getHistory,
    getTransactions,
    updateTransactionCategory,
    deleteRecord,
    clearAccountActivitiesData,
    clearMasterAccountData,
    clearAllData
} = require("../controllers/uploadController.js");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Company-aware Upload endpoints
router.post("/account-activities", upload.single("file"), uploadAccountActivities);
router.post("/master-account", upload.single("file"), uploadMasterAccount);
router.post("/:company/account-activities", upload.single("file"), uploadAccountActivities);
router.post("/:company/master-account", upload.single("file"), uploadMasterAccount);

// Query & delete & update endpoints
router.get("/history", getHistory);
router.get("/transactions", getTransactions);
router.patch("/transactions/:id/category", updateTransactionCategory);
router.put("/transactions/:id/category", updateTransactionCategory);
router.delete("/record/:id", deleteRecord);

// Clear SQL tables endpoints
router.delete("/clear/account-activities", clearAccountActivitiesData);
router.delete("/clear/master-account", clearMasterAccountData);
router.delete("/clear/all", clearAllData);
router.delete("/clear/:company/account-activities", clearAccountActivitiesData);
router.delete("/clear/:company/master-account", clearMasterAccountData);
router.delete("/clear/:company/all", clearAllData);

module.exports = router;
