import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import { fetchTransactions } from "../../api/uploadApi";
import { formatStandardDate } from "../../utils/dateFormatter";

const REPORT_CONFIGS = {
    "increases": {
        title: "Commitment Increases",
        subtitle: "Review seat expansion values across existing contracts",
        eventsLabel: "Increase Events",
        seatsLabel: "Expanded Seats",
        billingLabel: "Increase Invoiced Billing",
        icon: "fa-solid fa-chart-line-up",
        matchKeyword: "increase"
    },
    "renewals": {
        title: "Commitment Renewals",
        subtitle: "Review contract renewals and seat commitments",
        eventsLabel: "Renewal Events",
        seatsLabel: "Renewed Seats",
        billingLabel: "Renewal Invoiced Billing",
        icon: "fa-solid fa-[#0056cf] fa-arrows-rotate",
        matchKeyword: "renewal"
    },
    "new-commitments": {
        title: "New Commitments",
        subtitle: "Review newly initiated seat commitments and subscriptions",
        eventsLabel: "New Commitment Events",
        seatsLabel: "New Committed Seats",
        billingLabel: "New Commitment Invoiced Billing",
        icon: "fa-solid fa-sparkles",
        matchKeyword: "new commitment"
    },
    "commitments": {
        title: "Commitments",
        subtitle: "Review active baseline commitments and seat allocations",
        eventsLabel: "Commitment Events",
        seatsLabel: "Committed Seats",
        billingLabel: "Commitment Invoiced Billing",
        icon: "fa-solid fa-file-contract",
        matchKeyword: "commitment"
    },
    "usage": {
        title: "Usage-Based Billing",
        subtitle: "Review flexible usage billing and pay-as-you-go consumption",
        eventsLabel: "Usage Events",
        seatsLabel: "Active Usage Seats",
        billingLabel: "Usage Invoiced Billing",
        icon: "fa-solid fa-bolt",
        matchKeyword: "usage"
    }
};

