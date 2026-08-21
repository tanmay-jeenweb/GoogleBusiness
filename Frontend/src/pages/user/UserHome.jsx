import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import apiClient from "../../api/authApi";
import { fetchFinancialOverview } from "../../api/dashboardApi";

// Activity Type Donut Chart Colors
const ACTIVITY_COLORS = [
    "#3b82f6", // blue-500
    "#6366f1", // indigo-500
    "#10b981", // emerald-500
    "#06b6d4", // cyan-500
    "#a855f7", // purple-500
    "#f59e0b", // amber-500
    "#ec4899", // pink-500
    "#64748b"  // slate-500
];

function ActivityDonutChart({ items, totalVal }) {
    const radius = 55;
    const circumference = 2 * Math.PI * radius;
    let accumulatedRatio = 0;

    const formattedTotal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalVal || 0);

    return (
        <div className="relative w-48 h-48 mx-auto flex items-center justify-center my-3">
            <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="16" />
                {items.map((item, idx) => {
                    const ratio = totalVal > 0 ? item.amount / totalVal : 0;
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
                            stroke={ACTIVITY_COLORS[idx % ACTIVITY_COLORS.length]}
                            strokeWidth="16"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-500 ease-out"
                        />
                    );
                })}
            </svg>

            {/* Donut Center Text */}
            <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">TOTAL BILLING</span>
                <span className="text-sm font-black text-slate-900 font-mono leading-tight">{formattedTotal}</span>
            </div>
        </div>
    );
}

