import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";
import { fetchTransactions, updateTransactionCategory } from "../../api/uploadApi";
import { formatStandardDate } from "../../utils/dateFormatter";

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState("all"); // 'all' | 'August 2026' | etc.
    const [selectedPlan, setSelectedPlan] = useState("all");
    const [availableMonths, setAvailableMonths] = useState([]);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [isAmountVisible, setIsAmountVisible] = useState(true);

    const handleColumnVisibilityChange = (info) => {
        if (info && typeof info.isKeyVisible === 'function') {
            setIsAmountVisible(info.isKeyVisible('amount'));
        }
    };

    const loadTransactions = async () => {
        try {
            setLoading(true);
            const res = await fetchTransactions("all");
            if (res.data?.success) {
                const txns = res.data.transactions || [];
                setTransactions(txns);

                // Extract unique billing months dynamically
                const monthSet = new Set();
                const planSet = new Set();

                txns.forEach(t => {
                    const bMonth = t.billing_month || (t.date ? formatStandardDate(t.date) : null);
                    if (bMonth && bMonth !== "N/A") {
                        monthSet.add(bMonth);
                    }

                    const pPlan = t.payment_plan || t.paymentPlan;
                    if (pPlan && pPlan !== "N/A" && pPlan.trim()) {
                        planSet.add(pPlan.trim());
                    }

                    const sku = t.plan_type || t.sku_plan;
                    if (sku && sku !== "N/A" && sku.trim() && !sku.toLowerCase().includes("gst")) {
                        planSet.add(sku.trim());
                    }
                });

                setAvailableMonths(Array.from(monthSet));
                setAvailablePlans(Array.from(planSet));
            } else {
                setTransactions([]);
                setAvailableMonths([]);
                setAvailablePlans([]);
            }
        } catch (error) {
            console.error("Error fetching transactions from MySQL:", error);
            setTransactions([]);
            setAvailableMonths([]);
            setAvailablePlans([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryChange = async (id, newCategory) => {
        try {
            const res = await updateTransactionCategory(id, newCategory);
            if (res.data?.success) {
                setTransactions(prev => prev.map(item => item.id === id ? { ...item, activity_category: newCategory } : item));
                toast.success(`Category updated to "${newCategory}"`);
            } else {
                toast.error(res.data?.message || "Failed to update category");
            }
        } catch (error) {
            console.error("Error updating category:", error);
            toast.error("Failed to update activity category");
        }
    };

    useEffect(() => {
        loadTransactions();
    }, []);

    // Pre-filter by month & plan type for DataTable consumption
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const isGstRow = t.commitment_type === "GST / Tax Summary" || 
                             t.domain === "GST Tax (Integrated GST)" || 
                             t.customer_id === "GST-TAX";

            // If GST filter is explicitly selected, return only GST Tax summary row
            if (selectedPlan === "gst") {
                return isGstRow;
            }

            // Month filter
            const rowMonth = t.billing_month || (t.date ? formatStandardDate(t.date) : "");
            const matchesMonth = selectedMonth === "all" || rowMonth.toLowerCase().includes(selectedMonth.toLowerCase());

            // Plan filter matching exact category options
            const pPlan = (t.payment_plan || "").toLowerCase();
            let matchesPlan = true;

            if (selectedPlan === "annual_yearly") {
                matchesPlan = !isGstRow && (pPlan.includes("yearly") || pPlan.includes("annual plan (yearly"));
            } else if (selectedPlan === "annual_monthly") {
                matchesPlan = !isGstRow && (pPlan.includes("annual plan (monthly") || (pPlan.includes("annual") && !pPlan.includes("yearly")));
            } else if (selectedPlan === "36_month") {
                matchesPlan = !isGstRow && (pPlan.includes("36") || pPlan.includes("3 year"));
            } else if (selectedPlan === "flexi") {
                matchesPlan = !isGstRow && pPlan.includes("flex");
            } else if (selectedPlan === "free") {
                matchesPlan = !isGstRow && pPlan.includes("free");
            } else if (selectedPlan === "all") {
                matchesPlan = true; // Include GST Tax summary row in All Plans
            }

            return matchesMonth && matchesPlan;
        });
    }, [transactions, selectedMonth, selectedPlan]);

    const formatINR = (val) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
    };

    // Define all 15 transaction fields in column specifications
    const columns = useMemo(() => [
        {
            key: "date",
            label: "Date",
            sortable: true,
            minWidth: "130px",
            render: (row) => formatStandardDate(row.date)
        },
        {
            key: "seller_company",
            label: "Reseller",
            sortable: true,
            minWidth: "150px",
            render: (row) => (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    (row.seller_company || "").toLowerCase().includes("satva")
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : "bg-sky-50 text-sky-700 border-sky-200"
                }`}>
                    {row.seller_company || "Panel 1 (JeenWeb)"}
                </span>
            )
        },
        {
            key: "billing_month",
            label: "Billing Month",
            sortable: true,
            minWidth: "130px",
            render: (row) => (
                <span className="font-semibold text-slate-700">
                    {row.billing_month || "N/A"}
                </span>
            )
        },
        {
            key: "activity_category",
            label: "Activity Category",
            sortable: true,
            minWidth: "190px",
            render: (row) => (
                <select
                    value={(row.activity_category || "").toLowerCase()}
                    onChange={(e) => handleCategoryChange(row.id, e.target.value)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50/80 text-indigo-700 border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer capitalize transition-all hover:bg-indigo-100"
                >
                    <option value="commitment increase">Commitment Increase</option>
                    <option value="commitment renewal">Commitment Renewal</option>
                    <option value="new commitment">New Commitment</option>
                    <option value="commitment">Commitment</option>
                    <option value="usage">Usage-Based</option>
                </select>
            )
        },
        {
            key: "plan_type",
            label: "Plan Type (SKU)",
            sortable: true,
            minWidth: "190px",
            render: (row) => (
                <span className="text-slate-600 font-semibold max-w-[180px] truncate block" title={row.plan_type}>
                    {row.plan_type}
                </span>
            )
        },
        {
            key: "product",
            label: "Product",
            sortable: true,
            minWidth: "150px",
            render: (row) => (
                <span className="text-slate-600 font-medium">
                    {row.product || "Google Workspace"}
                </span>
            )
        },
        {
            key: "payment_plan",
            label: "Payment Plan / Terms",
            sortable: true,
            minWidth: "180px",
            render: (row) => (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    (row.payment_plan || "").toLowerCase().includes("monthly")
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : (row.payment_plan || "").toLowerCase().includes("yearly")
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                    • {row.payment_plan || "Annual Plan (Monthly Payment)"}
                </span>
            )
        },
        {
            key: "domain",
            label: "Domain Name",
            sortable: true,
            minWidth: "170px",
            render: (row) => (
                <span className="font-extrabold text-[#0256d0]">
                    {row.domain}
                </span>
            )
        },
        {
            key: "customer_id",
            label: "Customer ID",
            sortable: true,
            minWidth: "140px",
            render: (row) => (
                <span className="font-mono font-bold text-slate-600">
                    {row.customer_id}
                </span>
            )
        },
        {
            key: "seats",
            label: "Seats",
            sortable: true,
            minWidth: "90px",
            render: (row) => (
                <span className="text-center font-extrabold text-slate-900 font-mono block">
                    {row.seats}
                </span>
            )
        },
        {
            key: "amount",
            label: "Amount (INR)",
            sortable: true,
            minWidth: "140px",
            render: (row) => (
                <span className="text-right font-extrabold text-emerald-700 font-mono block">
                    {formatINR(row.amount)}
                </span>
            )
        },
        {
            key: "order_number",
            label: "Order Number",
            sortable: true,
            minWidth: "150px",
            render: (row) => (
                <span className="font-mono font-bold text-slate-500">
                    {row.order_number || "N/A"}
                </span>
            )
        },
        {
            key: "creation_date",
            label: "Creation Date",
            sortable: true,
            minWidth: "130px",
            render: (row) => (
                <span className="text-slate-600 font-medium">
                    {row.creation_date || "N/A"}
                </span>
            )
        },
        {
            key: "renewal_date",
            label: "Renewal Date",
            sortable: true,
            minWidth: "130px",
            render: (row) => (
                <span className="text-slate-600 font-medium">
                    {row.renewal_date || "N/A"}
                </span>
            )
        },
        {
            key: "description",
            label: "Full Description",
            sortable: true,
            minWidth: "250px",
            render: (row) => (
                <span className="text-slate-500 font-medium max-w-sm truncate block" title={row.description}>
                    {row.description || "N/A"}
                </span>
            )
        }
    ], []);

    // Export to Excel (.csv) with all filtered rows
    const handleExportExcel = () => {
        if (filteredTransactions.length === 0) {
            toast.error("No transactions available to export");
            return;
        }

        const headers = [
            "ID", "Seller Company", "Date", "Billing Month", "Activity Category", 
            "Plan Type (SKU)", "Payment Plan / Terms", "Product", "Domain Name", 
            "Customer ID", "Seats", "Amount (INR)", "Order Number", "Creation Date", "Renewal Date", "Description"
        ];

        const csvRows = [
            headers.join(","),
            ...filteredTransactions.map(t => [
                t.id,
                `"${t.seller_company || ''}"`,
                `"${formatStandardDate(t.date) || ''}"`,
                `"${t.billing_month || ''}"`,
                `"${t.activity_category || ''}"`,
                `"${t.plan_type || ''}"`,
                `"${t.payment_plan || 'Annual Plan (Monthly Payment)'}"`,
                `"${t.product || ''}"`,
                `"${t.domain || ''}"`,
                `"${t.customer_id || ''}"`,
                t.seats || 1,
                t.amount || 0,
                `"${t.order_number || ''}"`,
                `"${t.creation_date || ''}"`,
                `"${t.renewal_date || ''}"`,
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

    // Summary Metric Calculations
    const totalItems = filteredTransactions.length;
    const totalAmountSum = filteredTransactions.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    const totalSeatsSum = filteredTransactions.reduce((acc, curr) => acc + (parseInt(curr.seats) || 0), 0);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar title="Transaction Section" />

            <main className="flex-1 w-full max-w-[96rem] mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col">
                {/* PRIMARY UNIFIED DATA TABLE FOR TRANSACTIONS */}
                <div className="flex-1 flex flex-col">
                    <DataTable
                        tableId="user_transactions_table"
                        title="Transaction Section"
                        data={filteredTransactions}
                        columns={columns}
                        loading={loading}
                        defaultPageSize={8}
                        showTopPagination={false}
                        searchPlaceholder="Search domain, order #, SKU, CID..."
                        onColumnVisibilityChange={handleColumnVisibilityChange}
                        toggleActions={
                            <div className="flex items-center gap-2">
                                {/* DYNAMIC BILLING MONTH FILTER */}
                                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-300">
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

                                {/* PLAN TYPE / PAYMENT TERM FILTER */}
                                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-300">
                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                        <i className="fa-solid fa-file-contract text-indigo-600"></i> Plan:
                                    </span>
                                    <select
                                        value={selectedPlan}
                                        onChange={(e) => setSelectedPlan(e.target.value)}
                                        className="bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none cursor-pointer"
                                    >
                                        <option value="all">All Plans</option>
                                        <option value="annual_yearly">Annual Plan (Yearly Payment)</option>
                                        <option value="annual_monthly">Annual Plan (Monthly Payment)</option>
                                        <option value="36_month">36 Month Plan</option>
                                        <option value="flexi">Flexi Plan</option>
                                        <option value="free">Free Plan</option>
                                        <option value="gst">GST / Tax Summary</option>
                                    </select>
                                </div>
                            </div>
                        }
                        actionButton={
                            <button
                                onClick={handleExportExcel}
                                title={`Export CSV (${filteredTransactions.length} rows)`}
                                className="h-10 w-10 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center shrink-0"
                            >
                                <i className="fa-solid fa-file-excel text-base"></i>
                            </button>
                        }
                        renderFooter={(visibleCols, rowsToSum) => {
                            const sumAmount = rowsToSum.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
                            const sumSeats = rowsToSum.reduce((acc, curr) => acc + (parseInt(curr.seats) || 0), 0);

                            return (
                                <tr className="bg-slate-100/90 font-extrabold border-t-2 border-slate-300 text-slate-900">
                                    {visibleCols.map((col) => {
                                        if (col.key === "date") {
                                            return (
                                                <td key={col.key} className="px-3 py-2.5 text-xs font-black text-slate-800 uppercase tracking-wider">
                                                    Total ({rowsToSum.length} rows)
                                                </td>
                                            );
                                        }
                                        if (col.key === "seats") {
                                            return (
                                                <td key={col.key} className="px-3 py-2.5 text-center text-xs font-black font-mono text-slate-900">
                                                    {sumSeats}
                                                </td>
                                            );
                                        }
                                        if (col.key === "amount") {
                                            return (
                                                <td key={col.key} className="px-3 py-2.5 text-right text-xs font-black font-mono text-emerald-700 bg-emerald-50/70 border-l border-r border-emerald-200">
                                                    {formatINR(sumAmount)}
                                                </td>
                                            );
                                        }
                                        return <td key={col.key} className="px-3 py-2.5 text-xs text-slate-400">-</td>;
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
