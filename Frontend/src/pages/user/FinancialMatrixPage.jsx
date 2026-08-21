import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";

export default function FinancialMatrixPage() {
    const [matrixData, setMatrixData] = useState({ month_names: [], rows: [], month_totals: [], grand_total: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [planFilter, setPlanFilter] = useState("all"); // 'all' | 'starter' | 'standard'
    const [selectedYear, setSelectedYear] = useState("2026");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const loadMatrixData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const res = await axios.get(`http://localhost:5000/api/dashboard/annual-matrix?year=${selectedYear}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.success) {
                setMatrixData(res.data.matrix || { month_names: [], rows: [], month_totals: [], grand_total: 0 });
            }
        } catch (error) {
            console.error("Error fetching financial matrix:", error);
            toast.error("Failed to load annual financial matrix");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMatrixData();
    }, [selectedYear]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, planFilter, itemsPerPage]);

    // Filter rows by plan and domain search term
    const filteredRows = matrixData.rows.filter(row => {
        const matchesDomain = (row.domain_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (row.customer_id || "").toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchesPlan = true;
        if (planFilter === "starter") {
            matchesPlan = (row.plan_name || "").toLowerCase().includes("starter");
        } else if (planFilter === "standard") {
            matchesPlan = (row.plan_name || "").toLowerCase().includes("standard");
        }

        return matchesDomain && matchesPlan;
    });

    // Compute domain group map for alternating domain background colors
    const domainGroupIndexMap = new Map();
    let currentDomainCount = 0;
    filteredRows.forEach(row => {
        const d = row.domain_name.toLowerCase();
        if (!domainGroupIndexMap.has(d)) {
            domainGroupIndexMap.set(d, currentDomainCount);
            currentDomainCount++;
        }
    });

    // Pagination Calculations
    const totalItems = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRows = filteredRows.slice(indexOfFirstItem, indexOfLastItem);

    // Calculate dynamic column totals for filtered view
    const filteredMonthTotals = Array(12).fill(0);
    let filteredGrandTotal = 0;

    filteredRows.forEach(row => {
        row.months.forEach((m, idx) => {
            filteredMonthTotals[idx] += (m.amount || 0);
        });
        filteredGrandTotal += (row.total || 0);
    });

    const formatINR = (val) => {
        if (!val || val === 0) return "-";
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
    };

    const handleExportCSV = () => {
        if (filteredRows.length === 0) {
            toast.error("No matrix data to export");
            return;
        }

        const months = matrixData.month_names.length > 0 ? matrixData.month_names : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const headers = ["Domain Name", "Customer ID", "Plan Name", ...months, "Annual Total (INR)"];

        const csvRows = [
            headers.join(","),
            ...filteredRows.map(r => [
                `"${r.domain_name}"`,
                `"${r.customer_id}"`,
                `"${r.plan_name}"`,
                ...r.months.map(m => m.amount || 0),
                r.total || 0
            ].join(","))
        ];

        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `Financial_Matrix_${selectedYear}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Exported ${filteredRows.length} matrix rows to CSV`);
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar title="Financial Matrix" />

            <main className="flex-1 w-full max-w-[96rem] mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
                
                {/* Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                12-Month Billing Grid
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                            Financial Matrix Dashboard
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Annual domain billing matrix across 12 months with active plan breakdown and alternating domain group shading
                        </p>
                    </div>

                    <button
                        onClick={handleExportCSV}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto"
                    >
                        <i className="fa-solid fa-file-excel text-sm"></i>
                        Export Matrix CSV ({filteredRows.length})
                    </button>
                </div>

                {/* 3 TOP KPI SUMMARY CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Customer Domains</span>
                            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">{domainGroupIndexMap.size} Domains ({filteredRows.length} Rows)</span>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                            <i className="fa-solid fa-table-cells"></i>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Annual Invoiced Total</span>
                            <span className="text-2xl font-black text-emerald-700 font-mono mt-1 block">{formatINR(filteredGrandTotal)}</span>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                            <i className="fa-solid fa-indian-rupee-sign"></i>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Selected Calendar Year</span>
                            <span className="text-2xl font-black text-indigo-700 font-mono mt-1 block">{selectedYear}</span>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                            <i className="fa-regular fa-calendar"></i>
                        </div>
                    </div>
                </div>

                {/* CONTROLS BAR: Search, Plan Selector, Year Selector & Rows Selector */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* SEARCH INPUT */}
                    <div className="relative flex-1 min-w-[240px]">
                        <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input
                            type="text"
                            placeholder="Search matrix by domain name or customer ID..."
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
                        
                        {/* PLAN FILTER DROPDOWN */}
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                <i className="fa-solid fa-layer-group text-indigo-600"></i> Plan:
                            </span>
                            <select
                                value={planFilter}
                                onChange={(e) => setPlanFilter(e.target.value)}
                                className="bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none cursor-pointer"
                            >
                                <option value="all">All Plans</option>
                                <option value="starter">Business Starter</option>
                                <option value="standard">Business Standard</option>
                            </select>
                        </div>

                        {/* YEAR SELECTOR */}
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                <i className="fa-solid fa-calendar text-blue-600"></i> Year:
                            </span>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none cursor-pointer"
                            >
                                <option value="2026">2026</option>
                                <option value="2025">2025</option>
                                <option value="2024">2024</option>
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

                {/* 12-MONTH MATRIX DATATABLE */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-100/90 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                                    <th className="py-3.5 px-4 min-w-[180px] sticky left-0 bg-slate-100 shadow-xs z-10">Domain Name</th>
                                    <th className="py-3.5 px-4 min-w-[200px]">Plan Name</th>
                                    {(matrixData.month_names.length > 0 ? matrixData.month_names : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]).map((m, idx) => (
                                        <th key={idx} className="py-3.5 px-3 text-center min-w-[75px] font-black text-slate-800">
                                            {m}
                                        </th>
                                    ))}
                                    <th className="py-3.5 px-4 text-right min-w-[130px] font-black text-emerald-800 bg-emerald-50/50">
                                        Domain Total
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/60 text-xs">
                                {loading ? (
                                    <tr>
                                        <td colSpan="15" className="py-16 text-center text-slate-400">
                                            <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-blue-600 block"></i>
                                            Calculating 12-Month Financial Matrix...
                                        </td>
                                    </tr>
                                ) : currentRows.length > 0 ? (
                                    currentRows.map((row, idx) => {
                                        const domainIdx = domainGroupIndexMap.get(row.domain_name.toLowerCase()) || 0;
                                        const isEvenDomain = domainIdx % 2 === 0;

                                        const rowBgClass = isEvenDomain ? "bg-slate-100/60 hover:bg-slate-100" : "bg-white hover:bg-slate-50";
                                        const stickyBgClass = isEvenDomain ? "bg-slate-100" : "bg-white";

                                        // Check if next row belongs to a different domain to draw a prominent border
                                        const nextRow = currentRows[idx + 1];
                                        const isLastRowOfDomain = !nextRow || nextRow.domain_name.toLowerCase() !== row.domain_name.toLowerCase();

                                        return (
                                            <tr 
                                                key={`${row.domain_name}_${row.plan_name}_${idx}`} 
                                                className={`${rowBgClass} transition-colors ${isLastRowOfDomain ? "border-b-2 border-slate-300/80" : ""}`}
                                            >
                                                
                                                {/* 1. Domain Name */}
                                                <td className={`py-3.5 px-4 font-extrabold text-blue-700 whitespace-nowrap sticky left-0 ${stickyBgClass} shadow-xs z-10`}>
                                                    {row.domain_name}
                                                </td>

                                                {/* 2. Plan Name */}
                                                <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                                                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                                                        row.plan_name.includes("Standard")
                                                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                            : "bg-sky-50 text-sky-700 border-sky-200"
                                                    }`}>
                                                        {row.plan_name}
                                                    </span>
                                                </td>

                                                {/* 3 to 14. 12 Month Cells */}
                                                {row.months.map((m, mIdx) => (
                                                    <td key={mIdx} className="py-3.5 px-2 text-center whitespace-nowrap">
                                                        {m.paid ? (
                                                            <span className="px-2 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs block">
                                                                {formatINR(m.amount)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 font-semibold text-[11px]">
                                                                -
                                                            </span>
                                                        )}
                                                    </td>
                                                ))}

                                                {/* 15. Domain Row Total */}
                                                <td className="py-3.5 px-4 text-right font-black text-emerald-700 font-mono whitespace-nowrap bg-emerald-50/40">
                                                    {formatINR(row.total)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="15" className="py-12 text-center text-slate-400">
                                            No domain matrix data found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>

                            {/* DATATABLE FOOTER: MONTHLY COLUMN TOTALS & GRAND TOTAL */}
                            {!loading && filteredRows.length > 0 && (
                                <tfoot>
                                    <tr className="border-t-2 border-slate-300 bg-slate-100/90 text-xs font-black text-slate-900">
                                        <td className="py-4 px-4 font-black text-slate-900 uppercase tracking-wider sticky left-0 bg-slate-100 shadow-xs z-10">
                                            Monthly Totals
                                        </td>
                                        <td className="py-4 px-4 font-bold text-slate-500 uppercase tracking-wider">
                                            All Ingested Domains
                                        </td>
                                        {filteredMonthTotals.map((tot, idx) => (
                                            <td key={idx} className="py-4 px-2 text-center font-extrabold text-slate-900 font-mono">
                                                {tot > 0 ? (
                                                    <span className="text-emerald-700 font-black">
                                                        {formatINR(tot)}
                                                    </span>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                        ))}
                                        <td className="py-4 px-4 text-right font-black text-emerald-800 font-mono text-sm bg-emerald-100/60 border-l border-emerald-200">
                                            {formatINR(filteredGrandTotal)}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {/* DATATABLE PAGINATION FOOTER */}
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-xs text-slate-500 font-semibold">
                            Showing <span className="font-bold text-slate-800">{totalItems > 0 ? indexOfFirstItem + 1 : 0}</span> to <span className="font-bold text-slate-800">{Math.min(indexOfLastItem, totalItems)}</span> of <span className="font-bold text-slate-800">{totalItems}</span> matrix rows
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
