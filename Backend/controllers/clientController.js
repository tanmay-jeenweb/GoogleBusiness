const {
    createClient,
    getAllClientsWithSubclients,
    deleteClient,
    createSubClient,
    deleteSubClient,
    getUnassignedDomains,
    assignDomainMapping,
    unassignDomainMapping
} = require("../models/clientModel.js");
const { createAuditLog } = require("../models/auditLogModel.js");

// Get all Clients with Sub-Clients
const getClients = async (req, res) => {
    try {
        const clients = await getAllClientsWithSubclients();
        res.status(200).json({ success: true, count: clients.length, clients });
    } catch (error) {
        console.error("Get Clients Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch clients", error: error.message });
    }
};

// Create a new Client
const addClient = async (req, res) => {
    try {
        const { client_name, client_email, client_phone, client_gst } = req.body;
        if (!client_name || !client_name.trim()) {
            return res.status(400).json({ success: false, message: "Client Name is required" });
        }

        const clientId = await createClient({ client_name, client_email, client_phone, client_gst });
        
        try {
            await createAuditLog(
                req.user?.id || null,
                req.user?.username || req.user?.email || "Admin User",
                req.headers['x-device-id'] || "Web Client",
                "Client Master",
                "created",
                null,
                { client_id: clientId, client_name, client_email, client_phone, client_gst }
            );
        } catch (e) {}

        res.status(201).json({
            success: true,
            message: `Client "${client_name}" created successfully`,
            clientId
        });
    } catch (error) {
        console.error("Add Client Error:", error);
        res.status(500).json({ success: false, message: "Failed to create client", error: error.message });
    }
};

// Delete a Client
const removeClient = async (req, res) => {
    try {
        const { id } = req.params;
        await deleteClient(id);

        try {
            await createAuditLog(
                req.user?.id || null,
                req.user?.username || req.user?.email || "Admin User",
                req.headers['x-device-id'] || "Web Client",
                "Client Master",
                "deleted",
                { client_id: id },
                null
            );
        } catch (e) {}

        res.status(200).json({ success: true, message: "Client deleted successfully" });
    } catch (error) {
        console.error("Remove Client Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete client", error: error.message });
    }
};

// Add Sub-Client to a Client
const addSubClient = async (req, res) => {
    try {
        const { id } = req.params; // parent_client_id
        const { subclient_name, subclient_email, subclient_phone, subclient_gst } = req.body;

        if (!subclient_name || !subclient_name.trim()) {
            return res.status(400).json({ success: false, message: "Sub-Client Name is required" });
        }

        const subclientId = await createSubClient({
            parent_client_id: id,
            subclient_name,
            subclient_email,
            subclient_phone,
            subclient_gst
        });

        try {
            await createAuditLog(
                req.user?.id || null,
                req.user?.username || req.user?.email || "Admin User",
                req.headers['x-device-id'] || "Web Client",
                "Sub-Client Master",
                "created",
                null,
                { parent_client_id: id, subclient_id: subclientId, subclient_name }
            );
        } catch (e) {}

        res.status(201).json({
            success: true,
            message: `Sub-Client "${subclient_name}" added successfully`,
            subclientId
        });
    } catch (error) {
        console.error("Add Sub-Client Error:", error);
        res.status(500).json({ success: false, message: "Failed to add sub-client", error: error.message });
    }
};

// Delete a Sub-Client
const removeSubClient = async (req, res) => {
    try {
        const { id } = req.params;
        await deleteSubClient(id);

        try {
            await createAuditLog(
                req.user?.id || null,
                req.user?.username || req.user?.email || "Admin User",
                req.headers['x-device-id'] || "Web Client",
                "Sub-Client Master",
                "deleted",
                { subclient_id: id },
                null
            );
        } catch (e) {}

        res.status(200).json({ success: true, message: "Sub-client deleted successfully" });
    } catch (error) {
        console.error("Remove Sub-Client Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete sub-client", error: error.message });
    }
};

// Fetch unassigned domains uploaded in MySQL
const fetchUnassignedDomains = async (req, res) => {
    try {
        const domains = await getUnassignedDomains();
        res.status(200).json({
            success: true,
            count: domains.length,
            domains
        });
    } catch (error) {
        console.error("Fetch Unassigned Domains Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch unassigned domains", error: error.message });
    }
};

// Assign domain(s) to Client & Sub-Client
const assignDomain = async (req, res) => {
    try {
        const { domain_names, client_id, subclient_id, customer_id } = req.body;
        if (!domain_names || !client_id) {
            return res.status(400).json({ success: false, message: "domain_names and client_id are required" });
        }

        await assignDomainMapping({ domain_names, client_id, subclient_id, customer_id });
        const count = Array.isArray(domain_names) ? domain_names.length : 1;

        try {
            await createAuditLog(
                req.user?.id || null,
                req.user?.username || req.user?.email || "Admin User",
                req.headers['x-device-id'] || "Web Client",
                "Domain Mapping",
                "created",
                null,
                { domain_names, client_id, subclient_id, customer_id }
            );
        } catch (e) {}

        res.status(200).json({
            success: true,
            message: `${count} domain(s) linked to client successfully`
        });
    } catch (error) {
        console.error("Assign Domain Error:", error);
        res.status(500).json({ success: false, message: "Failed to link domain", error: error.message });
    }
};

// Unassign / Unlink domain
const unassignDomain = async (req, res) => {
    try {
        const { domain_name } = req.body;
        if (!domain_name) {
            return res.status(400).json({ success: false, message: "domain_name is required" });
        }

        await unassignDomainMapping(domain_name);

        try {
            await createAuditLog(
                req.user?.id || null,
                req.user?.username || req.user?.email || "Admin User",
                req.headers['x-device-id'] || "Web Client",
                "Domain Mapping",
                "deleted",
                { domain_name },
                null
            );
        } catch (e) {}

        res.status(200).json({
            success: true,
            message: `Domain "${domain_name}" unlinked successfully`
        });
    } catch (error) {
        console.error("Unassign Domain Error:", error);
        res.status(500).json({ success: false, message: "Failed to unlink domain", error: error.message });
    }
};

module.exports = {
    getClients,
    addClient,
    removeClient,
    addSubClient,
    removeSubClient,
    fetchUnassignedDomains,
    assignDomain,
    unassignDomain
};