export default function ActivityReportPage({ reportType: propReportType }) {
    const params = useParams();
    const location = useLocation();

    // Determine report type from prop, params, or URL pathname
    let typeKey = propReportType || params.type;
    if (!typeKey) {
        const path = location.pathname.toLowerCase();
        if (path.includes("increase")) typeKey = "increases";
        else if (path.includes("renewal")) typeKey = "renewals";
        else if (path.includes("new-commitment")) typeKey = "new-commitments";
        else if (path.includes("commitment")) typeKey = "commitments";
        else if (path.includes("usage")) typeKey = "usage";
        else typeKey = "increases";
    }

    const config = REPORT_CONFIGS[typeKey] || REPORT_CONFIGS["increases"];

    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortAsc, setSortAsc] = useState(false);
    const [companyFilter, setCompanyFilter] = useState("all");
    const [selectedMonth, setSelectedMonth] = useState("all");
    const [selectedPlan, setSelectedPlan] = useState("all");
    const [availableMonths, setAvailableMonths] = useState([]);
    const [availablePlans, setAvailablePlans] = useState([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchTransactions(companyFilter);
            if (res.data?.success) {
                const txns = res.data.transactions || [];
                setTransactions(txns);

                // Extract available billing months and SKU plans
                const monthSet = new Set();
                const planSet = new Set();

                txns.forEach(t => {
                    const bMonth = t.billing_month || (t.date ? formatStandardDate(t.date) : null);
                    if (bMonth && bMonth !== "N/A") monthSet.add(bMonth);
                    if (t.plan_type && t.plan_type !== "N/A") planSet.add(t.plan_type);
                });

                setAvailableMonths(Array.from(monthSet));
                setAvailablePlans(Array.from(planSet));
            } else {
                setTransactions([]);
                setAvailableMonths([]);
                setAvailablePlans([]);
            }
        } catch (error) {
            console.error("Error loading report transactions:", error);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [companyFilter, typeKey]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, companyFilter, selectedMonth, selectedPlan, sortAsc, itemsPerPage, typeKey]);

    // Filter Logic for Specific Report Type
    const filteredReportTransactions = transactions.filter(t => {
        const fullText = (t.description + " " + (t.activity_category || "") + " " + (t.commitment_type || "")).toLowerCase();
        const kw = config.matchKeyword;

        let matchesType = false;
        if (kw === "increases" || kw === "increase") {
            matchesType = fullText.includes("increase");
        } else if (kw === "renewals" || kw === "renewal") {
            matchesType = fullText.includes("renewal");
        } else if (kw === "new commitment") {
            matchesType = fullText.includes("new commitment") || fullText.includes("new account");
        } else if (kw === "usage") {
            matchesType = fullText.includes("usage") || fullText.includes("flex");
        } else if (kw === "commitment") {
            matchesType = fullText.includes("commitment") && !fullText.includes("increase") && !fullText.includes("renewal") && !fullText.includes("new commitment");
        } else {
            matchesType = fullText.includes(kw);
        }

        if (!matchesType) return false;

        // Search Filter
        const matchesSearch =
            (t.domain?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (t.customer_id?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (t.order_number?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (t.product?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (t.plan_type?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (t.activity_category?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (t.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());

        // Month Filter
        const rowMonth = t.billing_month || (t.date ? formatStandardDate(t.date) : "");
        const matchesMonth = selectedMonth === "all" || rowMonth.toLowerCase().includes(selectedMonth.toLowerCase());

        // Plan Filter
        const matchesPlan = selectedPlan === "all" || (t.plan_type || "").toLowerCase().includes(selectedPlan.toLowerCase());

        return matchesSearch && matchesMonth && matchesPlan;
    }).sort((a, b) => {
        const dateA = new Date(a.date).getTime() || 0;
        const dateB = new Date(b.date).getTime() || 0;
        return sortAsc ? dateA - dateB : dateB - dateA;
    });

    // Pagination calculations
    const totalItems = filteredReportTransactions.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentReportTransactions = filteredReportTransactions.slice(indexOfFirstItem, indexOfLastItem);

    // Summary KPI Calculations
    const totalEventsCount = filteredReportTransactions.length;
    const totalSeatsSum = filteredReportTransactions.reduce((acc, curr) => acc + (parseInt(curr.seats) || 0), 0);
    const totalAmountSum = filteredReportTransactions.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    const formatINR = (val) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
    };

    const handleExportCSV = () => {
        if (filteredReportTransactions.length === 0) {
            toast.error("No report data available to export");
            return;
        }

        const headers = ["Date", "Activity Category", "Plan Type", "Product", "Domain Name", "Customer ID", "Seats", "Amount (INR)", "Order Number", "Full Description"];

        const csvRows = [
            headers.join(","),
            ...filteredReportTransactions.map(t => [
                `"${formatStandardDate(t.date) || ''}"`,
                `"${t.activity_category || ''}"`,
                `"${t.plan_type || ''}"`,
                `"${t.product || ''}"`,
                `"${t.domain || ''}"`,
                `"${t.customer_id || ''}"`,
                t.seats || 1,
                t.amount || 0,
                `"${t.order_number || ''}"`,
                `"${(t.description || '').replace(/"/g, '""')}"`
            ].join(","))
        ];

        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `Report_${typeKey}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Exported ${filteredReportTransactions.length} report rows to CSV`);
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar title={`Activity Reports - ${config.title}`} />

            <main className="flex-1 w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
                
                {/* Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Activity Report
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                            {config.title}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            {config.subtitle}
                        </p>
                    </div>

                    <button
                        onClick={handleExportCSV}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto"
                    >
                        <i className="fa-solid fa-file-excel text-sm"></i>
                        Export CSV ({filteredReportTransactions.length})
                    </button>
                </div>

                {/* 3 TOP KPI SUMMARY CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Card 1: Events Count */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{config.eventsLabel}</span>
                            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">{totalEventsCount}</span>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                            <i className="fa-solid fa-list-check"></i>
                        </div>
                    </div>

                    {/* Card 2: Expanded / Total Seats */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{config.seatsLabel}</span>
                            <span className="text-2xl font-black text-indigo-700 font-mono mt-1 block">{totalSeatsSum} Seats</span>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                            <i className="fa-solid fa-users"></i>
                        </div>
                    </div>

                    {/* Card 3: Invoiced Billing */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{config.billingLabel}</span>
                            <span className="text-2xl font-black text-emerald-700 font-mono mt-1 block">{formatINR(totalAmountSum)}</span>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                            <i className="fa-solid fa-indian-rupee-sign"></i>
                        </div>
                    </div>
                </div>

                {/* CONTROLS BAR: Filters, Search, Reseller Pills & Page Selector */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* SEARCH INPUT */}
                    <div className="relative flex-1 min-w-[240px]">
                        <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input
                            type="text"
                            placeholder="Search this report by domain, customer ID, or order number..."
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
                        
                        {/* PLAN TYPE FILTER */}
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                <i className="fa-solid fa-layer-group text-indigo-600"></i> Plan:
                            </span>
                            <select
                                value={selectedPlan}
                                onChange={(e) => setSelectedPlan(e.target.value)}
                                className="bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none cursor-pointer"
                            >
                                <option value="all">All Plans</option>
                                {availablePlans.map((p, idx) => (
                                    <option key={idx} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>

                        {/* SELECT MONTH FILTER */}
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                <i className="fa-regular fa-calendar-days text-blue-600"></i> Month:
                            </span>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none cursor-pointer"
                            >
                                <option value="all">All Months</option>
                                {availableMonths.map((m, idx) => (
                                    <option key={idx} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>

                        {/* COMPANY FILTER PILLS */}
                        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                            <button
                                type="button"
                                onClick={() => setCompanyFilter("all")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    companyFilter === "all"
                                        ? "bg-white text-slate-900 shadow-xs"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                All Resellers
                            </button>
                            <button
                                type="button"
                                onClick={() => setCompanyFilter("jeenweb")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    companyFilter === "jeenweb"
                                        ? "bg-sky-600 text-white shadow-xs"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                JeenWeb
                            </button>
                            <button
                                type="button"
                                onClick={() => setCompanyFilter("satvaweb")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    companyFilter === "satvaweb"
                                        ? "bg-purple-600 text-white shadow-xs"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                SatvaWeb
                            </button>
                        </div>

                        {/* Rows Per Page */}
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                            >
                                <option value={10}>10 / page</option>
                                <option value={25}>25 / page</option>
                                <option value={50}>50 / page</option>
                                <option value={100}>100 / page</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* FULL REPORT DATATABLE */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                                    <th className="py-3.5 px-4 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setSortAsc(!sortAsc)}>
                                        <div className="flex items-center gap-1.5">
                                            <span>Date</span>
                                            <i className={`fa-solid ${sortAsc ? "fa-sort-up" : "fa-sort-down"} text-blue-600`}></i>
                                        </div>
                                    </th>
                                    <th className="py-3.5 px-4">Activity Category</th>
                                    <th className="py-3.5 px-4">Plan Type</th>
                                    <th className="py-3.5 px-4">Product</th>
                                    <th className="py-3.5 px-4">Domain</th>
                                    <th className="py-3.5 px-4 font-mono">Customer ID</th>
                                    <th className="py-3.5 px-4 text-center">Seats</th>
                                    <th className="py-3.5 px-4 text-right">Amount (INR)</th>
                                    <th className="py-3.5 px-4 font-mono">Order Number</th>
                                    <th className="py-3.5 px-4 min-w-[220px]">Full Description</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {loading ? (
                                    <tr>
                                        <td colSpan="10" className="py-12 text-center text-slate-400">
                                            <i className="fa-solid fa-circle-notch fa-spin text-xl mb-2 text-blue-600 block"></i>
                                            Loading {config.title} report from MySQL...
                                        </td>
                                    </tr>
                                ) : currentReportTransactions.length > 0 ? (
                                    currentReportTransactions.map((row, idx) => (
                                        <tr key={`${row.seller_company}_${row.id || idx}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                            
                                            {/* 1. Date */}
                                            <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                                                {formatStandardDate(row.date)}
                                            </td>

                                            {/* 2. Activity Category */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                                                    {row.activity_category}
                                                </span>
                                            </td>

                                            {/* 3. Plan Type / SKU */}
                                            <td className="py-3.5 px-4 text-slate-700 font-semibold max-w-[180px] truncate" title={row.plan_type}>
                                                {row.plan_type}
                                            </td>

                                            {/* 4. Product */}
                                            <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">
                                                {row.product || "Google Workspace"}
                                            </td>

                                            {/* 5. Domain Name */}
                                            <td className="py-3.5 px-4 font-extrabold text-blue-700 whitespace-nowrap">
                                                {row.domain}
                                            </td>

                                            {/* 6. Customer ID */}
                                            <td className="py-3.5 px-4 font-mono font-bold text-slate-600 whitespace-nowrap">
                                                {row.customer_id}
                                            </td>

                                            {/* 7. Seats */}
                                            <td className="py-3.5 px-4 text-center font-extrabold text-slate-900 font-mono">
                                                {row.seats}
                                            </td>

                                            {/* 8. Amount (INR) */}
                                            <td className="py-3.5 px-4 text-right font-extrabold text-emerald-700 font-mono whitespace-nowrap">
                                                {formatINR(row.amount)}
                                            </td>

                                            {/* 9. Order Number */}
                                            <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                                                {row.order_number}
                                            </td>

                                            {/* 10. Full Description */}
                                            <td className="py-3.5 px-4 text-slate-600 text-[11px] max-w-[320px] truncate" title={row.description}>
                                                {row.description}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="10" className="py-12 text-center text-slate-400">
                                            No {config.title.toLowerCase()} records match your filter criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* DATATABLE PAGINATION FOOTER */}
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-xs text-slate-500 font-semibold">
                            Showing <span className="font-bold text-slate-800">{totalItems > 0 ? indexOfFirstItem + 1 : 0}</span> to <span className="font-bold text-slate-800">{Math.min(indexOfLastItem, totalItems)}</span> of <span className="font-bold text-slate-800">{totalItems}</span> records
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

                            {/* Page numbers */}
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

            </main>
        </div>
    );
}
