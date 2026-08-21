const express = require("express");
const multer = require("multer");
const {
    uploadAccountActivities,
    uploadMasterAccount,
    getHistory,
    deleteRecord
} = require("../controllers/uploadController.js");
const { verifyToken } = require("../middleware/authMiddleware.js");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// All upload routes
router.post("/account-activities", upload.single("file"), uploadAccountActivities);
router.post("/master-account", upload.single("file"), uploadMasterAccount);
router.get("/history", getHistory);
router.delete("/record/:id", deleteRecord);

module.exports = router;
