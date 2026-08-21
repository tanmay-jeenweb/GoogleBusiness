import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import {
    fetchClients,
    createClient,
    deleteClient,
    createSubClient,
    deleteSubClient,
    fetchUnassignedDomains,
    assignDomain,
    unassignDomain
} from "../../api/clientApi";

export default function ClientsPage() {
    // Active View Mode: 'directory' | 'unassigned'
    const [viewMode, setViewMode] = useState("directory");

    const [clients, setClients] = useState([]);
    const [unassignedDomains, setUnassignedDomains] = useState([]);
    const [loadingClients, setLoadingClients] = useState(true);
    const [loadingDomains, setLoadingDomains] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [domainSearchTerm, setDomainSearchTerm] = useState("");

    // Unassigned Domains Pagination State
    const [domainPage, setDomainPage] = useState(1);
    const [domainItemsPerPage, setDomainItemsPerPage] = useState(10);

    // Selected rows for bulk assignment in Unassigned Domains
    const [selectedDomains, setSelectedDomains] = useState(new Set());
    const [bulkClientId, setBulkClientId] = useState("");
    const [bulkSubClientId, setBulkSubClientId] = useState("");

    // Row-level dropdown selections in Unassigned Domains table (domain_name -> { clientId, subclientId })
    const [rowSelections, setRowSelections] = useState({});

    // Modal state for Add Client
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [clientForm, setClientForm] = useState({
        client_name: "",
        client_email: "",
        client_phone: "",
        client_gst: ""
    });
    const [submittingClient, setSubmittingClient] = useState(false);

    // Modal state for Add Sub-Client
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [selectedParentClient, setSelectedParentClient] = useState(null);
    const [subForm, setSubForm] = useState({
        subclient_name: "",
        subclient_email: "",
        subclient_phone: "",
        subclient_gst: ""
    });
    const [submittingSub, setSubmittingSub] = useState(false);

    // Expanded row keys for viewing sub-clients
    const [expandedClientIds, setExpandedClientIds] = useState(new Set());

    const loadData = async () => {
        try {
            setLoadingClients(true);
            const resClients = await fetchClients();
            if (resClients.data?.success) {
                setClients(resClients.data.clients || []);
            }
        } catch (error) {
            console.error("Error loading clients:", error);
            toast.error("Failed to load clients from MySQL");
        } finally {
            setLoadingClients(false);
        }

        try {
            setLoadingDomains(true);
            const resDomains = await fetchUnassignedDomains();
            if (resDomains.data?.success) {
                setUnassignedDomains(resDomains.data.domains || []);
            }
        } catch (error) {
            console.error("Error loading unassigned domains:", error);
        } finally {
            setLoadingDomains(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Reset domain page to 1 when search term or per-page count changes
    useEffect(() => {
        setDomainPage(1);
    }, [domainSearchTerm, domainItemsPerPage]);

    const toggleExpandRow = (id) => {
        setExpandedClientIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Filter unassigned domains
    const filteredUnassignedDomains = unassignedDomains.filter(d => {
        const term = domainSearchTerm.toLowerCase();
        return (
            d.domain_name.toLowerCase().includes(term) ||
            (d.customer_id && d.customer_id.toLowerCase().includes(term)) ||
            (d.sku_plan && d.sku_plan.toLowerCase().includes(term))
        );
    });

    // Calculate domain pagination slice
    const totalDomains = filteredUnassignedDomains.length;
    const totalDomainPages = Math.max(1, Math.ceil(totalDomains / domainItemsPerPage));
    const indexOfLastDomain = domainPage * domainItemsPerPage;
    const indexOfFirstDomain = indexOfLastDomain - domainItemsPerPage;
    const currentPaginatedDomains = filteredUnassignedDomains.slice(indexOfFirstDomain, indexOfLastDomain);

    // Bulk selection handlers
    const isAllVisibleSelected =
        currentPaginatedDomains.length > 0 &&
        currentPaginatedDomains.every(d => selectedDomains.has(d.domain_name));

    const toggleSelectAllVisible = () => {
        if (isAllVisibleSelected) {
            setSelectedDomains(new Set());
        } else {
            const next = new Set(selectedDomains);
            currentPaginatedDomains.forEach(d => next.add(d.domain_name));
            setSelectedDomains(next);
        }
    };

    const toggleSelectDomain = (domainName) => {
        setSelectedDomains(prev => {
            const next = new Set(prev);
            if (next.has(domainName)) next.delete(domainName);
            else next.add(domainName);
            return next;
        });
    };

    // Row selection update helper
    const handleRowClientChange = (domainName, clientId) => {
        setRowSelections(prev => ({
            ...prev,
            [domainName]: {
                clientId,
                subclientId: ""
            }
        }));
    };

    const handleRowSubClientChange = (domainName, subclientId) => {
        setRowSelections(prev => ({
            ...prev,
            [domainName]: {
                ...(prev[domainName] || {}),
                subclientId
            }
        }));
    };

    // Link single domain
    const handleLinkSingleDomain = async (domainObj) => {
        const sel = rowSelections[domainObj.domain_name];
        if (!sel || !sel.clientId) {
            toast.error(`Please select a Client for ${domainObj.domain_name}`);
            return;
        }

        try {
            const res = await assignDomain({
                domain_names: [domainObj.domain_name],
                client_id: sel.clientId,
                subclient_id: sel.subclientId || null,
                customer_id: domainObj.customer_id
            });
            if (res.data?.success) {
                toast.success(`Domain "${domainObj.domain_name}" assigned successfully!`);
                setSelectedDomains(prev => {
                    const next = new Set(prev);
                    next.delete(domainObj.domain_name);
                    return next;
                });
                loadData();
            }
        } catch (error) {
            console.error("Assign domain error:", error);
            toast.error("Failed to link domain.");
        }
    };

    // Bulk link selected domains
    const handleBulkLinkDomains = async () => {
        if (selectedDomains.size === 0) {
            toast.error("Please select at least one domain.");
            return;
        }
        if (!bulkClientId) {
            toast.error("Please select a Client for bulk assignment.");
            return;
        }

        try {
            const res = await assignDomain({
                domain_names: Array.from(selectedDomains),
                client_id: bulkClientId,
                subclient_id: bulkSubClientId || null
            });
            if (res.data?.success) {
                toast.success(`${selectedDomains.size} domain(s) assigned to client successfully!`);
                setSelectedDomains(new Set());
                setBulkClientId("");
                setBulkSubClientId("");
                loadData();
            }
        } catch (error) {
            console.error("Bulk assign domain error:", error);
            toast.error("Failed to bulk link domains.");
        }
    };

    // Unlink domain from client
    const handleUnlinkDomain = async (domainName) => {
        if (!window.confirm(`Unlink domain "${domainName}" from client?`)) return;
        try {
            const res = await unassignDomain(domainName);
            if (res.data?.success) {
                toast.success(`Domain "${domainName}" unlinked.`);
                loadData();
            }
        } catch (error) {
            console.error("Unlink domain error:", error);
            toast.error("Failed to unlink domain.");
        }
    };

    // Create Client Submit
    const handleCreateClient = async (e) => {
        e.preventDefault();
        if (!clientForm.client_name.trim()) {
            toast.error("Client Name is required");
            return;
        }

        try {
            setSubmittingClient(true);
            const res = await createClient(clientForm);
            if (res.data?.success) {
                toast.success(res.data.message || "Client created successfully");
                setClientForm({ client_name: "", client_email: "", client_phone: "", client_gst: "" });
                setIsClientModalOpen(false);
                loadData();
            }
        } catch (error) {
            console.error("Create client error:", error);
            toast.error(error.response?.data?.message || "Failed to create client");
        } finally {
            setSubmittingClient(false);
        }
    };

    // Delete Client
    const handleDeleteClient = async (id, name) => {
        if (!window.confirm(`Delete client "${name}" and all its sub-clients & linked domains?`)) return;
        try {
            await deleteClient(id);
            toast.success(`Client "${name}" deleted`);
            loadData();
        } catch (error) {
            console.error("Delete client error:", error);
            toast.error("Failed to delete client");
        }
    };

    // Open Sub-Client Modal
    const openAddSubModal = (client) => {
        setSelectedParentClient(client);
        setSubForm({ subclient_name: "", subclient_email: "", subclient_phone: "", subclient_gst: "" });
        setIsSubModalOpen(true);
    };

    // Create Sub-Client Submit
    const handleCreateSubClient = async (e) => {
        e.preventDefault();
        if (!subForm.subclient_name.trim()) {
            toast.error("Sub-Client Name is required");
            return;
        }
        if (!selectedParentClient) return;

        try {
            setSubmittingSub(true);
            const res = await createSubClient(selectedParentClient.id, subForm);
            if (res.data?.success) {
                toast.success(res.data.message || "Sub-Client added successfully");
                setIsSubModalOpen(false);
                setExpandedClientIds(prev => new Set(prev).add(selectedParentClient.id));
                loadData();
            }
        } catch (error) {
            console.error("Create sub-client error:", error);
            toast.error(error.response?.data?.message || "Failed to add sub-client");
        } finally {
            setSubmittingSub(false);
        }
    };

    // Delete Sub-Client
    const handleDeleteSubClient = async (subId, subName) => {
        if (!window.confirm(`Delete sub-client "${subName}"?`)) return;
        try {
            await deleteSubClient(subId);
            toast.success(`Sub-client "${subName}" deleted`);
            loadData();
        } catch (error) {
            console.error("Delete sub-client error:", error);
            toast.error("Failed to delete sub-client");
        }
    };

    // Filter clients in Directory
    const filteredClients = clients.filter(c => {
        const term = searchTerm.toLowerCase();
        const matchParent =
            c.client_name.toLowerCase().includes(term) ||
            (c.client_email && c.client_email.toLowerCase().includes(term)) ||
            (c.client_phone && c.client_phone.toLowerCase().includes(term)) ||
            (c.client_gst && c.client_gst.toLowerCase().includes(term));

        const matchSub = (c.subclients || []).some(s =>
            s.subclient_name.toLowerCase().includes(term) ||
            (s.subclient_email && s.subclient_email.toLowerCase().includes(term)) ||
            (s.subclient_gst && s.subclient_gst.toLowerCase().includes(term))
        );

        return matchParent || matchSub;
    });

    const totalSubClientsCount = clients.reduce((acc, c) => acc + (c.subclients?.length || 0), 0);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar title="Client Management" />

            <main className="flex-1 w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                
                {/* Top Header & Section Switcher */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Client Directory & Domain Mapping Engine
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            Client Management
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Manage clients, sub-clients, and assign uploaded domains from MySQL database.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsClientModalOpen(true)}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 cursor-pointer self-start md:self-auto"
                    >
                        <i className="fa-solid fa-user-plus text-sm"></i> Add New Client
                    </button>
                </div>

                {/* MAIN TAB NAVIGATION SWITCHER */}
                <div className="flex items-center gap-3 mb-8 bg-slate-200/60 p-1.5 rounded-2xl w-fit border border-slate-300/60">
                    <button
                        type="button"
                        onClick={() => setViewMode("directory")}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            viewMode === "directory"
                                ? "bg-white text-emerald-700 shadow-md border border-emerald-100"
                                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                        }`}
                    >
                        <i className="fa-solid fa-address-book text-sm"></i>
                        <span>Clients Directory ({clients.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setViewMode("unassigned")}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            viewMode === "unassigned"
                                ? "bg-white text-amber-700 shadow-md border border-amber-100"
                                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                        }`}
                    >
                        <i className="fa-solid fa-globe text-sm"></i>
                        <span>Unassigned Domains</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-extrabold">
                            {unassignedDomains.length}
                        </span>
                    </button>
                </div>

                {/* VIEW 1: CLIENTS DIRECTORY */}
                {viewMode === "directory" && (
                    <div className="space-y-6">
                        {/* Search Bar */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="relative w-full sm:w-96">
                                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                                <input
                                    type="text"
                                    placeholder="Search client name, email, phone, GST, or sub-client..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 bg-slate-50/50"
                                />
                            </div>
                            <span className="text-xs font-semibold text-slate-500">
                                Showing {filteredClients.length} of {clients.length} clients
                            </span>
                        </div>

                        {/* CLIENTS TABLE */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                                            <th className="py-3.5 px-4 w-10"></th>
                                            <th className="py-3.5 px-4">Client Name</th>
                                            <th className="py-3.5 px-4">Email</th>
                                            <th className="py-3.5 px-4">Phone Number</th>
                                            <th className="py-3.5 px-4 font-mono">GST Number</th>
                                            <th className="py-3.5 px-4">Mapped Domains</th>
                                            <th className="py-3.5 px-4 text-center">Sub-Clients</th>
                                            <th className="py-3.5 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {loadingClients ? (
                                            <tr>
                                                <td colSpan="8" className="py-12 text-center text-slate-400">
                                                    <i className="fa-solid fa-circle-notch fa-spin text-xl mb-2 text-emerald-600 block"></i>
                                                    Loading clients from MySQL...
                                                </td>
                                            </tr>
                                        ) : filteredClients.length > 0 ? (
                                            filteredClients.map((client) => {
                                                const isExpanded = expandedClientIds.has(client.id);
                                                const subCount = client.subclients?.length || 0;
                                                const clientDomains = client.domains || [];

                                                return (
                                                    <React.Fragment key={client.id}>
                                                        <tr className="hover:bg-slate-50/80 transition-colors">
                                                            
                                                            {/* Expand Toggle */}
                                                            <td className="py-3.5 px-4 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleExpandRow(client.id)}
                                                                    className="text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                                                                >
                                                                    <i className={`fa-solid ${isExpanded ? "fa-chevron-down text-emerald-600" : "fa-chevron-right"} text-xs`}></i>
                                                                </button>
                                                            </td>

                                                            {/* Client Name */}
                                                            <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-extrabold flex items-center justify-center text-xs border border-emerald-100">
                                                                        {client.client_name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <span>{client.client_name}</span>
                                                                </div>
                                                            </td>

                                                            {/* Email */}
                                                            <td className="py-3.5 px-4 text-slate-600">
                                                                {client.client_email || <span className="text-slate-300">N/A</span>}
                                                            </td>

                                                            {/* Phone */}
                                                            <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                                                                {client.client_phone || <span className="text-slate-300">N/A</span>}
                                                            </td>

                                                            {/* GST */}
                                                            <td className="py-3.5 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                                                                {client.client_gst ? (
                                                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                                                        {client.client_gst}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-300">N/A</span>
                                                                )}
                                                            </td>

                                                            {/* Mapped Domains Badge List */}
                                                            <td className="py-3.5 px-4">
                                                                {clientDomains.length > 0 ? (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {clientDomains.map(dm => (
                                                                            <span key={dm.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-100">
                                                                                <i className="fa-solid fa-globe text-[9px]"></i>
                                                                                {dm.domain_name}
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleUnlinkDomain(dm.domain_name)}
                                                                                    className="text-blue-400 hover:text-red-600 ml-0.5 cursor-pointer"
                                                                                    title="Unlink Domain"
                                                                                >
                                                                                    ×
                                                                                </button>
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[11px] text-slate-400 italic">No domains mapped</span>
                                                                )}
                                                            </td>

                                                            {/* Sub-Client Count & Add button */}
                                                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleExpandRow(client.id)}
                                                                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                                                                            subCount > 0
                                                                                ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                                                                                : "bg-slate-50 text-slate-400 border-slate-200"
                                                                        }`}
                                                                    >
                                                                        {subCount} Sub-Clients
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openAddSubModal(client)}
                                                                        className="px-2 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                                                        title="Add Sub-Client to this Client"
                                                                    >
                                                                        <i className="fa-solid fa-plus text-[9px]"></i> Add Sub
                                                                    </button>
                                                                </div>
                                                            </td>

                                                            {/* Actions */}
                                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteClient(client.id, client.client_name)}
                                                                    className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                                                    title="Delete Client"
                                                                >
                                                                    <i className="fa-solid fa-trash-can text-xs"></i>
                                                                </button>
                                                            </td>
                                                        </tr>

                                                        {/* NESTED SUB-CLIENTS ROW */}
                                                        {isExpanded && (
                                                            <tr className="bg-purple-50/30 border-b border-purple-100">
                                                                <td></td>
                                                                <td colSpan="7" className="py-3.5 px-4">
                                                                    <div className="pl-4 border-l-2 border-purple-300 my-1 space-y-3">
                                                                        <div className="flex items-center justify-between text-[11px] font-extrabold text-purple-900">
                                                                            <span>Sub-Clients & Sub-Domains of "{client.client_name}":</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => openAddSubModal(client)}
                                                                                className="text-purple-700 hover:text-purple-900 underline text-xs font-bold"
                                                                            >
                                                                                + Add Sub-Client
                                                                            </button>
                                                                        </div>

                                                                        {subCount > 0 ? (
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                                {client.subclients.map(sub => (
                                                                                    <div key={sub.id} className="bg-white p-3 rounded-xl border border-purple-100 shadow-2xs flex flex-col justify-between gap-2">
                                                                                        <div className="flex items-start justify-between">
                                                                                            <div>
                                                                                                <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                                                                                    <i className="fa-solid fa-turn-up text-purple-400 rotate-90 text-[10px]"></i>
                                                                                                    {sub.subclient_name}
                                                                                                </h5>
                                                                                                <div className="text-[11px] text-slate-500 mt-1 space-x-3">
                                                                                                    {sub.subclient_email && <span>📧 {sub.subclient_email}</span>}
                                                                                                    {sub.subclient_phone && <span>📞 {sub.subclient_phone}</span>}
                                                                                                    {sub.subclient_gst && <span className="font-mono text-purple-700 font-bold">GST: {sub.subclient_gst}</span>}
                                                                                                </div>
                                                                                            </div>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => handleDeleteSubClient(sub.id, sub.subclient_name)}
                                                                                                className="text-red-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                                                                                                title="Delete Sub-Client"
                                                                                            >
                                                                                                <i className="fa-solid fa-xmark text-xs"></i>
                                                                                            </button>
                                                                                        </div>

                                                                                        {/* Sub-Client Mapped Domains */}
                                                                                        {sub.domains && sub.domains.length > 0 && (
                                                                                            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                                                                                                <span className="text-[10px] font-bold text-purple-700 mr-1">Linked Domains:</span>
                                                                                                {sub.domains.map(sdm => (
                                                                                                    <span key={sdm.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-800 font-bold text-[10px] border border-purple-100">
                                                                                                        {sdm.domain_name}
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={() => handleUnlinkDomain(sdm.domain_name)}
                                                                                                            className="text-purple-400 hover:text-red-600 ml-0.5 cursor-pointer"
                                                                                                            title="Unlink Domain"
                                                                                                        >
                                                                                                            ×
                                                                                                        </button>
                                                                                                    </span>
                                                                                                ))}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-xs text-slate-400 italic">No sub-clients created yet.</p>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="8" className="py-12 text-center text-slate-400 text-xs">
                                                    No clients found. Click "+ Add New Client" to create one.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW 2: UNASSIGNED DOMAINS HUB WITH PAGINATION */}
                {viewMode === "unassigned" && (
                    <div className="space-y-6">
                        
                        {/* Search & Bulk Action Bar */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                            
                            {/* Live Search Input */}
                            <div className="relative w-full md:w-80">
                                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                                <input
                                    type="text"
                                    placeholder="Search domain, customer ID..."
                                    value={domainSearchTerm}
                                    onChange={(e) => setDomainSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 bg-slate-50/50"
                                />
                            </div>

                            {/* Rows Per Page Selector */}
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span>Show:</span>
                                <select
                                    value={domainItemsPerPage}
                                    onChange={(e) => setDomainItemsPerPage(Number(e.target.value))}
                                    className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                                >
                                    <option value={10}>10 per page</option>
                                    <option value={25}>25 per page</option>
                                    <option value={50}>50 per page</option>
                                    <option value={100}>100 per page</option>
                                </select>
                            </div>

                            {/* BULK ASSIGNMENT BAR */}
                            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                                <span className="text-xs font-bold text-slate-600">
                                    Selected ({selectedDomains.size}):
                                </span>

                                {/* Select Client Dropdown */}
                                <select
                                    value={bulkClientId}
                                    onChange={(e) => {
                                        setBulkClientId(e.target.value);
                                        setBulkSubClientId("");
                                    }}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500"
                                >
                                    <option value="">-- Select Client --</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.client_name}</option>
                                    ))}
                                </select>

                                {/* Select Subclient Dropdown */}
                                <select
                                    value={bulkSubClientId}
                                    disabled={!bulkClientId}
                                    onChange={(e) => setBulkSubClientId(e.target.value)}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500 disabled:opacity-40"
                                >
                                    <option value="">-- Select Subclient (Optional) --</option>
                                    {bulkClientId && (clients.find(c => String(c.id) === String(bulkClientId))?.subclients || []).map(s => (
                                        <option key={s.id} value={s.id}>{s.subclient_name}</option>
                                    ))}
                                </select>

                                {/* Bulk Link Button */}
                                <button
                                    type="button"
                                    disabled={selectedDomains.size === 0 || !bulkClientId}
                                    onClick={handleBulkLinkDomains}
                                    className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-sm transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                                >
                                    <i className="fa-solid fa-link text-xs"></i> Bulk Link
                                </button>
                            </div>
                        </div>

                        {/* UNASSIGNED DOMAINS TABLE */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                                            {/* SELECT ALL VISIBLE CHECKBOX */}
                                            <th className="py-3.5 px-4 w-12 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isAllVisibleSelected}
                                                    onChange={toggleSelectAllVisible}
                                                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                                                    title="Select All Visible"
                                                />
                                            </th>
                                            <th className="py-3.5 px-4">Domain Name</th>
                                            <th className="py-3.5 px-4 font-mono">Customer ID</th>
                                            <th className="py-3.5 px-4">SKU Plan</th>
                                            <th className="py-3.5 px-4 text-center">Active Seats</th>
                                            <th className="py-3.5 px-4">Assign Client & Subclient Mapping</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {loadingDomains ? (
                                            <tr>
                                                <td colSpan="6" className="py-12 text-center text-slate-400">
                                                    <i className="fa-solid fa-circle-notch fa-spin text-xl mb-2 text-amber-600 block"></i>
                                                    Loading unassigned domains from MySQL...
                                                </td>
                                            </tr>
                                        ) : currentPaginatedDomains.length > 0 ? (
                                            currentPaginatedDomains.map((dom, idx) => {
                                                const isSelected = selectedDomains.has(dom.domain_name);
                                                const rowSel = rowSelections[dom.domain_name] || { clientId: "", subclientId: "" };
                                                const activeParentClient = clients.find(c => String(c.id) === String(rowSel.clientId));
                                                const rowSubclients = activeParentClient?.subclients || [];

                                                return (
                                                    <tr key={`${dom.domain_name}_${idx}`} className={`hover:bg-amber-50/40 transition-colors ${isSelected ? "bg-amber-50/60" : ""}`}>
                                                        
                                                        {/* Checkbox Select */}
                                                        <td className="py-3.5 px-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelectDomain(dom.domain_name)}
                                                                className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                                                            />
                                                        </td>

                                                        {/* Domain Name */}
                                                        <td className="py-3.5 px-4 font-bold text-blue-700 whitespace-nowrap">
                                                            {dom.domain_name}
                                                        </td>

                                                        {/* Customer ID */}
                                                        <td className="py-3.5 px-4 font-mono font-bold text-slate-600 whitespace-nowrap">
                                                            {dom.customer_id}
                                                        </td>

                                                        {/* SKU Plan */}
                                                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                                                            {dom.sku_plan}
                                                        </td>

                                                        {/* Active Seats */}
                                                        <td className="py-3.5 px-4 text-center font-extrabold text-slate-900 font-mono">
                                                            {dom.active_seats}
                                                        </td>

                                                        {/* Assign Client & Subclient Mapping Row Controls */}
                                                        <td className="py-3.5 px-4">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                {/* Client Select */}
                                                                <select
                                                                    value={rowSel.clientId}
                                                                    onChange={(e) => handleRowClientChange(dom.domain_name, e.target.value)}
                                                                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-amber-500"
                                                                >
                                                                    <option value="">-- Client --</option>
                                                                    {clients.map(c => (
                                                                        <option key={c.id} value={c.id}>{c.client_name}</option>
                                                                    ))}
                                                                </select>

                                                                {/* Subclient Select */}
                                                                <select
                                                                    value={rowSel.subclientId}
                                                                    disabled={!rowSel.clientId}
                                                                    onChange={(e) => handleRowSubClientChange(dom.domain_name, e.target.value)}
                                                                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-amber-500 disabled:opacity-40"
                                                                >
                                                                    <option value="">-- Subclient --</option>
                                                                    {rowSubclients.map(s => (
                                                                        <option key={s.id} value={s.id}>{s.subclient_name}</option>
                                                                    ))}
                                                                </select>

                                                                {/* Link Button */}
                                                                <button
                                                                    type="button"
                                                                    disabled={!rowSel.clientId}
                                                                    onClick={() => handleLinkSingleDomain(dom)}
                                                                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-2xs transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
                                                                >
                                                                    <i className="fa-solid fa-link text-[10px]"></i> Link
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="py-12 text-center text-slate-400 text-xs">
                                                    No unassigned domains found in MySQL database.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* DOMAIN PAGINATION CONTROLS & FOOTER */}
                            <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
                                <div>
                                    <span>
                                        Showing <strong className="text-slate-900">{totalDomains === 0 ? 0 : indexOfFirstDomain + 1}</strong> to <strong className="text-slate-900">{Math.min(indexOfLastDomain, totalDomains)}</strong> of <strong className="text-slate-900">{totalDomains}</strong> unassigned domains
                                    </span>
                                </div>

                                {/* Pagination Controls */}
                                {totalDomainPages > 1 && (
                                    <div className="flex items-center gap-1">
                                        {/* Previous Button */}
                                        <button
                                            type="button"
                                            disabled={domainPage === 1}
                                            onClick={() => setDomainPage(prev => Math.max(prev - 1, 1))}
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                                        >
                                            <i className="fa-solid fa-chevron-left text-[10px]"></i> Previous
                                        </button>

                                        {/* Page Numbers */}
                                        {Array.from({ length: totalDomainPages }, (_, i) => i + 1).map(page => {
                                            if (
                                                page === 1 ||
                                                page === totalDomainPages ||
                                                (page >= domainPage - 1 && page <= domainPage + 1)
                                            ) {
                                                return (
                                                    <button
                                                        key={page}
                                                        type="button"
                                                        onClick={() => setDomainPage(page)}
                                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                            domainPage === page
                                                                ? "bg-amber-600 text-white shadow-xs"
                                                                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                                                        }`}
                                                    >
                                                        {page}
                                                    </button>
                                                );
                                            } else if (
                                                (page === domainPage - 2 && domainPage > 3) ||
                                                (page === domainPage + 2 && domainPage < totalDomainPages - 2)
                                            ) {
                                                return <span key={page} className="px-1 text-slate-400">...</span>;
                                            }
                                            return null;
                                        })}

                                        {/* Next Button */}
                                        <button
                                            type="button"
                                            disabled={domainPage === totalDomainPages}
                                            onClick={() => setDomainPage(prev => Math.min(prev + 1, totalDomainPages))}
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                                        >
                                            Next <i className="fa-solid fa-chevron-right text-[10px]"></i>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}

                {/* MODAL 1: ADD NEW CLIENT */}
                {isClientModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">
                            
                            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                                    <i className="fa-solid fa-user-plus text-emerald-600"></i> Add New Client
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setIsClientModalOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
                                >
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>

                            <form onSubmit={handleCreateClient} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Client Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Acme Corporation"
                                        value={clientForm.client_name}
                                        onChange={(e) => setClientForm({ ...clientForm, client_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Client Email
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="billing@acme.com"
                                        value={clientForm.client_email}
                                        onChange={(e) => setClientForm({ ...clientForm, client_email: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="+91 9876543210"
                                        value={clientForm.client_phone}
                                        onChange={(e) => setClientForm({ ...clientForm, client_phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        GST Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="27AAAAA0000A1Z5"
                                        value={clientForm.client_gst}
                                        onChange={(e) => setClientForm({ ...clientForm, client_gst: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsClientModalOpen(false)}
                                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submittingClient}
                                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm cursor-pointer disabled:opacity-40"
                                    >
                                        {submittingClient ? "Saving..." : "Save Client"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL 2: ADD SUB-CLIENT */}
                {isSubModalOpen && selectedParentClient && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">
                            
                            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                                <div>
                                    <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                                        <i className="fa-solid fa-users text-purple-600"></i> Add Sub-Client
                                    </h3>
                                    <p className="text-[11px] text-purple-700 font-semibold mt-0.5">
                                        Parent: {selectedParentClient.client_name}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsSubModalOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
                                >
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>

                            <form onSubmit={handleCreateSubClient} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Sub-Client Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Acme Tech Branch"
                                        value={subForm.subclient_name}
                                        onChange={(e) => setSubForm({ ...subForm, subclient_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Sub-Client Email
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="branch@acme.com"
                                        value={subForm.subclient_email}
                                        onChange={(e) => setSubForm({ ...subForm, subclient_email: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="+91 9876543211"
                                        value={subForm.subclient_phone}
                                        onChange={(e) => setSubForm({ ...subForm, subclient_phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        GST Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="27AAAAA0000A1Z6"
                                        value={subForm.subclient_gst}
                                        onChange={(e) => setSubForm({ ...subForm, subclient_gst: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsSubModalOpen(false)}
                                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submittingSub}
                                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-sm cursor-pointer disabled:opacity-40"
                                    >
                                        {submittingSub ? "Saving..." : "Save Sub-Client"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