export default function UserHome() {
    const [overviewData, setOverviewData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [billingMonth, setBillingMonth] = useState("August 2026");
    const [availableMonths, setAvailableMonths] = useState(["August 2026"]);
    const [topLimit, setTopLimit] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");

    const loadAvailableMonths = async () => {
        try {
            const res = await apiClient.get("/dashboard/available-months");
            if (res.data?.success && res.data.months?.length > 0) {
                setAvailableMonths(res.data.months);
                if (!res.data.months.includes(billingMonth)) {
                    setBillingMonth(res.data.months[0]);
                }
            }
        } catch (e) {
            console.error("Error loading available months:", e);
        }
    };

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const res = await fetchFinancialOverview(billingMonth);
            if (res.data?.success) {
                setOverviewData(res.data.overview);
            }
        } catch (error) {
            console.error("Error fetching dashboard overview:", error);
            toast.error("Failed to load dashboard metrics from MySQL");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAvailableMonths();
    }, []);

    useEffect(() => {
        loadDashboardData();
    }, [billingMonth]);

    const formatINR = (val) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val || 0);
    };

    // Dynamic Data from MySQL
    const po = overviewData?.portfolio_overview || {
        total_accounts: 0,
        active_accounts: 0,
        suspended_accounts: 0,
        assigned_licenses: 0,
        purchased_licenses: 0,
        sku_distribution: []
    };

    const gm = overviewData?.growth_metrics || {
        total_billing: 0,
        unique_customer_accounts: 0,
        committed_seats_active: 0,
        new_accounts_count: 0,
        renewals_count: 0,
        new_commitments_count: 0,
        commitments_count: 0,
        commitment_increases_count: 0
    };

    const cp = overviewData?.contract_plans || {
        flexy_plan: { amount: 0, seats: 0, txns: 0 },
        monthly_commit: { amount: 0, seats: 0, txns: 0 },
        yearly_commit: { amount: 0, seats: 0, txns: 0 }
    };

    const activityTypes = overviewData?.activity_type_billing || [];
    const totalActivityBilling = activityTypes.reduce((acc, curr) => acc + curr.amount, 0);

    const allTopAccounts = (overviewData?.top_accounts || []);
    const filteredAccounts = allTopAccounts.filter(acc => 
        (acc.domain_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (acc.customer_id || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const displayedAccounts = filteredAccounts.slice(0, topLimit);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar title="Financial Intelligence" />

            <main className="flex-1 w-full max-w-[96rem] mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
                
                {/* Executive Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                Real-Time Executive Overview
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                            Executive Financial Dashboard
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            High-level portfolio performance, active license commitments, and revenue aggregations
                        </p>
                    </div>

                    {/* Dynamic Billing Month Selector */}
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-2xs self-start sm:self-auto">
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                            <i className="fa-solid fa-calendar text-blue-600"></i> Billing Period:
                        </span>
                        <select
                            value={billingMonth}
                            onChange={(e) => setBillingMonth(e.target.value)}
                            className="bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none cursor-pointer"
                        >
                            {availableMonths.map((m, idx) => (
                                <option key={idx} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 1. RESELLER PORTFOLIO SUMMARY BANNER */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-5 relative overflow-hidden">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-blue-400">
                                <i className="fa-solid fa-layer-group"></i>
                            </div>
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-wider text-blue-200">
                                    Reseller Portfolio Overview
                                </h2>
                                <p className="text-[11px] text-slate-400">Aggregated master accounts registry</p>
                            </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                            {po.total_accounts} Total Domains
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Domain Accounts Pillar */}
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">CUSTOMER ACCOUNTS</span>
                            <span className="text-3xl font-black font-mono block mb-2">{po.total_accounts}</span>
                            <div className="flex items-center gap-2 text-xs font-bold pt-2 border-t border-white/10">
                                <span className="text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded-md">{po.active_accounts} Active</span>
                                <span className="text-amber-400 px-2 py-0.5 bg-amber-500/10 rounded-md">{po.suspended_accounts} Suspended</span>
                            </div>
                        </div>

                        {/* License Allocations Pillar */}
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">LICENSE ALLOCATIONS</span>
                            <span className="text-3xl font-black font-mono block mb-2">{po.assigned_licenses} / {po.purchased_licenses}</span>
                            <span className="text-xs text-slate-400 font-semibold block pt-2 border-t border-white/10">
                                Assigned / Purchased Reseller Seats
                            </span>
                        </div>

                        {/* SKU Distribution Pillar */}
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                WORKSPACE SKU DISTRIBUTION
                            </span>
                            <div className="space-y-1.5 text-xs">
                                {po.sku_distribution.length > 0 ? (
                                    po.sku_distribution.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-slate-300">
                                            <span className="truncate mr-2 text-[11px] font-medium">{item.sku}</span>
                                            <span className="font-mono text-[11px] text-white font-bold bg-white/10 px-2 py-0.5 rounded">{item.count}</span>
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-xs text-slate-400">No SKU data ingested</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. 4 ESSENTIAL EXECUTIVE KPI CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* 1. Total Invoiced Billing */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Invoiced Billing</span>
                            <span className="text-2xl font-black text-slate-900 font-mono block">{formatINR(gm.total_billing)}</span>
                            <span className="text-[11px] font-semibold text-emerald-600 mt-1 block">Live Ingested Sum</span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl shrink-0">
                            <i className="fa-solid fa-indian-rupee-sign"></i>
                        </div>
                    </div>

                    {/* 2. Unique Customer Accounts */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Customer Accounts</span>
                            <span className="text-2xl font-black text-slate-900 font-mono block">{gm.unique_customer_accounts} Domains</span>
                            <span className="text-[11px] font-semibold text-blue-600 mt-1 block">Unique Ingested Accounts</span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl shrink-0">
                            <i className="fa-solid fa-globe"></i>
                        </div>
                    </div>

                    {/* 3. Committed Seats Active */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Committed Seats Active</span>
                            <span className="text-2xl font-black text-blue-700 font-mono block">{gm.committed_seats_active} Seats</span>
                            <span className="text-[11px] font-semibold text-indigo-600 mt-1 block">Active License Seats</span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl shrink-0">
                            <i className="fa-solid fa-chair"></i>
                        </div>
                    </div>

                    {/* 4. Commitment Events */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Commitment Events</span>
                            <span className="text-2xl font-black text-purple-700 font-mono block">{gm.commitments_count + gm.commitment_increases_count} Events</span>
                            <span className="text-[11px] font-semibold text-purple-600 mt-1 block">Active Commitment Changes</span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl shrink-0">
                            <i className="fa-solid fa-chart-line"></i>
                        </div>
                    </div>

                </div>

                {/* 3. VISUAL ANALYTICS ROW: DONUT CHART + CONTRACT PLAN CLASSIFICATION */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    
                    {/* Left: Billing by Activity Type Donut Visualizer */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                                        <i className="fa-solid fa-chart-pie"></i>
                                    </div>
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                        Billing by Activity Type
                                    </h3>
                                </div>
                            </div>

                            <ActivityDonutChart items={activityTypes} totalVal={totalActivityBilling} />
                        </div>

                        {/* Legend Grid */}
                        <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                            {activityTypes.map((item, idx) => (
                                <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ACTIVITY_COLORS[idx % ACTIVITY_COLORS.length] }}></span>
                                        <span className="text-[11px] font-bold text-slate-600 truncate">{item.type}</span>
                                    </div>
                                    <span className="text-xs font-black text-slate-900 font-mono">{formatINR(item.amount)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Contract Plan Classification Breakdown */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-xs">
                                        <i className="fa-solid fa-layer-group"></i>
                                    </div>
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                        Contract Plan Classification
                                    </h3>
                                </div>
                                <span className="text-[11px] font-bold text-slate-400">Usage vs Commitment</span>
                            </div>

                            <div className="space-y-3 pt-4">
                                
                                {/* Flexy Plan */}
                                <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-extrabold text-purple-900">Flexy Plan (Usage Billing)</span>
                                        <span className="text-xs font-mono font-black text-purple-950">{formatINR(cp.flexy_plan.amount)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] font-semibold text-purple-700">
                                        <span>{cp.flexy_plan.seats} Seats Active</span>
                                        <span>{cp.flexy_plan.txns} Transactions</span>
                                    </div>
                                </div>

                                {/* Monthly Commit */}
                                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-extrabold text-blue-900">Monthly Commit (Range)</span>
                                        <span className="text-xs font-mono font-black text-blue-950">{formatINR(cp.monthly_commit.amount)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] font-semibold text-blue-700">
                                        <span>{cp.monthly_commit.seats} Seats Active</span>
                                        <span>{cp.monthly_commit.txns} Transactions</span>
                                    </div>
                                </div>

                                {/* Yearly Commit */}
                                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-extrabold text-emerald-900">Yearly Commit (Annual)</span>
                                        <span className="text-xs font-mono font-black text-emerald-950">{formatINR(cp.yearly_commit.amount)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-700">
                                        <span>{cp.yearly_commit.seats} Seats Active</span>
                                        <span>{cp.yearly_commit.txns} Transactions</span>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                </div>

                {/* 4. TOP ACCOUNTS BY MONTHLY BILLING DATATABLE */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
                    
                    {/* Datatable Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xs">
                                <i className="fa-solid fa-trophy"></i>
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                    Top Accounts by Monthly Billing
                                </h3>
                                <p className="text-[11px] text-slate-400">Domains ranked by transaction sum in {billingMonth}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Search filter */}
                            <div className="relative">
                                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                <input
                                    type="text"
                                    placeholder="Filter domain..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Show count selector */}
                            <select
                                value={topLimit}
                                onChange={(e) => setTopLimit(Number(e.target.value))}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 focus:outline-none cursor-pointer"
                            >
                                <option value={10}>Top 10</option>
                                <option value={25}>Top 25</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                                    <th className="py-3.5 px-4 w-12 text-center">Rank</th>
                                    <th className="py-3.5 px-4">Domain Name</th>
                                    <th className="py-3.5 px-4 font-mono">Customer ID</th>
                                    <th className="py-3.5 px-4 text-center">Txns</th>
                                    <th className="py-3.5 px-4 text-center font-mono">Active Seats</th>
                                    <th className="py-3.5 px-4 text-right font-mono">Total Billing (INR)</th>
                                    <th className="py-3.5 px-4">Primary Activity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="py-12 text-center text-slate-400">
                                            <i className="fa-solid fa-circle-notch fa-spin text-xl mb-2 text-blue-600 block"></i>
                                            Loading top accounts from MySQL...
                                        </td>
                                    </tr>
                                ) : displayedAccounts.length > 0 ? (
                                    displayedAccounts.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                            
                                            {/* Rank */}
                                            <td className="py-3 px-4 text-center font-extrabold text-slate-400">
                                                {idx + 1}
                                            </td>

                                            {/* Domain Name */}
                                            <td className="py-3 px-4 font-extrabold text-blue-700 whitespace-nowrap">
                                                {row.domain_name}
                                            </td>

                                            {/* Customer ID */}
                                            <td className="py-3 px-4 font-mono font-bold text-slate-600 whitespace-nowrap">
                                                {row.customer_id}
                                            </td>

                                            {/* Transactions Count */}
                                            <td className="py-3 px-4 text-center font-bold text-slate-700">
                                                {row.txns}
                                            </td>

                                            {/* Active Seats */}
                                            <td className="py-3 px-4 text-center font-extrabold text-slate-900 font-mono">
                                                {row.active_seats}
                                            </td>

                                            {/* Total Billing (INR) */}
                                            <td className="py-3 px-4 text-right font-extrabold text-emerald-700 font-mono">
                                                {formatINR(row.total_billing)}
                                            </td>

                                            {/* Primary Activity */}
                                            <td className="py-3 px-4 text-slate-600 font-semibold capitalize">
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] border border-slate-200">
                                                    {row.primary_activities || 'new account'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="py-12 text-center text-slate-400 text-xs">
                                            No top accounts data available.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                </div>

            </main>
        </div>
    );
}
