import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";

// ─── Linked Domains Cell Component with Clean Inline Click Expansion ───────────────
function LinkedDomainsCell({ domains = [] }) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!domains || domains.length === 0) {
        return <span className="text-slate-400 font-mono text-xs">No Linked Domains</span>;
    }

    const showAll = isExpanded || domains.length <= 2;
    const displayedDomains = showAll ? domains : domains.slice(0, 2);
    const hiddenCount = domains.length - 2;

    return (
        <div className="py-1">
            <div className="flex flex-wrap items-center gap-1.5 max-w-[440px]">
                {displayedDomains.map((dom, idx) => (
                    <div
                        key={idx}
                        className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-100/90 text-slate-800 border border-slate-200/90 font-bold flex items-center gap-1.5 shadow-2xs"
                        title={dom}
                    >
                        <i className="fa-solid fa-globe text-[9px] text-blue-600 shrink-0"></i>
                        <span>{dom}</span>
                    </div>
                ))}

                {domains.length > 2 && (
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 cursor-pointer shadow-2xs transition-all flex items-center gap-1 shrink-0"
                    >
                        <span>{isExpanded ? "Show less" : `+${hiddenCount} more`}</span>
                        <i className={`fa-solid fa-chevron-down text-[8px] transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}></i>
                    </button>
                )}
            </div>
        </div>
    );
}

export default function ClientPerformancePage() {
    const [selectedMonth, setSelectedMonth] = useState("August 2026");
    const [availableMonths, setAvailableMonths] = useState(["August 2026"]);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadAvailableMonths = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("http://localhost:5000/api/dashboard/available-months", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.success && res.data.months?.length > 0) {
                setAvailableMonths(res.data.months);
            }
        } catch (e) {
            console.error("Error loading available months:", e);
        }
    };

    const loadReportData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const res = await axios.get(`http://localhost:5000/api/dashboard/client-performance?month=${encodeURIComponent(selectedMonth)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.success) {
                setReportData(res.data.data);
            }
        } catch (error) {
            console.error("Error fetching client performance report:", error);
            toast.error("Failed to load client performance report");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAvailableMonths();
    }, []);

    useEffect(() => {
        loadReportData();
    }, [selectedMonth]);

    const clientsList = reportData?.clients || [];

    const formatINR = (val) => {
        if (!val || val === 0) return "₹0.00";
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
    };

    const handleExportCSV = () => {
        if (clientsList.length === 0) {
            toast.error("No client performance data to export");
            return;
        }

        const headers = [
            "Client Name", 
            "Linked Domains Count", 
            "Linked Domain Names", 
            "Active Seats", 
            "Selected Month Invoiced (INR)", 
            "Lifetime Billing (INR)"
        ];

        const csvRows = [
            headers.join(","),
            ...clientsList.map(c => [
                `"${c.client_name}"`,
                c.linked_domains_count,
                `"${(c.linked_domains || []).join('; ')}"`,
                c.active_seats,
                c.selected_month_invoiced,
                c.lifetime_billing
            ].join(","))
        ];

        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `Client_Performance_${selectedMonth.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Exported ${clientsList.length} client rows to CSV`);
    };

    // DataTable Column Definitions
    const columns = useMemo(() => [
        {
            key: "client_name",
            label: "Client Name",
            sortable: true,
            minWidth: "180px",
            render: (client) => (
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {client.client_name ? client.client_name[0].toUpperCase() : "C"}
                    </div>
                    <span className="font-extrabold text-slate-900 text-sm">{client.client_name}</span>
                </div>
            )
        },
        {
            key: "linked_domains_count",
            label: "Linked Domains",
            sortable: true,
            minWidth: "300px",
            render: (client) => (
                <LinkedDomainsCell domains={client.linked_domains} />
            )
        },
        {
            key: "active_seats",
            label: "Active Seats",
            sortable: true,
            minWidth: "120px",
            render: (client) => (
                <span className="text-center font-bold text-blue-600 font-mono text-sm block">
                    {client.active_seats}
                </span>
            )
        },
        {
            key: "selected_month_invoiced",
            label: "Selected Month Invoiced",
            sortable: true,
            minWidth: "180px",
            render: (client) => (
                <span className="font-black text-slate-900 font-mono text-right block text-sm">
                    {formatINR(client.selected_month_invoiced)}
                </span>
            )
        },
        {
            key: "lifetime_billing",
            label: "Lifetime Billing",
            sortable: true,
            minWidth: "180px",
            render: (client) => (
                <span className="font-bold text-slate-900 font-mono text-right block text-sm">
                    {formatINR(client.lifetime_billing)}
                </span>
            )
        }
    ], []);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar title="Client Performance" />

            <main className="flex-1 w-full max-w-[96rem] mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 flex flex-col">
                
                {/* Minimal Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                                Client Performance
                            </span>
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                            Client-Wise Business Report
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Analyze active committed seats and revenue performance distribution by Client
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Select Month Inline */}
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                <i className="fa-solid fa-calendar text-blue-600 text-xs"></i> Select Month:
                            </span>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-extrabold text-slate-900 focus:outline-none cursor-pointer"
                            >
                                {availableMonths.map((m, idx) => (
                                    <option key={idx} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>

                        {/* Export CSV button */}
                        <button
                            type="button"
                            onClick={handleExportCSV}
                            title={`Export CSV (${clientsList.length} clients)`}
                            className="h-9 w-9 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-2xs transition-all cursor-pointer flex items-center justify-center shrink-0"
                        >
                            <i className="fa-solid fa-file-excel text-sm"></i>
                        </button>
                    </div>
                </div>

                {/* FULL-WIDTH CLIENT PERFORMANCE DATATABLE */}
                <div className="flex-1 flex flex-col w-full">
                    <DataTable
                        tableId="client_performance_table"
                        title="Client Performance Report"
                        data={clientsList}
                        columns={columns}
                        loading={loading}
                        defaultPageSize={8}
                        showTopPagination={false}
                        searchPlaceholder="Search client name or domain..."
                    />
                </div>

            </main>
        </div>
    );
}
