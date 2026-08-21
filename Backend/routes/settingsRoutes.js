const express = require("express");
const { fetchRules, addRule, editRule, removeRule } = require("../controllers/settingsController.js");

const router = express.Router();

router.get("/rules", fetchRules);
router.post("/rules", addRule);
router.put("/rules/:id", editRule);
router.delete("/rules/:id", removeRule);

module.exports = router;
