const express = require("express");
const { 
    fetchFinancialOverview, 
    fetchActivityBreakdown,
    fetchAnnualFinancialMatrix, 
    fetchCompareMonth, 
    fetchClientPerformance,
    fetchAvailableMonths,
    fetchGooglePayable
} = require("../controllers/dashboardController.js");

const router = express.Router();

router.get("/financial-overview", fetchFinancialOverview);
router.get("/activity-breakdown", fetchActivityBreakdown);
router.get("/annual-matrix", fetchAnnualFinancialMatrix);
router.get("/compare-month", fetchCompareMonth);
router.get("/client-performance", fetchClientPerformance);
router.get("/available-months", fetchAvailableMonths);
router.get("/google-payable", fetchGooglePayable);

module.exports = router;
