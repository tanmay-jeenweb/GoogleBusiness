const {
    getAccountsRegistry,
    getAccountDetail
} = require("../models/accountModel.js");

// Fetch Customer Accounts Registry
const fetchAccounts = async (req, res) => {
    try {
        const accounts = await getAccountsRegistry();
        res.status(200).json({
            success: true,
            count: accounts.length,
            accounts
        });
    } catch (error) {
        console.error("Fetch Accounts Registry Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch accounts registry", error: error.message });
    }
};

// Fetch Single Domain Deep Analytics & Payment Schedule Timeline
const fetchAccountByName = async (req, res) => {
    try {
        const { domain_name } = req.params;
        if (!domain_name) {
            return res.status(400).json({ success: false, message: "Domain name is required" });
        }

        const detail = await getAccountDetail(domain_name);
        res.status(200).json({
            success: true,
            account: detail
        });
    } catch (error) {
        console.error("Fetch Account Detail Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch account detail", error: error.message });
    }
};

module.exports = {
    fetchAccounts,
    fetchAccountByName
};
