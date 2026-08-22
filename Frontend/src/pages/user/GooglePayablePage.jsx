import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";

export default function GooglePayablePage() {
    const [reportData, setReportData] = useState({ months: [], rows: [], month_totals: [], grand_total: 0, summary: {} });
    const [loading, setLoading] = useState(true);
    const [companyFilter, setCompanyFilter] = useState("all"); // 'all' | 'jeenweb' | 'satvaweb'
    const [planFilter, setPlanFilter] = useState("all"); // 'all' | 'monthly' | 'flexy' | 'yearly'

    const loadPayableData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const res = await axios.get(`http://localhost:5000/api/dashboard/google-payable?company=${companyFilter}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.success) {
                setReportData(res.data.data || { months: [], rows: [], month_totals: [], grand_total: 0, summary: {} });
            }
        } catch (error) {
            console.error("Error fetching Google Payable matrix:", error);
            toast.error("Failed to load Google Payable 12-month matrix");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPayableData();
    }, [companyFilter]);

    // Filter rows by payment plan (DataTable handles search automatically)
    const filteredRows = useMemo(() => {
        return (reportData.rows || []).filter(row => {
            const planStr = (row.payment_plan || "").toLowerCase();
            let matchesPlan = true;
            if (planFilter === "monthly") {
                matchesPlan = planStr.includes("monthly") || planStr.includes("annual plan (monthly");
            } else if (planFilter === "flexy" || planFilter === "flexible") {
                matchesPlan = planStr.includes("flex") || planStr.includes("usage");
            } else if (planFilter === "yearly") {
                matchesPlan = planStr.includes("yearly") || planStr.includes("annual plan (yearly");
            }
            return matchesPlan;
        });
    }, [reportData.rows, planFilter]);

    // Compute dynamic totals for summary KPI cards
    const monthsCount = (reportData.months || []).length || 12;
    const filteredMonthTotals = Array(monthsCount).fill(0);
    let filteredGrandTotal = 0;
    let filteredSeatsTotal = 0;

    filteredRows.forEach(row => {
        filteredSeatsTotal += (row.total_seats || 0);
        filteredGrandTotal += (row.domain_total || 0);
        if (row.months_grid) {
            row.months_grid.forEach((m, idx) => {
                filteredMonthTotals[idx] += (m.amount || 0);
            });
        }
    });

    const formatINR = (val) => {
        if (!val || val === 0) return "-";
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
    };

    const handleExportCSV = () => {
        if (filteredRows.length === 0) {
            toast.error("No data available to export");
            return;
        }

        const monthLabels = (reportData.months || []).map(m => m.label);
        const headers = [
            "Panel",
            "Domain Name",
            "Customer ID",
            "SKU Plan",
            "Payment Plan / Terms",
            "Start Date",
            "Expiry Date",
            "Seats",
            ...monthLabels,
            "12-Month Domain Total (INR)"
        ];

        const csvRows = [
            headers.join(","),
            ...filteredRows.map(r => [
                `"${r.company}"`,
                `"${r.domain_name}"`,
                `"${r.customer_id}"`,
                `"${r.sku_plan}"`,
                `"${r.payment_plan || 'Annual Plan (Monthly Payment)'}"`,
                `"${r.start_date}"`,
                `"${r.end_date}"`,
                r.total_seats,
                ...(r.months_grid || []).map(m => m.amount || 0),
                r.domain_total || 0
            ].join(","))
        ];

        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `Google_Payable_12Mo_Matrix_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Exported ${filteredRows.length} domains to CSV`);
    };

    // Construct DataTable Column definitions dynamically
    const columns = useMemo(() => {
        const baseCols = [
            {
                key: "company",
                label: "Panel",
                minWidth: "90px",
                render: (row) => (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        row.company === "Panel 2" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-sky-50 text-sky-700 border-sky-200"
                    }`}>
                        {row.company}
                    </span>
                )
            },
            {
                key: "domain_name",
                label: "Domain & Customer ID",
                minWidth: "170px",
                render: (row) => (
                    <div>
                        <div className="font-extrabold text-[#0256d0] truncate max-w-[160px]" title={row.domain_name}>{row.domain_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{row.customer_id}</div>
                    </div>
                )
            },
            {
                key: "sku_plan",
                label: "Plan",
                minWidth: "150px",
                render: (row) => (
                    <div className="font-bold text-slate-800 truncate max-w-[150px]" title={row.sku_plan}>{row.sku_plan}</div>
                )
            },
            {
                key: "start_date",
                label: "Start",
                minWidth: "90px",
                render: (row) => <span className="text-slate-500 font-mono text-[11px]">{row.start_date}</span>
            },
            {
                key: "end_date",
                label: "Expiry",
                minWidth: "90px",
                render: (row) => <span className="text-slate-500 font-mono text-[11px]">{row.end_date}</span>
            },
            {
                key: "total_seats",
                label: "Seats",
                minWidth: "60px",
                render: (row) => <span className="font-bold text-slate-800 flex justify-center">{row.total_seats}</span>
            }
        ];

        // Dynamic 12 Month Projection Columns
        const monthCols = (reportData.months || []).map((m, mIdx) => ({
            key: `month_${mIdx}`,
            label: m.label,
            minWidth: "100px",
            render: (row) => {
                const cell = row.months_grid?.[mIdx] || { amount: 0 };
                const isCurrentMonth = mIdx === 0;

                return (
                    <div className={`text-right font-mono text-[11px] ${
                        isCurrentMonth
                            ? "bg-blue-50/90 text-blue-950 font-extrabold px-1.5 py-0.5 rounded-md border border-blue-200/90"
                            : cell.isExpiryMonth
                            ? "bg-amber-100/90 text-amber-950 font-extrabold px-1.5 py-0.5 rounded-md border border-amber-300"
                            : cell.isExpired
                            ? "text-slate-300 font-normal"
                            : "text-slate-800 font-semibold"
                    }`}>
                        {cell.isExpiryMonth ? (
                            <div className="flex flex-col items-end">
                                <span>{formatINR(cell.amount)}</span>
                                <span className="text-[8.5px] uppercase tracking-tighter text-amber-800 font-extrabold flex items-center gap-0.5">
                                    <i className="fa-solid fa-clock text-[8px]"></i> Expires
                                </span>
                            </div>
                        ) : isCurrentMonth && cell.amount > 0 ? (
                            <div className="flex flex-col items-end">
                                <span>{formatINR(cell.amount)}</span>
                                <span className="text-[8px] uppercase tracking-tighter text-blue-700 font-extrabold">
                                    Current
                                </span>
                            </div>
                        ) : (
                            formatINR(cell.amount)
                        )}
                    </div>
                );
            }
        }));

        const totalCol = {
            key: "domain_total",
            label: "12-Mo Domain Total",
            minWidth: "130px",
            render: (row) => (
                <div className="text-right font-mono font-extrabold text-indigo-950">
                    {formatINR(row.domain_total)}
                </div>
            )
        };

        return [...baseCols, ...monthCols, totalCol];
    }, [reportData.months]);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar title="Google Payable Matrix" />

            <main className="flex-1 w-full max-w-[98rem] mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 flex flex-col">
                
                {/* Single Executive Header Bar with Title + 4 Inline Metrics */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 xl:gap-6">
                    {/* Simplified Title */}
                    <div className="shrink-0">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            Google Payable
                        </h1>
                    </div>

                    {/* Inline Metrics Bar */}
                    <div className="flex flex-wrap items-center gap-4 xl:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 w-full xl:w-auto">
                        {/* Metric 1: Current Month Payable */}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                                <i className="fa-solid fa-money-bill-wave text-xs"></i>
                            </div>
                            <div>
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Current Month Payable</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-base font-black text-slate-900 font-mono">{formatINR(filteredMonthTotals[0] || 0)}</span>
                                    <span className="text-[10px] font-semibold text-slate-400">Aug 2026</span>
                                </div>
                            </div>
                        </div>

                        {/* Metric 2: 12-Month Grand Total */}
                        <div className="flex items-center gap-3 sm:pl-5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                                <i className="fa-solid fa-calculator text-xs"></i>
                            </div>
                            <div>
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">12-Mo Grand Total</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-base font-black text-indigo-950 font-mono">{formatINR(filteredGrandTotal)}</span>
                                    <span className="text-[10px] font-semibold text-slate-400">Commitment</span>
                                </div>
                            </div>
                        </div>

                        {/* Metric 3: Active Seats Billed */}
                        <div className="flex items-center gap-3 sm:pl-5">
                            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold shrink-0">
                                <i className="fa-solid fa-users text-xs"></i>
                            </div>
                            <div>
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Active Seats Billed</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-base font-black text-slate-900 font-mono">{filteredSeatsTotal}</span>
                                    <span className="text-[10px] font-semibold text-slate-400">({filteredRows.length} domains)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Primary Unified DataTable for Google Payable Matrix */}
                <div className="flex-1 flex flex-col">
                    <DataTable
                        tableId="google_payable_matrix_table"
                        title="Google Payable & Subscription Matrix"
                        data={filteredRows}
                        columns={columns}
                        loading={loading}
                        defaultPageSize={8}
                        showTopPagination={false}
                        searchPlaceholder="Search Domain, Customer ID..."
                        toggleActions={
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-500">Plan Filter:</label>
                                <select
                                    value={planFilter}
                                    onChange={(e) => setPlanFilter(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                                >
                                    <option value="all">All Plans</option>
                                    <option value="monthly">Annual (Monthly)</option>
                                    <option value="flexy">Flexi</option>
                                    <option value="yearly">Annual (Yearly)</option>
                                </select>
                            </div>
                        }
                        actionButton={
                            <button
                                onClick={handleExportCSV}
                                title={`Export Matrix CSV (${filteredRows.length} domains)`}
                                className="h-10 w-10 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center shrink-0"
                            >
                                <i className="fa-solid fa-file-excel text-base"></i>
                            </button>
                        }
                        renderFooter={(visibleCols, rowsToSum) => {
                            const sumSeats = rowsToSum.reduce((acc, curr) => acc + (curr.total_seats || 0), 0);
                            const sumDomainTotal = rowsToSum.reduce((acc, curr) => acc + (curr.domain_total || 0), 0);
                            const monthSumArray = (reportData.months || []).map((_, mIdx) => {
                                return rowsToSum.reduce((acc, curr) => acc + (curr.months_grid?.[mIdx]?.amount || 0), 0);
                            });

                            return (
                                <tr className="bg-slate-100/90 font-extrabold border-t-2 border-slate-300 text-slate-900">
                                    {visibleCols.map((col) => {
                                        if (col.key === "company" || col.key === "domain_name") {
                                            if (col.key === "domain_name") {
                                                return (
                                                    <td key={col.key} className="px-3 py-3 text-xs font-black text-slate-800 uppercase tracking-wider">
                                                        Total ({rowsToSum.length} domains)
                                                    </td>
                                                );
                                            }
                                            return <td key={col.key} className="px-3 py-3"></td>;
                                        }
                                        if (col.key === "total_seats") {
                                            return (
                                                <td key={col.key} className="px-3 py-3 text-center text-xs font-black font-mono text-slate-900">
                                                    {sumSeats}
                                                </td>
                                            );
                                        }
                                        if (col.key.startsWith("month_")) {
                                            const mIdx = parseInt(col.key.replace("month_", ""));
                                            return (
                                                <td key={col.key} className="px-3 py-3 text-right text-xs font-extrabold font-mono text-emerald-700">
                                                    {formatINR(monthSumArray[mIdx])}
                                                </td>
                                            );
                                        }
                                        if (col.key === "domain_total") {
                                            return (
                                                <td key={col.key} className="px-3 py-3 text-right text-xs font-black font-mono text-emerald-800 bg-emerald-50/80">
                                                    {formatINR(sumDomainTotal)}
                                                </td>
                                            );
                                        }
                                        return <td key={col.key} className="px-3 py-3 text-slate-400 text-xs">-</td>;
                                    })}
                                </tr>
                            );
                        }}
                    />
                </div>

            </main>
        </div>
    );
}
