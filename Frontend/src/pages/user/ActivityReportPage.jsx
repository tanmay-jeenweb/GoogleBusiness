import React, { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";
import { fetchTransactions } from "../../api/uploadApi";
import { formatStandardDate } from "../../utils/dateFormatter";

const REPORT_CONFIGS = {
    "increases": {
        title: "Commitment Increases",
        subtitle: "Review seat expansion values across existing contracts",
        eventsLabel: "Increases",
        seatsLabel: "Expanded Seats",
        billingLabel: "Invoiced Billing",
        icon: "fa-solid fa-chart-line-up",
        matchKeyword: "increase"
    },
    "renewals": {
        title: "Commitment Renewals",
        subtitle: "Review contract renewals and seat commitments",
        eventsLabel: "Renewals",
        seatsLabel: "Renewed Seats",
        billingLabel: "Invoiced Billing",
        icon: "fa-solid fa-[#0056cf] fa-arrows-rotate",
        matchKeyword: "renewal"
    },
    "new-commitments": {
        title: "New Commitments",
        subtitle: "Review newly initiated seat commitments and subscriptions",
        eventsLabel: "New Events",
        seatsLabel: "Committed Seats",
        billingLabel: "Invoiced Billing",
        icon: "fa-solid fa-sparkles",
        matchKeyword: "new commitment"
    },
    "commitments": {
        title: "Commitments",
        subtitle: "Review active baseline commitments and seat allocations",
        eventsLabel: "Events",
        seatsLabel: "Committed Seats",
        billingLabel: "Invoiced Billing",
        icon: "fa-solid fa-file-contract",
        matchKeyword: "commitment"
    },
    "usage": {
        title: "Usage-Based Billing",
        subtitle: "Review flexible usage billing and pay-as-you-go consumption",
        eventsLabel: "Usage Events",
        seatsLabel: "Active Seats",
        billingLabel: "Invoiced Billing",
        icon: "fa-solid fa-bolt",
        matchKeyword: "usage"
    }
};

export default function ActivityReportPage({ reportType: propReportType }) {
    const params = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    // Determine report type from prop, params, or URL pathname
    const getTabFromPath = () => {
        let typeKey = propReportType || params.type;
        if (!typeKey) {
            const path = location.pathname.toLowerCase();
            if (path.includes("increase")) typeKey = "increases";
            else if (path.includes("renewal")) typeKey = "renewals";
            else if (path.includes("new-commitment")) typeKey = "new-commitments";
            else if (path.includes("commitment")) typeKey = "commitments";
            else if (path.includes("usage")) typeKey = "usage";
            else typeKey = "increases";
        }
        return typeKey;
    };

    const [activeTab, setActiveTab] = useState(getTabFromPath());

    useEffect(() => {
        const currentKey = getTabFromPath();
        if (currentKey !== activeTab) {
            setActiveTab(currentKey);
        }
    }, [params.type, location.pathname, propReportType]);

    const handleTabChange = (key) => {
        setActiveTab(key);
        navigate(`/user/reports/${key}`);
    };

    const typeKey = activeTab;
    const config = REPORT_CONFIGS[typeKey] || REPORT_CONFIGS["increases"];

    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMonth, setSelectedMonth] = useState("all");
    const [selectedPlan, setSelectedPlan] = useState("all");
    const [availableMonths, setAvailableMonths] = useState([]);
    const [availablePlans, setAvailablePlans] = useState([]);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchTransactions("all");
            if (res.data?.success) {
                const txns = res.data.transactions || [];
                setTransactions(txns);

                // Extract available billing months and SKU plans
                const monthSet = new Set();
                const planSet = new Set();

                txns.forEach(t => {
                    const bMonth = t.billing_month || (t.date ? formatStandardDate(t.date) : null);
                    if (bMonth && bMonth !== "N/A") monthSet.add(bMonth);
                    if (t.plan_type && t.plan_type !== "N/A") planSet.add(t.plan_type);
                });

                setAvailableMonths(Array.from(monthSet));
                setAvailablePlans(Array.from(planSet));
            } else {
                setTransactions([]);
                setAvailableMonths([]);
                setAvailablePlans([]);
            }
        } catch (error) {
            console.error("Error loading report transactions:", error);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [typeKey]);

    // Filter Logic for Specific Report Type
    const filteredReportTransactions = useMemo(() => {
        return transactions.filter(t => {
            const fullText = (t.description + " " + (t.activity_category || "") + " " + (t.commitment_type || "")).toLowerCase();
            const kw = config.matchKeyword;

            let matchesType = false;
            if (kw === "increases" || kw === "increase") {
                matchesType = fullText.includes("increase");
            } else if (kw === "renewals" || kw === "renewal") {
                matchesType = fullText.includes("renewal");
            } else if (kw === "new commitment") {
                matchesType = fullText.includes("new commitment") || fullText.includes("new account");
            } else if (kw === "usage") {
                matchesType = fullText.includes("usage") || fullText.includes("flex");
            } else if (kw === "commitment") {
                matchesType = fullText.includes("commitment") && !fullText.includes("increase") && !fullText.includes("renewal") && !fullText.includes("new commitment");
            } else {
                matchesType = fullText.includes(kw);
            }

            if (!matchesType) return false;

            // Search Filter
            const matchesSearch = !searchTerm ||
                (t.domain?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                (t.customer_id?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                (t.order_number?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                (t.product?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                (t.plan_type?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                (t.activity_category?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                (t.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());

            // Month Filter
            const rowMonth = t.billing_month || (t.date ? formatStandardDate(t.date) : "");
            const matchesMonth = selectedMonth === "all" || rowMonth.toLowerCase().includes(selectedMonth.toLowerCase());

            // Plan Filter
            const matchesPlan = selectedPlan === "all" || (t.plan_type || "").toLowerCase().includes(selectedPlan.toLowerCase());

            return matchesSearch && matchesMonth && matchesPlan;
        });
    }, [transactions, config.matchKeyword, searchTerm, selectedMonth, selectedPlan]);

    // Summary KPI Calculations
    const totalEventsCount = filteredReportTransactions.length;
    const totalSeatsSum = filteredReportTransactions.reduce((acc, curr) => acc + (parseInt(curr.seats) || 0), 0);
    const totalAmountSum = filteredReportTransactions.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    const formatINR = (val) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
    };

    const handleExportCSV = () => {
        if (filteredReportTransactions.length === 0) {
            toast.error("No report data available to export");
            return;
        }

        const headers = ["Date", "Activity Category", "Plan Type", "Product", "Domain Name", "Customer ID", "Seats", "Amount (INR)", "Order Number", "Full Description"];

        const csvRows = [
            headers.join(","),
            ...filteredReportTransactions.map(t => [
                `"${formatStandardDate(t.date) || ''}"`,
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
        link.setAttribute("download", `Report_${typeKey}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Exported ${filteredReportTransactions.length} report rows to CSV`);
    };

    // DataTable Column Definitions
    const columns = useMemo(() => [
        {
            key: "date",
            label: "Date",
            sortable: true,
            minWidth: "120px",
            render: (row) => (
                <span className="font-bold text-slate-800 whitespace-nowrap">
                    {formatStandardDate(row.date)}
                </span>
            )
        },
        {
            key: "activity_category",
            label: "Activity Category",
            sortable: true,
            minWidth: "150px",
            render: (row) => (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 capitalize whitespace-nowrap">
                    {row.activity_category}
                </span>
            )
        },
        {
            key: "plan_type",
            label: "Plan Type",
            sortable: true,
            minWidth: "160px",
            render: (row) => (
                <span className="text-slate-700 font-semibold truncate block max-w-[180px]" title={row.plan_type}>
                    {row.plan_type}
                </span>
            )
        },
        {
            key: "product",
            label: "Product",
            sortable: true,
            minWidth: "140px",
            render: (row) => (
                <span className="text-slate-500 font-medium whitespace-nowrap">
                    {row.product || "Google Workspace"}
                </span>
            )
        },
        {
            key: "domain",
            label: "Domain",
            sortable: true,
            minWidth: "180px",
            render: (row) => (
                <span className="font-extrabold text-blue-700 whitespace-nowrap">
                    {row.domain}
                </span>
            )
        },
        {
            key: "customer_id",
            label: "Customer ID",
            sortable: true,
            minWidth: "130px",
            render: (row) => (
                <span className="font-mono font-bold text-slate-600 whitespace-nowrap">
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
                <span className="font-extrabold text-emerald-700 font-mono whitespace-nowrap text-right block">
                    {formatINR(row.amount)}
                </span>
            )
        },
        {
            key: "order_number",
            label: "Order Number",
            sortable: true,
            minWidth: "140px",
            render: (row) => (
                <span className="font-mono text-slate-500 text-[11px] whitespace-nowrap">
                    {row.order_number}
                </span>
            )
        },
        {
            key: "description",
            label: "Full Description",
            sortable: true,
            minWidth: "220px",
            render: (row) => (
                <span className="text-slate-600 text-[11px] max-w-[320px] truncate block" title={row.description}>
                    {row.description}
                </span>
            )
        }
    ], []);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar title={`Activity Reports - ${config.title}`} />

            <main className="flex-1 w-full max-w-[96rem] mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6 flex flex-col">
                
                {/* TOP TAB NAVIGATION BAR (Matching User Master Screenshot Style) */}
                <div className="flex items-center gap-6 sm:gap-8 border-b border-slate-200 px-1 font-sans overflow-x-auto">
                    {Object.entries(REPORT_CONFIGS).map(([key, cfg]) => {
                        const isActive = activeTab === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => handleTabChange(key)}
                                className={`pb-3 px-1 text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                                    isActive
                                        ? "border-[#0256d0] text-[#0256d0]"
                                        : "border-transparent text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                {cfg.title}
                            </button>
                        );
                    })}
                </div>

                {/* TOOLBAR: Single-line Inline KPI Badges + Plan & Month Filters */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
                    
                    {/* Inline Summary Metrics */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50/80 rounded-lg border border-blue-200/70 text-xs whitespace-nowrap">
                            <i className="fa-solid fa-list-check text-blue-600 text-[11px]"></i>
                            <span className="font-bold text-slate-600">{config.eventsLabel}:</span>
                            <span className="font-black text-slate-900 font-mono">{totalEventsCount}</span>
                        </div>

                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50/80 rounded-lg border border-indigo-200/70 text-xs whitespace-nowrap">
                            <i className="fa-solid fa-users text-indigo-600 text-[11px]"></i>
                            <span className="font-bold text-slate-600">{config.seatsLabel}:</span>
                            <span className="font-black text-indigo-700 font-mono">{totalSeatsSum} Seats</span>
                        </div>

                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50/80 rounded-lg border border-emerald-200/70 text-xs whitespace-nowrap">
                            <i className="fa-solid fa-indian-rupee-sign text-emerald-600 text-[11px]"></i>
                            <span className="font-bold text-slate-600">{config.billingLabel}:</span>
                            <span className="font-black text-emerald-700 font-mono">{formatINR(totalAmountSum)}</span>
                        </div>
                    </div>

                    {/* Plan & Month Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* PLAN TYPE FILTER */}
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                <i className="fa-solid fa-layer-group text-indigo-600 text-[11px]"></i> Plan:
                            </span>
                            <select
                                value={selectedPlan}
                                onChange={(e) => setSelectedPlan(e.target.value)}
                                className="bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none cursor-pointer"
                            >
                                <option value="all">All Plans</option>
                                {availablePlans.map((p, idx) => (
                                    <option key={idx} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>

                        {/* SELECT MONTH FILTER */}
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                <i className="fa-regular fa-calendar-days text-blue-600 text-[11px]"></i> Month:
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
                    </div>

                </div>

                {/* FULL REPORT DATATABLE */}
                <div className="flex-1 flex flex-col w-full">
                    <DataTable
                        tableId={`activity_report_${typeKey}`}
                        title={`${config.title}`}
                        data={filteredReportTransactions}
                        columns={columns}
                        loading={loading}
                        defaultPageSize={8}
                        showTopPagination={false}
                        actionButton={
                            <button
                                onClick={handleExportCSV}
                                title={`Export CSV (${filteredReportTransactions.length} rows)`}
                                className="h-10 w-10 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center shrink-0"
                            >
                                <i className="fa-solid fa-file-excel text-base"></i>
                            </button>
                        }
                        searchPlaceholder="Search report by domain, customer ID, or order number..."
                    />
                </div>

            </main>
        </div>
    );
}
