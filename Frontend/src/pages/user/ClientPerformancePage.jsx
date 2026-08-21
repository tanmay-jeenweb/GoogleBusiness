import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";

// Color palette for Donut Slices & Legend
const DONUT_COLORS = [
    "#3b82f6", // blue-500
    "#6366f1", // indigo-500
    "#10b981", // emerald-500
    "#06b6d4", // cyan-500
    "#a855f7", // purple-500
    "#f59e0b", // amber-500
    "#ec4899", // pink-500
    "#64748b"  // slate-500
];

function DonutChart({ items, totalVal, isCurrency }) {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    let accumulatedRatio = 0;

    const formattedTotal = isCurrency
        ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalVal)
        : new Intl.NumberFormat('en-IN').format(totalVal);

    return (
        <div className="relative w-48 h-48 mx-auto flex items-center justify-center my-4">
            <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
                {/* Background Ring */}
                <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="18"
                />
                
                {/* Slices */}
                {items.map((item, idx) => {
                    const ratio = totalVal > 0 ? item.val / totalVal : 0;
                    if (ratio <= 0) return null;

                    const strokeDasharray = `${ratio * circumference} ${circumference}`;
                    const strokeDashoffset = -accumulatedRatio * circumference;
                    accumulatedRatio += ratio;

                    return (
                        <circle
                            key={idx}
                            cx="80"
                            cy="80"
                            r={radius}
                            fill="transparent"
                            stroke={DONUT_COLORS[idx % DONUT_COLORS.length]}
                            strokeWidth="18"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-500 ease-out"
                        />
                    );
                })}
            </svg>

            {/* Donut Center Text */}
            <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">TOTAL</span>
                <span className="text-base font-black text-slate-900 leading-tight">{formattedTotal}</span>
            </div>
        </div>
    );
}

