import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";

export default function CompareMonthPage() {
    const [monthA, setMonthA] = useState("August 2026");
    const [monthB, setMonthB] = useState("August 2026");
    const [availableMonths, setAvailableMonths] = useState(["August 2026"]);
    const [comparisonData, setComparisonData] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadAvailableMonths = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("http://localhost:5000/api/dashboard/available-months", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.success && res.data.months?.length > 0) {
                setAvailableMonths(res.data.months);
                if (!res.data.months.includes(monthA)) setMonthA(res.data.months[0]);
                if (!res.data.months.includes(monthB)) setMonthB(res.data.months[0]);
            }
        } catch (e) {
            console.error("Error loading available months:", e);
        }
    };

    const loadComparisonData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const res = await axios.get(`http://localhost:5000/api/dashboard/compare-month?monthA=${encodeURIComponent(monthA)}&monthB=${encodeURIComponent(monthB)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.success) {
                setComparisonData(res.data.data);
            }
        } catch (error) {
            console.error("Error fetching comparison data:", error);
            toast.error("Failed to load month comparison metrics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAvailableMonths();
    }, []);

    useEffect(() => {
        loadComparisonData();
    }, [monthA, monthB]);

    const formatVal = (val, isCurrency) => {
        if (isCurrency) {
            return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
        }
        return new Intl.NumberFormat('en-IN').format(val);
    };

    const columns = useMemo(() => [
        {
            key: "label",
            label: "Metric Dimension",
            sortable: true,
            minWidth: "220px",
            render: (row) => (
                <span className="font-extrabold text-slate-900">{row.label}</span>
            )
        },
        {
            key: "valA",
            label: monthA,
            sortable: true,
            minWidth: "140px",
            render: (row) => (
                <span className="font-bold text-slate-700 font-mono">
                    {formatVal(row.valA, row.isCurrency)}
                </span>
            )
        },
        {
            key: "valB",
            label: monthB,
            sortable: true,
            minWidth: "140px",
            render: (row) => (
                <span className="font-bold text-slate-700 font-mono">
                    {formatVal(row.valB, row.isCurrency)}
                </span>
            )
        },
        {
            key: "netChange",
            label: "Net Change",
            sortable: true,
            minWidth: "140px",
            render: (row) => {
                const isPositive = row.netChange > 0;
                const isNegative = row.netChange < 0;
                return (
                    <span className={`font-black font-mono ${
                        isPositive ? "text-emerald-600" : isNegative ? "text-red-600" : "text-slate-500"
                    }`}>
                        {isPositive ? `+${formatVal(row.netChange, row.isCurrency)}` : formatVal(row.netChange, row.isCurrency)}
                    </span>
                );
            }
        },
        {
            key: "pct",
            label: "Growth %",
            sortable: true,
            minWidth: "120px",
            render: (row) => {
                const isPositive = row.netChange > 0;
                const isNegative = row.netChange < 0;
                return (
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-black border inline-block ${
                        isPositive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isNegative
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}>
                        {isPositive ? `+${row.pct}%` : `${row.pct}%`}
                    </span>
                );
            }
        }
    ], [monthA, monthB]);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar title="Compare Month" />

            <main className="flex-1 w-full max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 flex flex-col">
                
                {/* Header + Minimal Inline Month Selectors */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                                MoM Growth Analytics
                            </span>
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                            Compare Month Growth
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Evaluate invoicing growth, seat expansions, and active account ratios side-by-side
                        </p>
                    </div>

                    {/* Minimal Inline Selectors */}
                    <div className="flex flex-wrap items-center gap-3 bg-white p-2 px-3.5 rounded-xl border border-slate-200 shadow-2xs shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-600 whitespace-nowrap flex items-center gap-1.5">
                                <i className="fa-solid fa-calendar-day text-blue-600 text-xs"></i>
                                Month A (Base):
                            </span>
                            <select
                                value={monthA}
                                onChange={(e) => setMonthA(e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-extrabold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
                            >
                                {availableMonths.map((m, idx) => (
                                    <option key={idx} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>

                        <span className="text-slate-300 font-light hidden sm:inline">|</span>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-600 whitespace-nowrap flex items-center gap-1.5">
                                <i className="fa-solid fa-calendar-check text-indigo-600 text-xs"></i>
                                Month B (Compare):
                            </span>
                            <select
                                value={monthB}
                                onChange={(e) => setMonthB(e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-extrabold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
                            >
                                {availableMonths.map((m, idx) => (
                                    <option key={idx} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* COMPARISON DATATABLE */}
                <div className="flex-1 flex flex-col">
                    <DataTable
                        tableId="compare_month_growth_table"
                        title="MoM Growth Metric Comparison"
                        data={comparisonData?.comparisonTable || []}
                        columns={columns}
                        loading={loading}
                        defaultPageSize={8}
                        showTopPagination={false}
                        searchPlaceholder="Search metric..."
                    />
                </div>

            </main>
        </div>
    );
}
