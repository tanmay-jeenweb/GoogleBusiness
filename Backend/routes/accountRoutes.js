const express = require("express");
const {
    fetchAccounts,
    fetchAccountByName
} = require("../controllers/accountController.js");

const router = express.Router();

router.get("/", fetchAccounts);
router.get("/detail/:domain_name", fetchAccountByName);

module.exports = router;