// ─── Linked Domains Cell Component with Floating Dropdown ─────────────────────────
function LinkedDomainsCell({ domains = [] }) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (isOpen && !e.target.closest(`.domains-dropdown-container`)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("click", handleOutsideClick);
        return () => document.removeEventListener("click", handleOutsideClick);
    }, [isOpen]);

    if (!domains || domains.length === 0) {
        return <span className="text-slate-400 font-mono text-xs">No Linked Domains</span>;
    }

    if (domains.length === 1) {
        return (
            <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    1
                </span>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-slate-100 text-slate-800 border border-slate-200 font-bold truncate max-w-[170px]" title={domains[0]}>
                    {domains[0]}
                </span>
            </div>
        );
    }

    const firstDomain = domains[0];
    const remainingCount = domains.length - 1;

    return (
        <div className="relative inline-block text-left domains-dropdown-container">
            <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    {domains.length}
                </span>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-slate-100 text-slate-800 border border-slate-200 font-bold truncate max-w-[140px]" title={firstDomain}>
                    {firstDomain}
                </span>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                    <span>+{remainingCount} more</span>
                    <i className={`fa-solid fa-chevron-down text-[9px] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}></i>
                </button>
            </div>

            {/* Floating Dropdown showing all domains */}
            {isOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                            All {domains.length} Linked Domains
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                        {domains.map((dom, idx) => (
                            <div key={idx} className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                                <i className="fa-solid fa-globe text-[10px] text-blue-500 shrink-0"></i>
                                <span className="text-xs font-mono font-bold text-slate-800 truncate" title={dom}>
                                    {dom}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ClientPerformancePage() {
    const [selectedMonth, setSelectedMonth] = useState("August 2026");
    const [availableMonths, setAvailableMonths] = useState(["August 2026"]);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeShareTab, setActiveShareTab] = useState("revenue"); // "revenue" or "seats"

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

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

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, itemsPerPage]);

    // Filter clients list by search term
    const clientsList = reportData?.clients || [];
    const filteredClients = clientsList.filter(c => 
        (c.client_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.linked_domains || []).some(d => d.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Pagination Calculations
    const totalItems = filteredClients.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentClients = filteredClients.slice(indexOfFirstItem, indexOfLastItem);

    const formatINR = (val) => {
        if (!val || val === 0) return "₹0.00";
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
    };

    const handleExportCSV = () => {
        if (filteredClients.length === 0) {
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
            ...filteredClients.map(c => [
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

        toast.success(`Exported ${filteredClients.length} client rows to CSV`);
    };

    // Donut Share Data Preparation (Fallback to lifetime if selected month revenue is 0)
    const totalMonthRevenue = reportData?.total_month_invoiced || 0;
    const totalCommittedSeats = reportData?.committed_seats_count || 0;
    const totalLifetimeRevenue = clientsList.reduce((acc, c) => acc + (c.lifetime_billing || 0), 0);

    const useLifetimeFallback = activeShareTab === "revenue" && totalMonthRevenue === 0;

    const donutItems = activeShareTab === "revenue"
        ? clientsList.map(c => ({ 
            name: c.client_name, 
            val: useLifetimeFallback ? (c.lifetime_billing || 0) : (c.selected_month_invoiced || 0) 
          }))
        : clientsList.map(c => ({ name: c.client_name, val: c.active_seats || 0 }));

    const activeTotalVal = activeShareTab === "revenue" 
        ? (useLifetimeFallback ? totalLifetimeRevenue : totalMonthRevenue) 
        : totalCommittedSeats;

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar title="Client Performance" />

            <main className="flex-1 w-full max-w-[96rem] mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Client Performance
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                            Client-Wise Business Report
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Analyze active committed seats and revenue performance distribution by Client
                        </p>
                    </div>

                    <button
                        onClick={handleExportCSV}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto"
                    >
                        <i className="fa-solid fa-file-excel text-sm"></i>
                        Export Client CSV ({filteredClients.length})
                    </button>
                </div>

                {/* 4 TOP KPI SUMMARY CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Selected Month</span>
                            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">{selectedMonth}</span>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                            <i className="fa-regular fa-calendar"></i>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Managed Clients</span>
                            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">{reportData?.managed_clients_count || 0} Clients</span>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                            <i className="fa-solid fa-users-rectangle"></i>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Associated Domains</span>
                            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">{reportData?.associated_domains_count || 0} Domains</span>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-lg">
                            <i className="fa-solid fa-globe"></i>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Committed Seats</span>
                            <span className="text-2xl font-black text-emerald-700 font-mono mt-1 block">{reportData?.committed_seats_count || 0} Seats</span>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                            <i className="fa-solid fa-chair"></i>
                        </div>
                    </div>
                </div>

                {/* CONTROLS BAR: Search & Month Selector */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* SEARCH INPUT */}
                    <div className="relative flex-1 min-w-[240px]">
                        <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input
                            type="text"
                            placeholder="Search report by Client name or domain..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        
                        {/* SELECT MONTH */}
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                <i className="fa-solid fa-calendar text-blue-600"></i> Select Month:
                            </span>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none cursor-pointer"
                            >
                                {availableMonths.map((m, idx) => (
                                    <option key={idx} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>

                        {/* Rows Per Page */}
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                            >
                                <option value={10}>10 / page</option>
                                <option value={20}>20 / page</option>
                                <option value={50}>50 / page</option>
                                <option value={100}>100 / page</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 2-COLUMN SIDE-BY-SIDE LAYOUT: DATATABLE (LEFT) + CLIENT SHARE BREAKDOWN DONUT CARD (RIGHT) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    
                    {/* LEFT COLUMN: CLIENT PERFORMANCE DATATABLE (lg:col-span-2) */}
                    <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                                        <th className="py-4 px-6 min-w-[160px]">Client Name <i className="fa-solid fa-arrows-up-down text-[10px] text-slate-400 ml-1"></i></th>
                                        <th className="py-4 px-6 min-w-[260px]">Linked Domains <i className="fa-solid fa-arrows-up-down text-[10px] text-slate-400 ml-1"></i></th>
                                        <th className="py-4 px-4 text-center min-w-[110px]">Active Seats <i className="fa-solid fa-arrows-up-down text-[10px] text-slate-400 ml-1"></i></th>
                                        <th className="py-4 px-6 text-right font-black text-indigo-700 bg-indigo-50/40 min-w-[160px]">
                                            Selected Month Invoiced <i className="fa-solid fa-arrow-down-long text-[10px] text-indigo-600 ml-1"></i>
                                        </th>
                                        <th className="py-4 px-6 text-right font-black text-slate-800 min-w-[150px]">Lifetime Billing <i className="fa-solid fa-arrows-up-down text-[10px] text-slate-400 ml-1"></i></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="py-16 text-center text-slate-400">
                                                <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-blue-600 block"></i>
                                                Calculating client performance report...
                                            </td>
                                        </tr>
                                    ) : currentClients.length > 0 ? (
                                        currentClients.map((client, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                                
                                                {/* Client Name */}
                                                <td className="py-3.5 px-6 font-extrabold text-slate-900 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                                                            {client.client_name ? client.client_name[0].toUpperCase() : "C"}
                                                        </div>
                                                        <span>{client.client_name}</span>
                                                    </div>
                                                </td>

                                                {/* Linked Domains Cell with Dropdown */}
                                                <td className="py-3.5 px-6 font-medium text-slate-700">
                                                    <LinkedDomainsCell domains={client.linked_domains} />
                                                </td>

                                                {/* Active Seats */}
                                                <td className="py-3.5 px-4 text-center font-bold text-blue-600 font-mono whitespace-nowrap">
                                                    {client.active_seats}
                                                </td>

                                                {/* Selected Month Invoiced */}
                                                <td className="py-3.5 px-6 text-right font-black text-slate-900 font-mono whitespace-nowrap">
                                                    {formatINR(client.selected_month_invoiced)}
                                                </td>

                                                {/* Lifetime Billing */}
                                                <td className="py-3.5 px-6 text-right font-bold text-slate-900 font-mono whitespace-nowrap">
                                                    {formatINR(client.lifetime_billing)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="py-12 text-center text-slate-400">
                                                No client performance records found matching your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* DATATABLE PAGINATION FOOTER */}
                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-xs text-slate-500 font-semibold">
                                Showing <span className="font-bold text-slate-800">{totalItems > 0 ? indexOfFirstItem + 1 : 0}</span> to <span className="font-bold text-slate-800">{Math.min(indexOfLastItem, totalItems)}</span> of <span className="font-bold text-slate-800">{totalItems}</span> clients
                            </div>

                            {/* Pagination Page Buttons */}
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                        currentPage === 1
                                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 cursor-pointer"
                                    }`}
                                >
                                    Previous
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                                    .map((page, idx, arr) => {
                                        const prevPage = arr[idx - 1];
                                        const showEllipsis = prevPage && page - prevPage > 1;

                                        return (
                                            <React.Fragment key={page}>
                                                {showEllipsis && <span className="px-1 text-slate-400 text-xs font-bold">...</span>}
                                                <button
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`w-8 h-8 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                                                        currentPage === page
                                                            ? "bg-blue-600 text-white shadow-xs"
                                                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                                                    }`}
                                                >
                                                    {page}
                                                </button>
                                            </React.Fragment>
                                        );
                                    })
                                }

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                        currentPage === totalPages || totalPages === 0
                                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 cursor-pointer"
                                    }`}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: CLIENT SHARE BREAKDOWN DONUT CARD (lg:col-span-1) */}
                    <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between h-full min-h-[420px]">
                        <div>
                            {/* Card Header with Clock Icon & Toggle Pills */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                                        <i className="fa-regular fa-clock"></i>
                                    </div>
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                        Client Share Breakdown
                                    </h3>
                                </div>

                                {/* Toggle Pills: Revenue | Seats */}
                                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                                    <button
                                        onClick={() => setActiveShareTab("revenue")}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                                            activeShareTab === "revenue"
                                                ? "bg-white text-blue-700 shadow-2xs"
                                                : "text-slate-500 hover:text-slate-800"
                                        }`}
                                    >
                                        Revenue
                                    </button>
                                    <button
                                        onClick={() => setActiveShareTab("seats")}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                                            activeShareTab === "seats"
                                                ? "bg-white text-indigo-700 shadow-2xs"
                                                : "text-slate-500 hover:text-slate-800"
                                        }`}
                                    >
                                        Seats
                                    </button>
                                </div>
                            </div>

                            {/* DONUT CHART */}
                            <DonutChart
                                items={donutItems}
                                totalVal={activeTotalVal}
                                isCurrency={activeShareTab === "revenue"}
                            />
                        </div>

                        {/* BOTTOM LEGEND LIST */}
                        <div className="pt-4 border-t border-slate-100 space-y-2 max-h-48 overflow-y-auto">
                            {donutItems.map((item, idx) => {
                                const pct = activeTotalVal > 0 ? ((item.val / activeTotalVal) * 100).toFixed(1) : 0;
                                const dotColor = DONUT_COLORS[idx % DONUT_COLORS.length];

                                const valStr = activeShareTab === "revenue"
                                    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(item.val)
                                    : `${item.val} Seats`;

                                return (
                                    <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                                        <div className="flex items-center gap-2 truncate pr-2">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }}></span>
                                            <span className="text-slate-800 font-extrabold truncate">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 font-mono text-slate-700 shrink-0">
                                            <span className="font-bold">{valStr}</span>
                                            <span className="text-slate-400 text-[11px]">({pct}%)</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                    </div>

                </div>

            </main>
        </div>
    );
}
