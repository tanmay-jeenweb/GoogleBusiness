const {
    getKeywordRules,
    createKeywordRule,
    updateKeywordRule,
    deleteKeywordRule
} = require("../models/settingsModel.js");

// Fetch all Keyword Rules
const fetchRules = async (req, res) => {
    try {
        const rules = await getKeywordRules();
        res.status(200).json({ success: true, rules });
    } catch (error) {
        console.error("Fetch Keyword Rules Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch keyword rules", error: error.message });
    }
};

// Add new Keyword Rule
const addRule = async (req, res) => {
    try {
        const { keyword_match, activity_classification, priority, status } = req.body;
        if (!keyword_match || !activity_classification) {
            return res.status(400).json({ success: false, message: "Keyword Match and Activity Classification are required" });
        }
        const insertId = await createKeywordRule({ keyword_match, activity_classification, priority, status });
        res.status(201).json({ success: true, message: "Keyword rule created successfully", id: insertId });
    } catch (error) {
        console.error("Add Keyword Rule Error:", error);
        res.status(500).json({ success: false, message: "Failed to create keyword rule", error: error.message });
    }
};

// Edit Keyword Rule
const editRule = async (req, res) => {
    try {
        const { id } = req.params;
        const { keyword_match, activity_classification, priority, status } = req.body;
        await updateKeywordRule(id, { keyword_match, activity_classification, priority, status });
        res.status(200).json({ success: true, message: "Keyword rule updated successfully" });
    } catch (error) {
        console.error("Edit Keyword Rule Error:", error);
        res.status(500).json({ success: false, message: "Failed to update keyword rule", error: error.message });
    }
};

// Remove Keyword Rule
const removeRule = async (req, res) => {
    try {
        const { id } = req.params;
        await deleteKeywordRule(id);
        res.status(200).json({ success: true, message: "Keyword rule deleted successfully" });
    } catch (error) {
        console.error("Delete Keyword Rule Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete keyword rule", error: error.message });
    }
};

module.exports = {
    fetchRules,
    addRule,
    editRule,
    removeRule
};
