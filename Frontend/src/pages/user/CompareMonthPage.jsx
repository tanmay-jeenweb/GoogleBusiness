import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";

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

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar title="Compare Month" />

            <main className="flex-1 w-full max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                MoM Growth Analytics
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                            Compare Month Growth
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Evaluate invoicing growth, seat expansions, and active account ratios side-by-side
                        </p>
                    </div>
                </div>

                {/* MONTH SELECTORS BAR */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-6">
                    
                    {/* Month A Selector */}
                    <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                            <i className="fa-solid fa-calendar-day text-blue-600"></i>
                            Month A (Base period)
                        </label>
                        <select
                            value={monthA}
                            onChange={(e) => setMonthA(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-extrabold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                        >
                            {availableMonths.map((m, idx) => (
                                <option key={idx} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    {/* Month B Selector */}
                    <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                            <i className="fa-solid fa-calendar-check text-indigo-600"></i>
                            Month B (Comparison period)
                        </label>
                        <select
                            value={monthB}
                            onChange={(e) => setMonthB(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-extrabold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                        >
                            {availableMonths.map((m, idx) => (
                                <option key={idx} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                </div>

                {/* COMPARISON DATATABLE */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                                    <th className="py-4 px-6 min-w-[240px]">Metric Dimension</th>
                                    <th className="py-4 px-6 text-right font-black text-slate-800 bg-blue-50/40 min-w-[140px]">{monthA}</th>
                                    <th className="py-4 px-6 text-right font-black text-slate-800 bg-indigo-50/40 min-w-[140px]">{monthB}</th>
                                    <th className="py-4 px-6 text-right font-black text-slate-900 min-w-[140px]">Net Change</th>
                                    <th className="py-4 px-6 text-right font-black text-slate-900 min-w-[120px]">Growth %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="py-16 text-center text-slate-400">
                                            <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-blue-600 block"></i>
                                            Calculating month growth comparisons...
                                        </td>
                                    </tr>
                                ) : comparisonData?.comparisonTable ? (
                                    comparisonData.comparisonTable.map((row, idx) => {
                                        const isPositive = row.netChange > 0;
                                        const isNegative = row.netChange < 0;

                                        return (
                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                                
                                                {/* Metric Dimension */}
                                                <td className="py-3.5 px-6 font-extrabold text-slate-900 whitespace-nowrap">
                                                    {row.label}
                                                </td>

                                                {/* Month A Value */}
                                                <td className="py-3.5 px-6 text-right font-bold text-slate-700 font-mono bg-blue-50/20 whitespace-nowrap">
                                                    {formatVal(row.valA, row.isCurrency)}
                                                </td>

                                                {/* Month B Value */}
                                                <td className="py-3.5 px-6 text-right font-bold text-slate-700 font-mono bg-indigo-50/20 whitespace-nowrap">
                                                    {formatVal(row.valB, row.isCurrency)}
                                                </td>

                                                {/* Net Change */}
                                                <td className={`py-3.5 px-6 text-right font-black font-mono whitespace-nowrap ${
                                                    isPositive ? "text-emerald-600" : isNegative ? "text-red-600" : "text-slate-500"
                                                }`}>
                                                    {isPositive ? `+${formatVal(row.netChange, row.isCurrency)}` : formatVal(row.netChange, row.isCurrency)}
                                                </td>

                                                {/* Growth % */}
                                                <td className="py-3.5 px-6 text-right whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black border inline-block ${
                                                        isPositive
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            : isNegative
                                                            ? "bg-red-50 text-red-700 border-red-200"
                                                            : "bg-slate-100 text-slate-600 border-slate-200"
                                                    }`}>
                                                        {isPositive ? `+${row.pct}%` : `${row.pct}%`}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="py-12 text-center text-slate-400">
                                            No comparison data found.
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
