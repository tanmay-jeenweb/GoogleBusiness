const { 
    getFinancialOverview, 
    getActivityBreakdownData,
    getAnnualFinancialMatrix, 
    getCompareMonthData, 
    getClientPerformanceData,
    getAvailableBillingMonths,
    getGooglePayableReport
} = require("../models/dashboardModel.js");

// Fetch Financial Overview for Dashboard
const fetchFinancialOverview = async (req, res) => {
    try {
        const month = req.query.month || "All Months";
        const overview = await getFinancialOverview(month);
        res.status(200).json({
            success: true,
            overview
        });
    } catch (error) {
        console.error("Fetch Financial Overview Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch financial overview", error: error.message });
    }
};

// Fetch Activity Breakdown Records Categorized into 5 Types
const fetchActivityBreakdown = async (req, res) => {
    try {
        const month = req.query.month || "All Months";
        const activities = await getActivityBreakdownData(month);
        res.status(200).json({
            success: true,
            count: activities.length,
            activities
        });
    } catch (error) {
        console.error("Fetch Activity Breakdown Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch activity breakdown", error: error.message });
    }
};

// Fetch 12-Month Annual Financial Matrix
const fetchAnnualFinancialMatrix = async (req, res) => {
    try {
        const year = req.query.year || 2026;
        const matrix = await getAnnualFinancialMatrix(year);
        res.status(200).json({
            success: true,
            matrix
        });
    } catch (error) {
        console.error("Fetch Annual Financial Matrix Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch annual financial matrix", error: error.message });
    }
};

// Fetch Compare Month Growth Analysis
const fetchCompareMonth = async (req, res) => {
    try {
        const monthA = req.query.monthA || "August 2026";
        const monthB = req.query.monthB || "August 2026";
        const data = await getCompareMonthData(monthA, monthB);
        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Fetch Compare Month Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch compare month data", error: error.message });
    }
};

// Fetch Client Performance Business Report
const fetchClientPerformance = async (req, res) => {
    try {
        const month = req.query.month || "August 2026";
        const data = await getClientPerformanceData(month);
        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Fetch Client Performance Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch client performance data", error: error.message });
    }
};

// Fetch Available Billing Months from MySQL
const fetchAvailableMonths = async (req, res) => {
    try {
        const months = await getAvailableBillingMonths();
        res.status(200).json({
            success: true,
            months
        });
    } catch (error) {
        console.error("Fetch Available Months Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch available billing months", error: error.message });
    }
};

// Fetch Google Payable & Subscription Liability Report
const fetchGooglePayable = async (req, res) => {
    try {
        const company = req.query.company || "all";
        const data = await getGooglePayableReport(company);
        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Fetch Google Payable Report Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch Google payable report", error: error.message });
    }
};

module.exports = {
    fetchFinancialOverview,
    fetchActivityBreakdown,
    fetchAnnualFinancialMatrix,
    fetchCompareMonth,
    fetchClientPerformance,
    fetchAvailableMonths,
    fetchGooglePayable
};
