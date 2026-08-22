import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";
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

    // Search query for Unassigned Domains
    const [domainSearchTerm, setDomainSearchTerm] = useState("");

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

    const toggleExpandRow = (id) => {
        setExpandedClientIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Filtered unassigned domains matching live search query
    const filteredUnassignedDomains = useMemo(() => {
        if (!domainSearchTerm.trim()) return unassignedDomains;
        const term = domainSearchTerm.toLowerCase().trim();
        return unassignedDomains.filter(d => 
            (d.domain_name && d.domain_name.toLowerCase().includes(term)) ||
            (d.customer_id && d.customer_id.toLowerCase().includes(term)) ||
            (d.sku_plan && d.sku_plan.toLowerCase().includes(term))
        );
    }, [unassignedDomains, domainSearchTerm]);

    // Bulk selection handlers for Unassigned Domains (selects all matching search results)
    const isAllVisibleSelected =
        filteredUnassignedDomains.length > 0 &&
        filteredUnassignedDomains.every(d => selectedDomains.has(d.domain_name));

    const toggleSelectAllVisible = () => {
        if (isAllVisibleSelected) {
            setSelectedDomains(prev => {
                const next = new Set(prev);
                filteredUnassignedDomains.forEach(d => next.delete(d.domain_name));
                return next;
            });
        } else {
            setSelectedDomains(prev => {
                const next = new Set(prev);
                filteredUnassignedDomains.forEach(d => next.add(d.domain_name));
                return next;
            });
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

    // ── Define Columns for Clients Directory DataTable ──────────────────────────────
    const clientColumns = useMemo(() => [
        {
            key: "expand",
            label: "",
            sortable: false,
            minWidth: "50px",
            render: (client) => {
                const isExpanded = expandedClientIds.has(client.id);
                return (
                    <button
                        type="button"
                        onClick={() => toggleExpandRow(client.id)}
                        className="text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                    >
                        <i className={`fa-solid ${isExpanded ? "fa-chevron-down text-emerald-600" : "fa-chevron-right"} text-xs`}></i>
                    </button>
                );
            }
        },
        {
            key: "client_name",
            label: "Client Name",
            sortable: true,
            minWidth: "200px",
            render: (client) => (
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-extrabold flex items-center justify-center text-xs border border-emerald-100 shrink-0">
                        {client.client_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-900">{client.client_name}</span>
                </div>
            )
        },
        {
            key: "client_email",
            label: "Email",
            sortable: true,
            minWidth: "180px",
            render: (client) => (
                <span className="text-slate-600 font-medium">{client.client_email || "N/A"}</span>
            )
        },
        {
            key: "client_phone",
            label: "Phone Number",
            sortable: true,
            minWidth: "150px",
            render: (client) => (
                <span className="text-slate-600 font-medium whitespace-nowrap">{client.client_phone || "N/A"}</span>
            )
        },
        {
            key: "client_gst",
            label: "GST Number",
            sortable: true,
            minWidth: "160px",
            render: (client) => client.client_gst ? (
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold border border-slate-200">
                    {client.client_gst}
                </span>
            ) : <span className="text-slate-300">N/A</span>
        },
        {
            key: "domains",
            label: "Mapped Domains",
            sortable: false,
            minWidth: "220px",
            render: (client) => {
                const clientDomains = client.domains || [];
                return clientDomains.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {clientDomains.map(dm => (
                            <span key={dm.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-100">
                                <i className="fa-solid fa-globe text-[9px]"></i>
                                {dm.domain_name}
                                <button
                                    type="button"
                                    onClick={() => handleUnlinkDomain(dm.domain_name)}
                                    className="text-blue-400 hover:text-red-600 ml-0.5 cursor-pointer font-bold"
                                    title="Unlink Domain"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                ) : (
                    <span className="text-[11px] text-slate-400 italic">No domains mapped</span>
                );
            }
        },
        {
            key: "subclients",
            label: "Sub-Clients",
            sortable: false,
            minWidth: "180px",
            render: (client) => {
                const subCount = client.subclients?.length || 0;
                return (
                    <div className="flex items-center gap-2">
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
                            className="px-2 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                            title="Add Sub-Client"
                        >
                            <i className="fa-solid fa-plus text-[9px]"></i> Add Sub
                        </button>
                    </div>
                );
            }
        },
        {
            key: "actions",
            label: "Actions",
            sortable: false,
            minWidth: "90px",
            render: (client) => (
                <button
                    type="button"
                    onClick={() => handleDeleteClient(client.id, client.client_name)}
                    className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Delete Client"
                >
                    <i className="fa-solid fa-trash-can text-xs"></i>
                </button>
            )
        }
    ], [expandedClientIds]);

    // ── Define Columns for Unassigned Domains DataTable ─────────────────────────────
    const unassignedDomainColumns = useMemo(() => [
        {
            key: "select",
            label: (
                <input
                    type="checkbox"
                    checked={isAllVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                    title="Select All Visible"
                />
            ),
            sortable: false,
            minWidth: "50px",
            render: (dom) => (
                <input
                    type="checkbox"
                    checked={selectedDomains.has(dom.domain_name)}
                    onChange={() => toggleSelectDomain(dom.domain_name)}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
            )
        },
        {
            key: "domain_name",
            label: "Domain Name",
            sortable: true,
            minWidth: "200px",
            render: (dom) => (
                <span className="font-bold text-blue-700">{dom.domain_name}</span>
            )
        },
        {
            key: "customer_id",
            label: "Customer ID",
            sortable: true,
            minWidth: "150px",
            render: (dom) => (
                <span className="font-mono font-bold text-slate-600">{dom.customer_id}</span>
            )
        },
        {
            key: "sku_plan",
            label: "SKU Plan",
            sortable: true,
            minWidth: "180px",
            render: (dom) => (
                <span className="text-slate-700 font-medium">{dom.sku_plan}</span>
            )
        },
        {
            key: "active_seats",
            label: "Active Seats",
            sortable: true,
            minWidth: "110px",
            render: (dom) => (
                <span className="text-center font-extrabold text-slate-900 font-mono block">{dom.active_seats}</span>
            )
        },
        {
            key: "assign_mapping",
            label: "Assign Client & Subclient Mapping",
            sortable: false,
            minWidth: "320px",
            render: (dom) => {
                const rowSel = rowSelections[dom.domain_name] || { clientId: "", subclientId: "" };
                const activeParentClient = clients.find(c => String(c.id) === String(rowSel.clientId));
                const rowSubclients = activeParentClient?.subclients || [];

                return (
                    <div className="flex flex-wrap items-center gap-2">
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

                        <button
                            type="button"
                            disabled={!rowSel.clientId}
                            onClick={() => handleLinkSingleDomain(dom)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-2xs transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
                        >
                            <i className="fa-solid fa-link text-[10px]"></i> Link
                        </button>
                    </div>
                );
            }
        }
    ], [clients, selectedDomains, rowSelections, isAllVisibleSelected, filteredUnassignedDomains]);

    // Sub-row Renderer for Clients Directory
    const renderClientSubRow = (client, colSpan) => {
        const isExpanded = expandedClientIds.has(client.id);
        if (!isExpanded) return null;
        const subCount = client.subclients?.length || 0;

        return (
            <tr className="bg-purple-50/30 border-b border-purple-100">
                <td></td>
                <td colSpan={colSpan - 1} className="py-3.5 px-4">
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
        );
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar title="Client Management" />

            <main className="flex-1 w-full max-w-[96rem] mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col">
                
                {/* Top Section Switcher Tabs */}
                <div className="flex items-center gap-3 mb-6 bg-slate-200/60 p-1.5 rounded-2xl w-fit border border-slate-300/60">
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
                    <div className="flex-1 flex flex-col">
                        <DataTable
                            tableId="clients_directory_table"
                            title="Clients Directory"
                            data={clients}
                            columns={clientColumns}
                            loading={loadingClients}
                            defaultPageSize={8}
                            showTopPagination={false}
                            searchPlaceholder="Search client name, email, phone, GST..."
                            renderSubRow={renderClientSubRow}
                            actionButton={
                                <button
                                    type="button"
                                    onClick={() => setIsClientModalOpen(true)}
                                    className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0"
                                >
                                    <i className="fa-solid fa-user-plus text-sm"></i> Add New Client
                                </button>
                            }
                        />
                    </div>
                )}

                {/* VIEW 2: UNASSIGNED DOMAINS HUB */}
                {viewMode === "unassigned" && (
                    <div className="flex-1 flex flex-col">
                        <DataTable
                            tableId="unassigned_domains_table"
                            title="Unassigned Domains"
                            data={unassignedDomains}
                            columns={unassignedDomainColumns}
                            loading={loadingDomains}
                            defaultPageSize={8}
                            showTopPagination={false}
                            searchPlaceholder="Search domain name, customer ID, SKU..."
                            onSearchChange={(query) => setDomainSearchTerm(query)}
                            toggleActions={
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-bold text-slate-600">
                                        Selected ({selectedDomains.size}):
                                    </span>
                                    <select
                                        value={bulkClientId}
                                        onChange={(e) => {
                                            setBulkClientId(e.target.value);
                                            setBulkSubClientId("");
                                        }}
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="">-- Select Client --</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.client_name}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={bulkSubClientId}
                                        disabled={!bulkClientId}
                                        onChange={(e) => setBulkSubClientId(e.target.value)}
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500 disabled:opacity-40"
                                    >
                                        <option value="">-- Select Subclient (Optional) --</option>
                                        {bulkClientId && (clients.find(c => String(c.id) === String(bulkClientId))?.subclients || []).map(s => (
                                            <option key={s.id} value={s.id}>{s.subclient_name}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        disabled={selectedDomains.size === 0 || !bulkClientId}
                                        onClick={handleBulkLinkDomains}
                                        className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-xs transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                                    >
                                        <i className="fa-solid fa-link text-xs"></i> Bulk Link
                                    </button>
                                </div>
                            }
                        />
                    </div>
                )}

                {/* MODAL 1: ADD NEW CLIENT */}
                {isClientModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 duration-200">
                            
                            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
                                        <i className="fa-solid fa-user-plus text-base"></i>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-extrabold text-slate-900">Add New Client</h3>
                                        <p className="text-[11px] text-slate-500 font-medium">Create a main client profile for domain mapping</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsClientModalOpen(false)}
                                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center"
                                >
                                    <i className="fa-solid fa-xmark text-base"></i>
                                </button>
                            </div>

                            <form onSubmit={handleCreateClient} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Client Name (Required) */}
                                    <div>
                                        <label className="block text-xs font-extrabold text-slate-700 mb-1 flex items-center gap-1">
                                            <i className="fa-solid fa-building text-[10px] text-slate-400"></i>
                                            <span>Client Name</span>
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Acme Corp"
                                            value={clientForm.client_name}
                                            onChange={(e) => setClientForm({ ...clientForm, client_name: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 bg-slate-50/50 font-medium"
                                        />
                                    </div>

                                    {/* Client Email (Optional) */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                                            <i className="fa-solid fa-envelope text-[10px] text-slate-400"></i>
                                            <span>Client Email</span>
                                            <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="billing@acme.com"
                                            value={clientForm.client_email}
                                            onChange={(e) => setClientForm({ ...clientForm, client_email: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 bg-slate-50/50 font-medium"
                                        />
                                    </div>

                                    {/* Phone Number (Optional) */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                                            <i className="fa-solid fa-phone text-[10px] text-slate-400"></i>
                                            <span>Phone Number</span>
                                            <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="+91 9876543210"
                                            value={clientForm.client_phone}
                                            onChange={(e) => setClientForm({ ...clientForm, client_phone: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 bg-slate-50/50 font-medium"
                                        />
                                    </div>

                                    {/* GST Number (Optional) */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                                            <i className="fa-solid fa-file-invoice text-[10px] text-slate-400"></i>
                                            <span>GST Number</span>
                                            <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="27AAAAA0000A1Z5"
                                            value={clientForm.client_gst}
                                            onChange={(e) => setClientForm({ ...clientForm, client_gst: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase focus:outline-none focus:border-emerald-500 bg-slate-50/50"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsClientModalOpen(false)}
                                        className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submittingClient}
                                        className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer disabled:opacity-40"
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
                        <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 duration-200">
                            
                            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-2xs">
                                        <i className="fa-solid fa-users text-base"></i>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-extrabold text-slate-900">Add Sub-Client</h3>
                                        <p className="text-[11px] text-purple-700 font-semibold">Parent: {selectedParentClient.client_name}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsSubModalOpen(false)}
                                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center"
                                >
                                    <i className="fa-solid fa-xmark text-base"></i>
                                </button>
                            </div>

                            <form onSubmit={handleCreateSubClient} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Sub-Client Name (Required) */}
                                    <div>
                                        <label className="block text-xs font-extrabold text-slate-700 mb-1 flex items-center gap-1">
                                            <i className="fa-solid fa-building text-[10px] text-purple-400"></i>
                                            <span>Sub-Client Name</span>
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Tech Branch"
                                            value={subForm.subclient_name}
                                            onChange={(e) => setSubForm({ ...subForm, subclient_name: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-500 bg-slate-50/50 font-medium"
                                        />
                                    </div>

                                    {/* Sub-Client Email (Optional) */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                                            <i className="fa-solid fa-envelope text-[10px] text-purple-400"></i>
                                            <span>Sub-Client Email</span>
                                            <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="branch@acme.com"
                                            value={subForm.subclient_email}
                                            onChange={(e) => setSubForm({ ...subForm, subclient_email: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-500 bg-slate-50/50 font-medium"
                                        />
                                    </div>

                                    {/* Phone Number (Optional) */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                                            <i className="fa-solid fa-phone text-[10px] text-purple-400"></i>
                                            <span>Phone Number</span>
                                            <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="+91 9876543211"
                                            value={subForm.subclient_phone}
                                            onChange={(e) => setSubForm({ ...subForm, subclient_phone: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-500 bg-slate-50/50 font-medium"
                                        />
                                    </div>

                                    {/* GST Number (Optional) */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                                            <i className="fa-solid fa-file-invoice text-[10px] text-purple-400"></i>
                                            <span>GST Number</span>
                                            <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="27AAAAA0000A1Z6"
                                            value={subForm.subclient_gst}
                                            onChange={(e) => setSubForm({ ...subForm, subclient_gst: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase focus:outline-none focus:border-purple-500 bg-slate-50/50"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsSubModalOpen(false)}
                                        className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submittingSub}
                                        className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer disabled:opacity-40"
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
