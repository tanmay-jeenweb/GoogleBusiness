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
        <div className="relative w-44 h-44 mx-auto flex items-center justify-center my-2">
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
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">TOTAL</span>
                <span className="text-sm font-black text-slate-900 leading-tight">{formattedTotal}</span>
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
        purchased_licenses: 0
    };

    const gm = overviewData?.growth_metrics || {
        total_billing: 0,
        unique_customer_accounts: 0,
        committed_seats_active: 0,
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
        <div className="flex flex-col min-h-screen bg-slate-50/60 font-sans text-slate-900">
            <Navbar title="Dashboard" />

            <main className="flex-1 w-full max-w-[96rem] mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
                
                {/* Minimal Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            Executive Dashboard
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                            Real-time billing performance, license commitments & top domain accounts
                        </p>
                    </div>

                    {/* Minimal Month Selector Pill */}
                    <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
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

                {/* 4 CLEAN MINIMAL KPI CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Invoiced Billing</span>
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                                <i className="fa-solid fa-indian-rupee-sign"></i>
                            </div>
                        </div>
                        <span className="text-2xl font-black text-slate-900 font-mono block">{formatINR(gm.total_billing)}</span>
                        <span className="text-[11px] font-bold text-emerald-600 mt-1 block">Live Database Ingested</span>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Customer Domains</span>
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                                <i className="fa-solid fa-globe"></i>
                            </div>
                        </div>
                        <span className="text-2xl font-black text-slate-900 font-mono block">{po.active_accounts || gm.unique_customer_accounts} Domains</span>
                        <span className="text-[11px] font-bold text-blue-600 mt-1 block">{po.total_accounts} Total Registered</span>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Committed Seats</span>
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                <i className="fa-solid fa-chair"></i>
                            </div>
                        </div>
                        <span className="text-2xl font-black text-indigo-700 font-mono block">{gm.committed_seats_active} Seats</span>
                        <span className="text-[11px] font-bold text-indigo-600 mt-1 block">Active Workspace Licenses</span>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Commitment Events</span>
                            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">
                                <i className="fa-solid fa-chart-line"></i>
                            </div>
                        </div>
                        <span className="text-2xl font-black text-purple-700 font-mono block">{gm.commitments_count + gm.commitment_increases_count} Events</span>
                        <span className="text-[11px] font-bold text-purple-600 mt-1 block">Contract Upgrades & Renewals</span>
                    </div>

                </div>

                {/* 2-COLUMN MINIMAL ANALYTICS ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    
                    {/* Activity Type Breakdown */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                    <i className="fa-solid fa-chart-pie text-blue-600"></i> Activity Breakdown
                                </h3>
                                <span className="text-[11px] font-bold text-slate-400">{billingMonth}</span>
                            </div>

                            <ActivityDonutChart items={activityTypes} totalVal={totalActivityBilling} />
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                            {activityTypes.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 truncate">
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ACTIVITY_COLORS[idx % ACTIVITY_COLORS.length] }}></span>
                                        <span className="font-bold text-slate-700 truncate">{item.type}</span>
                                    </div>
                                    <span className="font-mono font-black text-slate-900 ml-1">{formatINR(item.amount)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Contract Plan Distribution */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                    <i className="fa-solid fa-file-contract text-indigo-600"></i> Contract Plan Revenue
                                </h3>
                                <span className="text-[11px] font-bold text-slate-400">{billingMonth}</span>
                            </div>

                            <div className="space-y-3 mt-4">
                                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-extrabold text-slate-900 block">Flexible / Usage-Based Plans</span>
                                        <span className="text-[11px] text-slate-500 font-medium">{cp.flexy_plan.seats} Seats Active • {cp.flexy_plan.txns} Txns</span>
                                    </div>
                                    <span className="text-xs font-mono font-black text-slate-900">{formatINR(cp.flexy_plan.amount)}</span>
                                </div>

                                <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-extrabold text-blue-900 block">Monthly Commitments</span>
                                        <span className="text-[11px] text-blue-700 font-medium">{cp.monthly_commit.seats} Seats Active • {cp.monthly_commit.txns} Txns</span>
                                    </div>
                                    <span className="text-xs font-mono font-black text-blue-950">{formatINR(cp.monthly_commit.amount)}</span>
                                </div>

                                <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-extrabold text-emerald-900 block">Yearly Commitments (Annual)</span>
                                        <span className="text-[11px] text-emerald-700 font-medium">{cp.yearly_commit.seats} Seats Active • {cp.yearly_commit.txns} Txns</span>
                                    </div>
                                    <span className="text-xs font-mono font-black text-emerald-950">{formatINR(cp.yearly_commit.amount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TOP DOMAIN ACCOUNTS TABLE */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden p-6 space-y-4">
                    
                    {/* Datatable Header Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                        <div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <i className="fa-solid fa-trophy text-amber-500"></i> Top Accounts by Billing
                            </h3>
                            <p className="text-[11px] text-slate-400">Domains ranked by transaction sum in {billingMonth}</p>
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

                            {/* Limit Selector */}
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
                                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                                    <th className="py-3 px-4 w-12 text-center">Rank</th>
                                    <th className="py-3 px-4">Domain Name</th>
                                    <th className="py-3 px-4 font-mono">Customer ID</th>
                                    <th className="py-3 px-4 text-center">Txns</th>
                                    <th className="py-3 px-4 text-center font-mono">Active Seats</th>
                                    <th className="py-3 px-4 text-right font-mono">Total Billing (INR)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="py-12 text-center text-slate-400">
                                            <i className="fa-solid fa-circle-notch fa-spin text-xl mb-2 text-blue-600 block"></i>
                                            Loading top accounts...
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
                                            <td className="py-3 px-4 font-mono font-bold text-slate-500 whitespace-nowrap">
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
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="py-12 text-center text-slate-400 text-xs">
                                            No domain accounts found matching your filter.
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
