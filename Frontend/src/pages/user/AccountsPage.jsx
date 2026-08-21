import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import { fetchAccountsRegistry, fetchAccountDetail } from "../../api/accountApi";
import { formatStandardDate } from "../../utils/dateFormatter";

export default function AccountsPage() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'ACTIVE' | 'SUSPENDED' | 'UNASSIGNED'
    const [sortAsc, setSortAsc] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Domain Detail Drawer State
    const [selectedDomainName, setSelectedDomainName] = useState(null);
    const [accountDetail, setAccountDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const loadAccountsData = async () => {
        try {
            setLoading(true);
            const res = await fetchAccountsRegistry();
            if (res.data?.success) {
                setAccounts(res.data.accounts || []);
            }
        } catch (error) {
            console.error("Error fetching accounts registry:", error);
            toast.error("Failed to load accounts registry from MySQL");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAccountsData();
    }, []);

    // Reset page to 1 when search/filter/sort changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, sortAsc, itemsPerPage]);

    // Open Domain Detail Drawer
    const handleOpenDetail = async (domainName) => {
        try {
            setSelectedDomainName(domainName);
            setLoadingDetail(true);
            const res = await fetchAccountDetail(domainName);
            if (res.data?.success) {
                setAccountDetail(res.data.account);
            }
        } catch (error) {
            console.error("Error fetching account detail:", error);
            toast.error("Failed to load domain analytics");
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleCloseDetail = () => {
        setSelectedDomainName(null);
        setAccountDetail(null);
    };

    // Filter & Sort accounts
    const filteredAccounts = accounts.filter(acc => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
            acc.domain_name.toLowerCase().includes(term) ||
            (acc.customer_id && acc.customer_id.toLowerCase().includes(term)) ||
            (acc.client_name && acc.client_name.toLowerCase().includes(term)) ||
            (acc.sku_plan && acc.sku_plan.toLowerCase().includes(term));

        if (statusFilter === "all") return matchesSearch;
        if (statusFilter === "UNASSIGNED") return matchesSearch && acc.client_name === "Unassigned";
        return matchesSearch && acc.status === statusFilter;
    }).sort((a, b) => {
        return sortAsc ? a.lifetime_billing - b.lifetime_billing : b.lifetime_billing - a.lifetime_billing;
    });

    // Pagination calculations
    const totalAccounts = filteredAccounts.length;
    const totalPages = Math.max(1, Math.ceil(totalAccounts / itemsPerPage));
    const indexOfLastAccount = currentPage * itemsPerPage;
    const indexOfFirstAccount = indexOfLastAccount - itemsPerPage;
    const currentAccounts = filteredAccounts.slice(indexOfFirstAccount, indexOfLastAccount);

    // Format currency INR
    const formatINR = (val) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar title="Accounts Registry" />

            <main className="flex-1 w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                                Domain Accounts & Growth Analytics
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                {accounts.length} Total Accounts Ingested
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            Customer Registry
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Manage unique domain accounts, seats, and aggregate growth calculated from MySQL transactions.
                        </p>
                    </div>
                </div>

                {/* SEARCH & FILTERS TOOLBAR */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    
                    {/* Live Search Input */}
                    <div className="relative w-full md:w-96">
                        <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                        <input
                            type="text"
                            placeholder="Search accounts by domain or customer ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 bg-slate-50/50"
                        />
                    </div>

                    {/* Filters & Rows Per Page Controls */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                        
                        {/* Status Filter */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="font-bold">Status:</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                            >
                                <option value="all">All Statuses</option>
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="SUSPENDED">SUSPENDED</option>
                                <option value="UNASSIGNED">Unassigned Only</option>
                            </select>
                        </div>

                        {/* Rows Per Page */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span>Show:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                            >
                                <option value={10}>10 per page</option>
                                <option value={25}>25 per page</option>
                                <option value={50}>50 per page</option>
                                <option value={100}>100 per page</option>
                            </select>
                        </div>

                        {/* Lifetime Billing Sort */}
                        <button
                            type="button"
                            onClick={() => setSortAsc(!sortAsc)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                            <span>Billing</span>
                            <i className={`fa-solid ${sortAsc ? "fa-arrow-up-1-9" : "fa-arrow-down-9-1"} text-amber-600`}></i>
                        </button>
                    </div>
                </div>

                {/* ACCOUNTS REGISTRY TABLE */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Domain Name</th>
                                    <th className="py-3.5 px-4">Client</th>
                                    <th className="py-3.5 px-4 font-mono">Customer ID</th>
                                    <th className="py-3.5 px-4">Product SKU</th>
                                    <th className="py-3.5 px-4">Payment Plan</th>
                                    <th className="py-3.5 px-4 text-center">Licenses (Assigned/Purchased)</th>
                                    <th className="py-3.5 px-4">Created Date</th>
                                    <th className="py-3.5 px-4 text-right cursor-pointer hover:text-amber-600 transition-colors" onClick={() => setSortAsc(!sortAsc)}>
                                        <div className="flex items-center justify-end gap-1.5">
                                            <span>Lifetime Billing</span>
                                            <i className={`fa-solid ${sortAsc ? "fa-sort-up" : "fa-sort-down"} text-amber-600`}></i>
                                        </div>
                                    </th>
                                    <th className="py-3.5 px-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" className="py-12 text-center text-slate-400">
                                            <i className="fa-solid fa-circle-notch fa-spin text-xl mb-2 text-amber-600 block"></i>
                                            Loading customer registry from MySQL...
                                        </td>
                                    </tr>
                                ) : currentAccounts.length > 0 ? (
                                    currentAccounts.map((acc, idx) => {
                                        const isUnassigned = acc.client_name === "Unassigned";

                                        return (
                                            <tr key={`${acc.domain_name}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                                
                                                {/* Domain Name (Clickable link to open drawer) */}
                                                <td className="py-3.5 px-4 font-bold whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenDetail(acc.domain_name)}
                                                        className="text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1.5 cursor-pointer font-extrabold text-xs"
                                                    >
                                                        <i className="fa-solid fa-globe text-slate-400 text-[11px]"></i>
                                                        {acc.domain_name}
                                                    </button>
                                                </td>

                                                {/* Client Name */}
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                                        isUnassigned
                                                            ? "bg-slate-100 text-slate-500 border-slate-200"
                                                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    }`}>
                                                        {acc.client_name}
                                                    </span>
                                                </td>

                                                {/* Customer ID */}
                                                <td className="py-3.5 px-4 font-mono font-bold text-slate-600 whitespace-nowrap">
                                                    {acc.customer_id}
                                                </td>

                                                {/* Product SKU */}
                                                <td className="py-3.5 px-4 font-medium text-slate-800">
                                                    {acc.sku_plan}
                                                </td>

                                                {/* Payment Plan */}
                                                <td className="py-3.5 px-4 text-slate-600 font-semibold">
                                                    {acc.payment_plan}
                                                </td>

                                                {/* Licenses (Assigned / Purchased) */}
                                                <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                                                    {acc.assigned_seats}/{acc.total_seats}
                                                </td>

                                                {/* Created Date */}
                                                <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                                                    {formatStandardDate(acc.created_date)}
                                                </td>

                                                {/* Lifetime Billing */}
                                                <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 font-mono">
                                                    {formatINR(acc.lifetime_billing)}
                                                </td>

                                                {/* Status */}
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                                        acc.status === "ACTIVE"
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            : "bg-red-50 text-red-700 border-red-200"
                                                    }`}>
                                                        {acc.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="py-12 text-center text-slate-400 text-xs">
                                            No accounts match your search filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION CONTROLS & FOOTER */}
                    <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
                        <div>
                            <span>
                                Showing Page <strong className="text-slate-900">{currentPage}</strong> of <strong className="text-slate-900">{totalPages}</strong> ({totalAccounts} accounts total)
                            </span>
                        </div>

                        {/* Pagination Navigation */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                {/* Previous Button */}
                                <button
                                    type="button"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                                >
                                    <i className="fa-solid fa-chevron-left text-[10px]"></i> Previous
                                </button>

                                {/* Page Numbers */}
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                                    if (
                                        page === 1 ||
                                        page === totalPages ||
                                        (page >= currentPage - 1 && page <= currentPage + 1)
                                    ) {
                                        return (
                                            <button
                                                key={page}
                                                type="button"
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                    currentPage === page
                                                        ? "bg-amber-600 text-white shadow-xs"
                                                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    } else if (
                                        (page === currentPage - 2 && currentPage > 3) ||
                                        (page === currentPage + 2 && currentPage < totalPages - 2)
                                    ) {
                                        return <span key={page} className="px-1 text-slate-400">...</span>;
                                    }
                                    return null;
                                })}

                                {/* Next Button */}
                                <button
                                    type="button"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                                >
                                    Next <i className="fa-solid fa-chevron-right text-[10px]"></i>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ACCOUNT DETAIL DRAWER / MODAL (EXACT MATCH TO USER SPECIFICATIONS) */}
                {selectedDomainName && (
                    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs">
                        <div className="bg-white w-full max-w-2xl h-full shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300">
                            
                            {/* Drawer Header */}
                            <div className="p-6 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-10">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500 text-white uppercase">
                                            {accountDetail?.status || 'ACTIVE'}
                                        </span>
                                        <span className="text-xs font-mono text-slate-400">
                                            Customer ID: {accountDetail?.customer_id || 'N/A'}
                                        </span>
                                    </div>
                                    <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                                        <i className="fa-solid fa-globe text-amber-400"></i>
                                        {selectedDomainName}
                                    </h2>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleCloseDetail}
                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                                >
                                    <i className="fa-solid fa-xmark text-lg"></i>
                                </button>
                            </div>

                            {/* Drawer Content */}
                            {loadingDetail ? (
                                <div className="p-12 text-center text-slate-400 flex-1 flex flex-col items-center justify-center">
                                    <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-3 text-amber-600"></i>
                                    <span>Loading deep domain analytics...</span>
                                </div>
                            ) : accountDetail ? (
                                <div className="p-6 space-y-6 flex-1">
                                    
                                    {/* TOP METRICS GRID */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {/* Lifetime Billing */}
                                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Lifetime Billing</span>
                                            <span className="text-base font-extrabold text-slate-900 font-mono block">
                                                {formatINR(accountDetail.lifetime_billing)}
                                            </span>
                                        </div>

                                        {/* Active Committed Seats */}
                                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Active Committed Seats</span>
                                            <span className="text-base font-extrabold text-blue-700 font-mono block">
                                                {accountDetail.active_seats} Seats
                                            </span>
                                        </div>

                                        {/* Linked Client */}
                                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Linked Client</span>
                                            <span className="text-xs font-extrabold text-emerald-700 block truncate">
                                                {accountDetail.linked_client}
                                            </span>
                                        </div>

                                        {/* Latest Product */}
                                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 col-span-2 sm:col-span-1">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Latest Product</span>
                                            <span className="text-xs font-bold text-slate-800 block truncate">
                                                {accountDetail.latest_product}
                                            </span>
                                        </div>

                                        {/* First Activity Seen */}
                                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">First Activity Seen</span>
                                            <span className="text-xs font-bold text-slate-700 block">
                                                {accountDetail.first_activity_seen}
                                            </span>
                                        </div>

                                        {/* Last Activity Seen */}
                                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Last Activity Seen</span>
                                            <span className="text-xs font-bold text-slate-700 block">
                                                {accountDetail.last_activity_seen}
                                            </span>
                                        </div>
                                    </div>

                                    {/* RESELLER MASTER PROFILE */}
                                    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                                        <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                            <i className="fa-solid fa-id-card text-amber-600"></i> Reseller Master Profile
                                        </h4>

                                        <div className="grid grid-cols-2 gap-3 text-xs divide-y sm:divide-y-0 divide-slate-100">
                                            <div>
                                                <span className="text-slate-400 block text-[11px]">SKU:</span>
                                                <span className="font-bold text-slate-800">{accountDetail.master_profile?.sku}</span>
                                            </div>

                                            <div>
                                                <span className="text-slate-400 block text-[11px]">Payment Plan:</span>
                                                <span className="font-bold text-slate-800">{accountDetail.master_profile?.payment_plan}</span>
                                            </div>

                                            <div>
                                                <span className="text-slate-400 block text-[11px]">Subscription Status:</span>
                                                <span className="font-bold text-slate-800">{accountDetail.master_profile?.subscription_status}</span>
                                            </div>

                                            <div>
                                                <span className="text-slate-400 block text-[11px]">Assigned vs Purchased Licenses:</span>
                                                <span className="font-bold text-slate-800 font-mono">{accountDetail.master_profile?.assigned_seats}/{accountDetail.master_profile?.total_seats}</span>
                                            </div>

                                            <div>
                                                <span className="text-slate-400 block text-[11px]">Subscription Creation Date:</span>
                                                <span className="font-bold text-slate-800">{accountDetail.master_profile?.start_date}</span>
                                            </div>

                                            <div>
                                                <span className="text-slate-400 block text-[11px]">Subscription Renewal Date:</span>
                                                <span className="font-bold text-slate-800">{accountDetail.master_profile?.end_date}</span>
                                            </div>

                                            <div>
                                                <span className="text-slate-400 block text-[11px]">Order Number:</span>
                                                <span className="font-bold text-slate-800 font-mono">{accountDetail.master_profile?.order_number}</span>
                                            </div>

                                            <div>
                                                <span className="text-slate-400 block text-[11px]">Subscription ID:</span>
                                                <span className="font-bold text-slate-800 font-mono">{accountDetail.master_profile?.subscription_id}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MONTHLY TIMELINE / GROWTH ANALYTICS / PAYMENT SCHEDULE */}
                                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                        <div className="p-4 bg-slate-50 border-b border-slate-200">
                                            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                                <i className="fa-solid fa-chart-line text-blue-600"></i> Monthly Timeline / Payment Schedule
                                            </h4>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-slate-100/60 font-bold text-slate-600 uppercase text-[10px]">
                                                        <th className="py-2.5 px-3">Month</th>
                                                        <th className="py-2.5 px-3">Activity</th>
                                                        <th className="py-2.5 px-3 text-center font-mono">Seats</th>
                                                        <th className="py-2.5 px-3 text-right font-mono">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {accountDetail.timeline && accountDetail.timeline.length > 0 ? (
                                                        accountDetail.timeline.map((ev, i) => (
                                                            <tr key={`timeline_${ev.id || i}_${i}`} className="hover:bg-slate-50/80">
                                                                <td className="py-2.5 px-3 font-bold text-slate-700 whitespace-nowrap">
                                                                    {ev.month}
                                                                </td>
                                                                <td className="py-2.5 px-3 font-semibold text-slate-800">
                                                                    {ev.activity}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center font-extrabold text-slate-900 font-mono">
                                                                    {ev.seats}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700 font-mono">
                                                                    {formatINR(ev.amount)}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="4" className="py-6 text-center text-slate-400 italic">
                                                                No timeline activity events recorded in MySQL for this domain.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                </div>
                            ) : null}
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
