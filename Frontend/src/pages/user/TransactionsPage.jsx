import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import { fetchTransactions } from "../../api/uploadApi";
import { formatStandardDate } from "../../utils/dateFormatter";

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortAsc, setSortAsc] = useState(false);
    const [companyFilter, setCompanyFilter] = useState("all"); // 'all' | 'jeenweb' | 'satvaweb'
    const [selectedMonth, setSelectedMonth] = useState("all"); // 'all' | 'August 2026' | etc.
    const [availableMonths, setAvailableMonths] = useState([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const loadTransactions = async () => {
        try {
            setLoading(true);
            const res = await fetchTransactions(companyFilter);
            if (res.data?.success) {
                const txns = res.data.transactions || [];
                setTransactions(txns);

                // Extract unique billing months dynamically
                const monthSet = new Set();
                txns.forEach(t => {
                    const bMonth = t.billing_month || (t.date ? formatStandardDate(t.date) : null);
                    if (bMonth && bMonth !== "N/A") {
                        monthSet.add(bMonth);
                    }
                });
                setAvailableMonths(Array.from(monthSet));
            } else {
                setTransactions([]);
                setAvailableMonths([]);
            }
        } catch (error) {
            console.error("Error fetching transactions from MySQL:", error);
            setTransactions([]);
            setAvailableMonths([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTransactions();
    }, [companyFilter]);

    // Reset pagination to page 1 when filter/search/sort changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, companyFilter, selectedMonth, sortAsc, itemsPerPage]);

    // Filter & Sort logic
    const filteredTransactions = transactions.filter(t => {
        const matchesSearch =
            (t.domain?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (t.customer_id?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (t.order_number?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (t.product?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (t.plan_type?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (t.activity_category?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (t.seller_company?.toLowerCase() || "").includes(searchTerm.toLowerCase());

        const rowMonth = t.billing_month || (t.date ? formatStandardDate(t.date) : "");
        const matchesMonth = selectedMonth === "all" || rowMonth.toLowerCase().includes(selectedMonth.toLowerCase());

        return matchesSearch && matchesMonth;
    }).sort((a, b) => {
        const dateA = new Date(a.date).getTime() || 0;
        const dateB = new Date(b.date).getTime() || 0;
        return sortAsc ? dateA - dateB : dateB - dateA;
    });

    // Pagination calculations
    const totalItems = filteredTransactions.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentTransactions = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);

    // Export to Excel (.csv / .xls) with all filtered rows
    const handleExportExcel = () => {
        if (filteredTransactions.length === 0) {
            toast.error("No transactions available to export");
            return;
        }

        const headers = ["ID", "Seller Company", "Date", "Billing Month", "Activity Category", "Plan Type", "Product", "Domain Name", "Customer ID", "Seats", "Amount (INR)", "Order Number", "Description"];

        const csvRows = [
            headers.join(","),
            ...filteredTransactions.map(t => [
                t.id,
                `"${t.seller_company || ''}"`,
                `"${formatStandardDate(t.date) || ''}"`,
                `"${t.billing_month || ''}"`,
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
        link.setAttribute("download", `Transactions_${selectedMonth === "all" ? "All_Months" : selectedMonth.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Exported ${filteredTransactions.length} transactions to CSV`);
    };

    // Calculate Summary Metrics for current filtered view
    const totalAmountSum = filteredTransactions.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    const totalSeatsSum = filteredTransactions.reduce((acc, curr) => acc + (parseInt(curr.seats) || 0), 0);

    const formatINR = (val) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar title="Transaction Section" />

            <main className="flex-1 w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
                
                {/* Top Header & Export Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                Ingested Records
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            Transaction Section
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Detailed transaction audit log from JeenWeb & SatvaWeb uploaded activities
                        </p>
                    </div>

                    <button
                        onClick={handleExportExcel}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto"
                    >
                        <i className="fa-solid fa-file-excel text-sm"></i>
                        Export Filtered CSV ({filteredTransactions.length})
                    </button>
                </div>

                {/* Summary Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Transactions</span>
                            <span className="text-xl font-extrabold text-slate-900 font-mono mt-0.5 block">{totalItems} records</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <i className="fa-solid fa-receipt"></i>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Amount</span>
                            <span className="text-xl font-extrabold text-emerald-700 font-mono mt-0.5 block">{formatINR(totalAmountSum)}</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <i className="fa-solid fa-indian-rupee-sign"></i>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Seats Total</span>
                            <span className="text-xl font-extrabold text-indigo-700 font-mono mt-0.5 block">{totalSeatsSum} Seats</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <i className="fa-solid fa-users"></i>
                        </div>
                    </div>
                </div>

                {/* Controls Bar: Search, Billing Month Filter, Company Pills & Rows Selector */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* SEARCH INPUT */}
                    <div className="relative flex-1 min-w-[240px]">
                        <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input
                            type="text"
                            placeholder="Search by domain, order number, SKU, customer ID..."
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
                        {/* DYNAMIC BILLING MONTH FILTER */}
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

                        {/* Sorting & Rows Per Page Controls */}
                        <div className="flex items-center gap-2">
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

                            <button
                                type="button"
                                onClick={() => setSortAsc(!sortAsc)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                                <span>Date</span>
                                <i className={`fa-solid ${sortAsc ? "fa-arrow-up-1-9" : "fa-arrow-down-9-1"} text-blue-600`}></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* DATA TABLE */}
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
                                    <th className="py-3.5 px-4">Reseller</th>
                                    <th className="py-3.5 px-4">Activity Category</th>
                                    <th className="py-3.5 px-4">Plan Type</th>
                                    <th className="py-3.5 px-4">Product</th>
                                    <th className="py-3.5 px-4">Domain</th>
                                    <th className="py-3.5 px-4 font-mono">Customer ID</th>
                                    <th className="py-3.5 px-4 text-center">Seats</th>
                                    <th className="py-3.5 px-4 text-right">Amount (INR)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" className="py-12 text-center text-slate-400">
                                            <i className="fa-solid fa-circle-notch fa-spin text-xl mb-2 text-blue-600 block"></i>
                                            Loading transactions from MySQL...
                                        </td>
                                    </tr>
                                ) : currentTransactions.length > 0 ? (
                                    currentTransactions.map((row, idx) => (
                                        <tr key={`${row.seller_company}_${row.id || idx}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                            
                                            {/* 1. Date */}
                                            <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                                                {formatStandardDate(row.date)}
                                            </td>

                                            {/* 2. Reseller Company */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                                    (row.seller_company || "").toLowerCase().includes("satva")
                                                        ? "bg-purple-50 text-purple-700 border-purple-200"
                                                        : "bg-sky-50 text-sky-700 border-sky-200"
                                                }`}>
                                                    {row.seller_company || "JeenWeb"}
                                                </span>
                                            </td>

                                            {/* 3. Activity Category */}
                                            <td className="py-3.5 px-4 font-bold text-slate-900 capitalize whitespace-nowrap">
                                                {row.activity_category}
                                            </td>

                                            {/* 4. Plan Type / SKU */}
                                            <td className="py-3.5 px-4 text-slate-600 font-semibold max-w-[180px] truncate" title={row.plan_type}>
                                                {row.plan_type}
                                            </td>

                                            {/* 5. Product */}
                                            <td className="py-3.5 px-4 text-slate-500 font-medium">
                                                {row.product || "Google Workspace"}
                                            </td>

                                            {/* 6. Domain Name */}
                                            <td className="py-3.5 px-4 font-extrabold text-blue-700 whitespace-nowrap">
                                                {row.domain}
                                            </td>

                                            {/* 7. Customer ID */}
                                            <td className="py-3.5 px-4 font-mono font-bold text-slate-600 whitespace-nowrap">
                                                {row.customer_id}
                                            </td>

                                            {/* 8. Seats */}
                                            <td className="py-3.5 px-4 text-center font-extrabold text-slate-900 font-mono">
                                                {row.seats}
                                            </td>

                                            {/* 9. Amount (INR) */}
                                            <td className="py-3.5 px-4 text-right font-extrabold text-emerald-700 font-mono whitespace-nowrap">
                                                {formatINR(row.amount)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="py-12 text-center text-slate-400">
                                            No transactions match your search filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* DATATABLE PAGINATION FOOTER */}
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-xs text-slate-500 font-semibold">
                            Showing <span className="font-bold text-slate-800">{totalItems > 0 ? indexOfFirstItem + 1 : 0}</span> to <span className="font-bold text-slate-800">{Math.min(indexOfLastItem, totalItems)}</span> of <span className="font-bold text-slate-800">{totalItems}</span> transactions
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
