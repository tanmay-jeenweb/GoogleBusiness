import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";
import { fetchAccountsRegistry, fetchAccountDetail } from "../../api/accountApi";
import { formatStandardDate } from "../../utils/dateFormatter";

export default function AccountsPage() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'ACTIVE' | 'SUSPENDED' | 'UNASSIGNED'

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

    // Filter accounts by status
    const filteredAccounts = useMemo(() => {
        return accounts.filter(acc => {
            if (statusFilter === "all") return true;
            if (statusFilter === "UNASSIGNED") return acc.client_name === "Unassigned";
            return acc.status === statusFilter;
        });
    }, [accounts, statusFilter]);

    // Format currency INR
    const formatINR = (val) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
    };

    // Define columns for Accounts Registry DataTable
    const columns = useMemo(() => [
        {
            key: "domain_name",
            label: "Domain Name",
            sortable: true,
            minWidth: "200px",
            render: (acc) => (
                <button
                    type="button"
                    onClick={() => handleOpenDetail(acc.domain_name)}
                    className="text-[#0256d0] hover:underline flex items-center gap-1.5 cursor-pointer font-extrabold text-xs text-left"
                >
                    <i className="fa-solid fa-globe text-slate-400 text-[11px]"></i>
                    {acc.domain_name}
                </button>
            )
        },
        {
            key: "client_name",
            label: "Client",
            sortable: true,
            minWidth: "160px",
            render: (acc) => {
                const isUnassigned = acc.client_name === "Unassigned";
                return (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        isUnassigned
                            ? "bg-slate-100 text-slate-500 border-slate-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                        {acc.client_name}
                    </span>
                );
            }
        },
        {
            key: "customer_id",
            label: "Customer ID",
            sortable: true,
            minWidth: "150px",
            render: (acc) => (
                <span className="font-mono font-bold text-slate-600">
                    {acc.customer_id}
                </span>
            )
        },
        {
            key: "sku_plan",
            label: "Product SKU",
            sortable: true,
            minWidth: "180px",
            render: (acc) => (
                <span className="font-medium text-slate-800">
                    {acc.sku_plan}
                </span>
            )
        },
        {
            key: "payment_plan",
            label: "Payment Plan",
            sortable: true,
            minWidth: "180px",
            render: (acc) => (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    (acc.payment_plan || "").toLowerCase().includes("monthly")
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : (acc.payment_plan || "").toLowerCase().includes("yearly")
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                    • {acc.payment_plan || "Annual Plan (Monthly Payment)"}
                </span>
            )
        },
        {
            key: "assigned_seats",
            label: "Licenses (Assigned/Purchased)",
            sortable: true,
            minWidth: "210px",
            render: (acc) => (
                <span className="text-center font-mono font-bold text-slate-800 block">
                    {acc.assigned_seats}/{acc.total_seats}
                </span>
            )
        },
        {
            key: "created_date",
            label: "Created Date",
            sortable: true,
            minWidth: "130px",
            render: (acc) => (
                <span className="text-slate-600 font-mono text-xs">
                    {formatStandardDate(acc.created_date)}
                </span>
            )
        },
        {
            key: "lifetime_billing",
            label: "Lifetime Billing",
            sortable: true,
            minWidth: "150px",
            render: (acc) => (
                <span className="text-right font-extrabold text-slate-900 font-mono block">
                    {formatINR(acc.lifetime_billing)}
                </span>
            )
        },
        {
            key: "status",
            label: "Status",
            sortable: true,
            minWidth: "120px",
            render: (acc) => (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    acc.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-red-50 text-red-700 border-red-200"
                }`}>
                    • {acc.status}
                </span>
            )
        }
    ], []);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar title="Accounts Registry" />

            <main className="flex-1 w-full max-w-[96rem] mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col">
                <div className="flex-1 flex flex-col">
                    <DataTable
                        tableId="user_accounts_registry_table"
                        title="Accounts Registry"
                        data={filteredAccounts}
                        columns={columns}
                        loading={loading}
                        defaultPageSize={8}
                        showTopPagination={false}
                        searchPlaceholder="Search accounts by domain, customer ID, SKU, client..."
                        toggleActions={
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-300">
                                <span className="font-bold">Status:</span>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="bg-transparent font-extrabold text-slate-900 focus:outline-none cursor-pointer"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="SUSPENDED">SUSPENDED</option>
                                    <option value="UNASSIGNED">Unassigned Only</option>
                                </select>
                            </div>
                        }
                    />
                </div>

                {/* ACCOUNT DETAIL DRAWER / ANALYTICS MODAL */}
                {selectedDomainName && (
                    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                        <div className="bg-slate-50 w-full max-w-2xl h-full shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300">
                            
                            {/* Drawer Header */}
                            <div className="p-6 bg-[#0256d0] text-white flex items-center justify-between sticky top-0 z-20 shadow-md">
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center text-base border border-white/30 shrink-0 shadow-xs">
                                        <i className="fa-solid fa-globe"></i>
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                                        {selectedDomainName}
                                    </h2>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${
                                        (accountDetail?.status || '').toUpperCase() === 'ACTIVE'
                                            ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                                            : 'bg-red-500/20 text-red-200 border-red-400/40'
                                    }`}>
                                        • {accountDetail?.status || 'ACTIVE'}
                                    </span>
                                    <span className="text-xs font-mono text-blue-100 bg-white/15 px-2.5 py-0.5 rounded-md border border-white/20">
                                        ID: {accountDetail?.customer_id || 'N/A'}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleCloseDetail}
                                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition-all border border-white/20 shadow-xs"
                                >
                                    <i className="fa-solid fa-xmark text-base"></i>
                                </button>
                            </div>

                            {/* Drawer Content */}
                            {loadingDetail ? (
                                <div className="p-12 text-center text-slate-400 flex-1 flex flex-col items-center justify-center">
                                    <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-3 text-blue-600 block"></i>
                                    <span className="text-sm font-semibold text-slate-600">Loading domain analytics...</span>
                                </div>
                            ) : accountDetail ? (
                                <div className="p-6 space-y-6 flex-1">
                                    
                                    {/* TOP METRICS CARDS GRID */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                                        
                                        {/* Lifetime Billing */}
                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                                            <div className="flex items-center justify-between text-slate-400 mb-1.5">
                                                <span className="text-[11px] font-bold uppercase tracking-wider">Lifetime Billing</span>
                                                <i className="fa-solid fa-indian-rupee-sign text-xs text-emerald-600"></i>
                                            </div>
                                            <span className="text-lg font-extrabold text-slate-900 font-mono block">
                                                {formatINR(accountDetail.lifetime_billing)}
                                            </span>
                                        </div>

                                        {/* Active Committed Seats */}
                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                                            <div className="flex items-center justify-between text-slate-400 mb-1.5">
                                                <span className="text-[11px] font-bold uppercase tracking-wider">Committed Seats</span>
                                                <i className="fa-solid fa-users text-xs text-blue-600"></i>
                                            </div>
                                            <span className="text-lg font-extrabold text-blue-700 font-mono block">
                                                {accountDetail.active_seats} <span className="text-xs text-slate-500 font-sans">Seats</span>
                                            </span>
                                        </div>

                                        {/* Linked Client */}
                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                                            <div className="flex items-center justify-between text-slate-400 mb-1.5">
                                                <span className="text-[11px] font-bold uppercase tracking-wider">Linked Client</span>
                                                <i className="fa-solid fa-building text-xs text-purple-600"></i>
                                            </div>
                                            <span className="text-xs font-extrabold text-purple-700 block truncate">
                                                {accountDetail.linked_client}
                                            </span>
                                        </div>

                                        {/* Latest Product */}
                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                                            <div className="flex items-center justify-between text-slate-400 mb-1.5">
                                                <span className="text-[11px] font-bold uppercase tracking-wider">Latest Product</span>
                                                <i className="fa-solid fa-cube text-xs text-amber-600"></i>
                                            </div>
                                            <span className="text-xs font-bold text-slate-800 block truncate">
                                                {accountDetail.latest_product}
                                            </span>
                                        </div>

                                        {/* First Activity Seen */}
                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                                            <div className="flex items-center justify-between text-slate-400 mb-1.5">
                                                <span className="text-[11px] font-bold uppercase tracking-wider">First Activity</span>
                                                <i className="fa-solid fa-calendar-plus text-xs text-slate-500"></i>
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 block font-mono">
                                                {accountDetail.first_activity_seen}
                                            </span>
                                        </div>

                                        {/* Last Activity Seen */}
                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                                            <div className="flex items-center justify-between text-slate-400 mb-1.5">
                                                <span className="text-[11px] font-bold uppercase tracking-wider">Last Activity</span>
                                                <i className="fa-solid fa-clock-rotate-left text-xs text-slate-500"></i>
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 block font-mono">
                                                {accountDetail.last_activity_seen}
                                            </span>
                                        </div>
                                    </div>

                                    {/* RESELLER MASTER PROFILE */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                                <i className="fa-solid fa-shield-halved text-amber-500"></i> Reseller Master Profile
                                            </h4>
                                            <span className="text-[11px] font-mono text-slate-400">
                                                Order: #{accountDetail.master_profile?.order_number || 'N/A'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                                            <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                                                <span className="text-slate-400 block text-[11px] font-semibold mb-0.5">Product SKU</span>
                                                <span className="font-bold text-slate-900">{accountDetail.master_profile?.sku}</span>
                                            </div>

                                            <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                                                <span className="text-slate-400 block text-[11px] font-semibold mb-0.5">Payment Plan</span>
                                                <span className="font-bold text-slate-900">{accountDetail.master_profile?.payment_plan}</span>
                                            </div>

                                            <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                                                <span className="text-slate-400 block text-[11px] font-semibold mb-0.5">Subscription Status</span>
                                                <span className="font-bold text-emerald-700">{accountDetail.master_profile?.subscription_status}</span>
                                            </div>

                                            <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                                                <span className="text-slate-400 block text-[11px] font-semibold mb-0.5">Assigned vs Purchased Licenses</span>
                                                <span className="font-bold text-slate-900 font-mono">{accountDetail.master_profile?.assigned_seats} / {accountDetail.master_profile?.total_seats}</span>
                                            </div>

                                            <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                                                <span className="text-slate-400 block text-[11px] font-semibold mb-0.5">Subscription Start Date</span>
                                                <span className="font-bold text-slate-800 font-mono">{accountDetail.master_profile?.start_date}</span>
                                            </div>

                                            <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                                                <span className="text-slate-400 block text-[11px] font-semibold mb-0.5">Subscription Renewal Date</span>
                                                <span className="font-bold text-slate-800 font-mono">{accountDetail.master_profile?.end_date}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MONTHLY TIMELINE / PAYMENT SCHEDULE */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                                <i className="fa-solid fa-timeline text-blue-600"></i> Monthly Payment Schedule & Growth Timeline
                                            </h4>
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 font-extrabold border border-blue-200">
                                                {accountDetail.timeline?.length || 0} Transactions
                                            </span>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="bg-[#0256d0] text-white text-[10px] font-extrabold uppercase tracking-wider">
                                                        <th className="py-3 px-4">Date / Month</th>
                                                        <th className="py-3 px-4">Activity Category</th>
                                                        <th className="py-3 px-4 text-center font-mono">Seats</th>
                                                        <th className="py-3 px-4 text-right font-mono">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {accountDetail.timeline && accountDetail.timeline.length > 0 ? (
                                                        accountDetail.timeline.map((ev, i) => {
                                                            const actLower = (ev.activity || '').toLowerCase();
                                                            const isCommitment = actLower.includes('commitment');
                                                            const isUpgrade = actLower.includes('add') || actLower.includes('upgrade');

                                                            return (
                                                                <tr key={`timeline_${ev.id || i}_${i}`} className="hover:bg-blue-50/30 transition-colors">
                                                                    
                                                                    {/* Date & Month */}
                                                                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                                                                        <div className="flex flex-col">
                                                                            <span className="font-mono text-slate-900 text-xs font-extrabold">
                                                                                {ev.date || ev.month}
                                                                            </span>
                                                                            <span className="text-[10px] text-slate-400 font-medium">
                                                                                {ev.month}
                                                                            </span>
                                                                        </div>
                                                                    </td>

                                                                    {/* Activity Category Badge */}
                                                                    <td className="py-3 px-4">
                                                                        <div className="flex flex-col gap-1">
                                                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold border w-fit inline-flex items-center gap-1 ${
                                                                                isCommitment
                                                                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                                                                    : isUpgrade
                                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                                                            }`}>
                                                                                <i className={`fa-solid ${isCommitment ? 'fa-file-contract' : isUpgrade ? 'fa-arrow-trend-up' : 'fa-receipt'} text-[9px]`}></i>
                                                                                {isCommitment ? 'Annual Commitment' : ev.activity}
                                                                            </span>
                                                                            {ev.order_number && ev.order_number !== 'N/A' && (
                                                                                <span className="text-[10px] font-mono text-slate-400">
                                                                                    Order: #{ev.order_number}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>

                                                                    {/* Seats Badge */}
                                                                    <td className="py-3 px-4 text-center whitespace-nowrap">
                                                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-mono font-extrabold text-[11px] border border-slate-200">
                                                                            {ev.seats} Seats
                                                                        </span>
                                                                    </td>

                                                                    {/* Amount */}
                                                                    <td className="py-3 px-4 text-right font-extrabold text-emerald-700 font-mono whitespace-nowrap text-xs">
                                                                        {formatINR(ev.amount)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="4" className="py-8 text-center text-slate-400 italic text-xs">
                                                                No timeline activity events recorded for this domain.
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
