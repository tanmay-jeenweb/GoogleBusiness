const express = require("express");
const {
    getClients,
    addClient,
    removeClient,
    addSubClient,
    removeSubClient,
    fetchUnassignedDomains,
    assignDomain,
    unassignDomain
} = require("../controllers/clientController.js");

const router = express.Router();

// Domain Mapping routes (placed before :id params)
router.get("/unassigned-domains", fetchUnassignedDomains);
router.post("/assign-domain", assignDomain);
router.post("/unassign-domain", unassignDomain);

// Client routes
router.get("/", getClients);
router.post("/", addClient);
router.delete("/:id", removeClient);

// Sub-Client routes
router.post("/:id/subclient", addSubClient);
router.delete("/subclient/:id", removeSubClient);

module.exports = router;
