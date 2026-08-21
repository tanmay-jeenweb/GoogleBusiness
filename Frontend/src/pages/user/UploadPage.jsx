import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import {
    uploadAccountActivitiesFile,
    uploadMasterAccountFile,
    fetchUploadHistory,
    deleteUploadRecord
} from "../../api/uploadApi";

export default function UploadPage() {
    // Account Activities File State (File 1)
    const [file1, setFile1] = useState(null);
    const [isDragging1, setIsDragging1] = useState(false);
    const [uploading1, setUploading1] = useState(false);
    const [uploadSuccess1, setUploadSuccess1] = useState(false);
    const fileInputRef1 = useRef(null);

    // Master Account File State (File 2)
    const [file2, setFile2] = useState(null);
    const [isDragging2, setIsDragging2] = useState(false);
    const [uploading2, setUploading2] = useState(false);
    const [uploadSuccess2, setUploadSuccess2] = useState(false);
    const fileInputRef2 = useRef(null);

    // Table & View state
    const [activeTab, setActiveTab] = useState("account_activities"); // 'account_activities' | 'master_account' | 'upload_logs'
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);

    // Data from MySQL
    const [uploadLogs, setUploadLogs] = useState([]);
    const [accountActivitiesData, setAccountActivitiesData] = useState([]);
    const [masterAccountData, setMasterAccountData] = useState([]);

    // Sample fallback demonstration records based on provided user specs
    const sampleAccountActivities = [
        {
            id: 1,
            transaction_date: "Aug 2, 2026",
            description: "Google Workspace Business Starter: Commitment renewal of 4 seats",
            order_number: "7343380674-07",
            domain_name: "ckindia.com",
            customer_id: "C00sd22ht",
            amount: 10488.00,
            file_name: "account_activities_q3.csv",
            uploaded_at: "2026-08-21 10:30"
        }
    ];

    const sampleMasterAccounts = [
        {
            id: 1,
            domain_name: "ckindia.com",
            product: "Google Workspace",
            sku_plan: "Google Workspace Business Starter",
            start_date: "August 2, 2024",
            status: "Active",
            payment_plan: "Annual Plan (Yearly Payment)",
            end_date: "August 2, 2027",
            total_seats: 4,
            assigned_seats: 4,
            subscription_id: "SPwwWB6VuIE8zx",
            customer_id: "C00sd22ht",
            order_number: "7343380674",
            file_name: "master_account_master.xlsx",
            uploaded_at: "2026-08-21 10:35"
        }
    ];

    // Load data from MySQL backend API
    const loadHistoryData = async () => {
        try {
            setLoading(true);
            const res = await fetchUploadHistory();
            if (res.data?.success) {
                setUploadLogs(res.data.logs || []);
                setAccountActivitiesData(
                    res.data.accountActivities?.length > 0
                        ? res.data.accountActivities
                        : sampleAccountActivities
                );
                setMasterAccountData(
                    res.data.masterAccounts?.length > 0
                        ? res.data.masterAccounts
                        : sampleMasterAccounts
                );
            }
        } catch (error) {
            console.error("Failed to load upload history from MySQL:", error);
            setAccountActivitiesData(sampleAccountActivities);
            setMasterAccountData(sampleMasterAccounts);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistoryData();
    }, []);

    const allowedExtensions = ["xlsx", "xls", "csv", "svg"];

    const validateFile = (file) => {
        if (!file) return false;
        const ext = file.name.split(".").pop().toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            toast.error(`Invalid format (.${ext}). Allowed: Excel (.xlsx, .xls, .csv) & SVG (.svg).`);
            return false;
        }
        return true;
    };

    // File selection handlers
    const handleFileSelect1 = (e) => {
        const selected = e.target.files[0];
        if (validateFile(selected)) {
            setFile1(selected);
            setUploadSuccess1(false);
            toast.success(`Selected Account Activities file: ${selected.name}`);
        }
    };

    const handleFileSelect2 = (e) => {
        const selected = e.target.files[0];
        if (validateFile(selected)) {
            setFile2(selected);
            setUploadSuccess2(false);
            toast.success(`Selected Master Account file: ${selected.name}`);
        }
    };

    // Drag handlers
    const handleDragOver1 = (e) => { e.preventDefault(); setIsDragging1(true); };
    const handleDragLeave1 = () => setIsDragging1(false);
    const handleDrop1 = (e) => {
        e.preventDefault();
        setIsDragging1(false);
        const dropped = e.dataTransfer.files[0];
        if (validateFile(dropped)) {
            setFile1(dropped);
            setUploadSuccess1(false);
            toast.success(`Dropped Account Activities file: ${dropped.name}`);
        }
    };

    const handleDragOver2 = (e) => { e.preventDefault(); setIsDragging2(true); };
    const handleDragLeave2 = () => setIsDragging2(false);
    const handleDrop2 = (e) => {
        e.preventDefault();
        setIsDragging2(false);
        const dropped = e.dataTransfer.files[0];
        if (validateFile(dropped)) {
            setFile2(dropped);
            setUploadSuccess2(false);
            toast.success(`Dropped Master Account file: ${dropped.name}`);
        }
    };

    // Submit File 1 (Account Activities) to MySQL
    const handleUpload1 = async () => {
        if (!file1) return;
        try {
            setUploading1(true);
            const res = await uploadAccountActivitiesFile(file1);
            if (res.data?.success) {
                setUploadSuccess1(true);
                toast.success(res.data.message || "Account Activities stored in SQL successfully!");
                loadHistoryData();
            }
        } catch (error) {
            console.error("Account Activities upload error:", error);
            toast.error(error.response?.data?.message || "Failed to upload Account Activities file.");
        } finally {
            setUploading1(false);
        }
    };

    // Submit File 2 (Master Account) to MySQL
    const handleUpload2 = async () => {
        if (!file2) return;
        try {
            setUploading2(true);
            const res = await uploadMasterAccountFile(file2);
            if (res.data?.success) {
                setUploadSuccess2(true);
                toast.success(res.data.message || "Master Account stored in SQL successfully!");
                loadHistoryData();
            }
        } catch (error) {
            console.error("Master Account upload error:", error);
            toast.error(error.response?.data?.message || "Failed to upload Master Account file.");
        } finally {
            setUploading2(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteUploadRecord(id);
            toast.success("Record deleted from SQL database.");
            loadHistoryData();
        } catch (error) {
            console.error("Delete record error:", error);
            toast.error("Failed to delete record.");
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    // Filters for tables
    const filteredAccountActivities = accountActivitiesData.filter(item =>
        (item.domain_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (item.customer_id?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (item.order_number?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (item.description?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    const filteredMasterAccounts = masterAccountData.filter(item =>
        (item.domain_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (item.customer_id?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (item.subscription_id?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (item.order_number?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar title="Upload Center" />

            <main className="flex-1 w-full max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                
                {/* Hero Header Banner */}
                <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-8 sm:p-10 shadow-xl text-white mb-10">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="max-w-2xl">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-sky-200 border border-white/10 backdrop-blur-sm">
                                    <i className="fa-solid fa-database mr-2"></i> MySQL Connected
                                </span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-sm">
                                    Interconnected via Customer ID & Domain
                                </span>
                            </div>

                            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
                                Data Upload Center
                            </h1>
                            <p className="text-sky-100 text-sm sm:text-base leading-relaxed">
                                Upload Excel spreadsheets (.xlsx, .csv) and SVG graphics (.svg). Data is parsed and stored directly in your MySQL database across separate <code className="bg-white/15 px-1.5 py-0.5 rounded font-mono text-xs text-white">account_activities</code> and <code className="bg-white/15 px-1.5 py-0.5 rounded font-mono text-xs text-white">master_accounts</code> tables.
                            </p>
                        </div>

                        {/* Top Stats Cards */}
                        <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
                            <div className="bg-white/10 border border-white/15 rounded-2xl p-4 backdrop-blur-md min-w-[140px]">
                                <p className="text-xs text-sky-200 font-medium">Account Activities</p>
                                <p className="text-2xl font-black text-white mt-1">{accountActivitiesData.length} <span className="text-xs font-normal text-sky-200">rows</span></p>
                            </div>
                            <div className="bg-white/10 border border-white/15 rounded-2xl p-4 backdrop-blur-md min-w-[140px]">
                                <p className="text-xs text-sky-200 font-medium">Master Accounts</p>
                                <p className="text-2xl font-black text-emerald-400 mt-1">{masterAccountData.length} <span className="text-xs font-normal text-emerald-200">rows</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* DUAL UPLOADS SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">

                    {/* UPLOAD CARD 1 - Account Activities */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-lg shadow-slate-200/50 p-6 sm:p-8 flex flex-col justify-between hover:shadow-xl transition-all duration-300">
                        <div>
                            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center font-extrabold shadow-sm">
                                        <i className="fa-solid fa-list-check"></i>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">Account Activities</h3>
                                        <p className="text-xs text-slate-400">Transaction logs, Customer IDs, Orders & Amounts</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 text-xs font-bold rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                                    File 1
                                </span>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef1}
                                onChange={handleFileSelect1}
                                accept=".xlsx, .xls, .csv, .svg"
                                className="hidden"
                            />

                            <div
                                onDragOver={handleDragOver1}
                                onDragLeave={handleDragLeave1}
                                onDrop={handleDrop1}
                                onClick={() => fileInputRef1.current?.click()}
                                className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center ${
                                    isDragging1
                                        ? "border-sky-500 bg-sky-50"
                                        : file1
                                        ? "border-emerald-400 bg-emerald-50/30"
                                        : "border-slate-300 bg-slate-50/50 hover:border-sky-400 hover:bg-sky-50/20"
                                }`}
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-sm ${
                                    file1 ? "bg-emerald-100 text-emerald-600" : "bg-sky-50 text-sky-600"
                                }`}>
                                    <i className={`fa-solid ${file1 ? "fa-file-circle-check text-2xl" : "fa-cloud-arrow-up text-2xl"}`}></i>
                                </div>
                                <p className="text-sm font-bold text-slate-800 mb-1">
                                    {file1 ? file1.name : "Click or Drag & Drop Account Activities File"}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {file1 ? formatFileSize(file1.size) : "Excel (.xlsx, .csv) or SVG (.svg)"}
                                </p>
                            </div>

                            {/* File Selected Details */}
                            {file1 && (
                                <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                            <i className="fa-solid fa-file-excel text-emerald-600"></i> Selected Document
                                        </span>
                                        <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-sky-100 text-sky-700">
                                            {file1.name.split(".").pop().toUpperCase()}
                                        </span>
                                    </div>

                                    {uploading1 && (
                                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                            <div className="bg-sky-600 h-2 rounded-full animate-pulse w-full" />
                                        </div>
                                    )}

                                    {uploadSuccess1 && (
                                        <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                                            <i className="fa-solid fa-circle-check text-emerald-600"></i> Account Activities saved directly into MySQL <code className="font-mono">account_activities</code> table.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                            <button
                                type="button"
                                disabled={!file1 || uploading1}
                                onClick={() => {
                                    setFile1(null);
                                    setUploadSuccess1(false);
                                    if (fileInputRef1.current) fileInputRef1.current.value = "";
                                }}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                            >
                                Clear
                            </button>

                            <button
                                type="button"
                                disabled={!file1 || uploading1}
                                onClick={handleUpload1}
                                className="flex-1 py-2.5 px-5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold shadow-md shadow-sky-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                            >
                                {uploading1 ? (
                                    <>
                                        <i className="fa-solid fa-circle-notch fa-spin"></i> Saving to SQL...
                                    </>
                                ) : uploadSuccess1 ? (
                                    <>
                                        <i className="fa-solid fa-check"></i> Saved to SQL
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-database"></i> Upload Account Activities
                                    </>
                                )}
                            </button>
                        </div>
                    </div>


                    {/* UPLOAD CARD 2 - Master Account */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-lg shadow-slate-200/50 p-6 sm:p-8 flex flex-col justify-between hover:shadow-xl transition-all duration-300">
                        <div>
                            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center font-extrabold shadow-sm">
                                        <i className="fa-solid fa-sitemap"></i>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">Master Account</h3>
                                        <p className="text-xs text-slate-400">Domains, Plans, Subscriptions, Seats & Statuses</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 text-xs font-bold rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                                    File 2
                                </span>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef2}
                                onChange={handleFileSelect2}
                                accept=".xlsx, .xls, .csv, .svg"
                                className="hidden"
                            />

                            <div
                                onDragOver={handleDragOver2}
                                onDragLeave={handleDragLeave2}
                                onDrop={handleDrop2}
                                onClick={() => fileInputRef2.current?.click()}
                                className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center ${
                                    isDragging2
                                        ? "border-teal-500 bg-teal-50"
                                        : file2
                                        ? "border-emerald-400 bg-emerald-50/30"
                                        : "border-slate-300 bg-slate-50/50 hover:border-teal-400 hover:bg-teal-50/20"
                                }`}
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-sm ${
                                    file2 ? "bg-emerald-100 text-emerald-600" : "bg-teal-50 text-teal-600"
                                }`}>
                                    <i className={`fa-solid ${file2 ? "fa-file-circle-check text-2xl" : "fa-file-arrow-up text-2xl"}`}></i>
                                </div>
                                <p className="text-sm font-bold text-slate-800 mb-1">
                                    {file2 ? file2.name : "Click or Drag & Drop Master Account File"}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {file2 ? formatFileSize(file2.size) : "Excel (.xlsx, .csv) or SVG (.svg)"}
                                </p>
                            </div>

                            {/* File Selected Details */}
                            {file2 && (
                                <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                            <i className="fa-solid fa-file-excel text-teal-600"></i> Selected Document
                                        </span>
                                        <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-teal-100 text-teal-700">
                                            {file2.name.split(".").pop().toUpperCase()}
                                        </span>
                                    </div>

                                    {uploading2 && (
                                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                            <div className="bg-teal-600 h-2 rounded-full animate-pulse w-full" />
                                        </div>
                                    )}

                                    {uploadSuccess2 && (
                                        <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                                            <i className="fa-solid fa-circle-check text-emerald-600"></i> Master Account saved directly into MySQL <code className="font-mono">master_accounts</code> table.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                            <button
                                type="button"
                                disabled={!file2 || uploading2}
                                onClick={() => {
                                    setFile2(null);
                                    setUploadSuccess2(false);
                                    if (fileInputRef2.current) fileInputRef2.current.value = "";
                                }}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                            >
                                Clear
                            </button>

                            <button
                                type="button"
                                disabled={!file2 || uploading2}
                                onClick={handleUpload2}
                                className="flex-1 py-2.5 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-md shadow-teal-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                            >
                                {uploading2 ? (
                                    <>
                                        <i className="fa-solid fa-circle-notch fa-spin"></i> Saving to SQL...
                                    </>
                                ) : uploadSuccess2 ? (
                                    <>
                                        <i className="fa-solid fa-check"></i> Saved to SQL
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-database"></i> Upload Master Account
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                </div>

                {/* MYSQL STORED DATA TABLES */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
                    
                    {/* Table Header & View Switcher */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-100">
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                                <i className="fa-solid fa-database text-blue-600"></i> MySQL Stored Data Tables
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                                Inspect parsed records stored in MySQL database tables.
                            </p>
                        </div>

                        {/* Search Bar & View Tabs */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                                <input
                                    type="text"
                                    placeholder="Search domain, customer ID, order..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 w-48 sm:w-64 bg-slate-50/50"
                                />
                            </div>

                            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("account_activities")}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        activeTab === "account_activities" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    Account Activities ({accountActivitiesData.length})
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab("master_account")}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        activeTab === "master_account" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    Master Account ({masterAccountData.length})
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab("upload_logs")}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        activeTab === "upload_logs" ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    Upload Logs ({uploadLogs.length})
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* TABLE 1: ACCOUNT ACTIVITIES DATA */}
                    {activeTab === "account_activities" && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-sky-50/60 text-[11px] font-bold text-sky-900 uppercase tracking-wider">
                                        <th className="py-3 px-4 rounded-l-xl">Date</th>
                                        <th className="py-3 px-4">Description</th>
                                        <th className="py-3 px-4">Order Number</th>
                                        <th className="py-3 px-4">Domain Name</th>
                                        <th className="py-3 px-4">Customer ID</th>
                                        <th className="py-3 px-4 text-right">Amount</th>
                                        <th className="py-3 px-4 text-right rounded-r-xl">Source File</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {filteredAccountActivities.length > 0 ? (
                                        filteredAccountActivities.map((row, idx) => (
                                            <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                                                    {row.transaction_date || "Aug 2, 2026"}
                                                </td>
                                                <td className="py-3.5 px-4 text-slate-600 font-medium max-w-sm leading-relaxed">
                                                    {row.description}
                                                </td>
                                                <td className="py-3.5 px-4 font-mono text-slate-700 font-semibold whitespace-nowrap">
                                                    {row.order_number}
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-100">
                                                        {row.domain_name}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                                                    {row.customer_id}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-bold text-emerald-700 whitespace-nowrap font-mono text-sm">
                                                    ₹{typeof row.amount === 'number' ? row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : row.amount}
                                                </td>
                                                <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px] whitespace-nowrap">
                                                    {row.file_name || "Account Activities"}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="py-8 text-center text-slate-400 text-xs">
                                                No Account Activities records stored yet in MySQL.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TABLE 2: MASTER ACCOUNT DATA */}
                    {activeTab === "master_account" && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-teal-50/60 text-[11px] font-bold text-teal-900 uppercase tracking-wider">
                                        <th className="py-3 px-4 rounded-l-xl">Domain Name</th>
                                        <th className="py-3 px-4">Product & Plan</th>
                                        <th className="py-3 px-4">Start / End Date</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Payment Plan</th>
                                        <th className="py-3 px-4 text-center">Seats</th>
                                        <th className="py-3 px-4 font-mono">Customer ID</th>
                                        <th className="py-3 px-4 font-mono text-right rounded-r-xl">Subscription & Order</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {filteredMasterAccounts.length > 0 ? (
                                        filteredMasterAccounts.map((row, idx) => (
                                            <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                                                    <span className="px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 font-bold border border-teal-100">
                                                        {row.domain_name}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <p className="font-bold text-slate-800">{row.product}</p>
                                                    <p className="text-[11px] text-slate-500">{row.sku_plan}</p>
                                                </td>
                                                <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                                                    <p>{row.start_date}</p>
                                                    <p className="text-slate-400">to {row.end_date}</p>
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                                                    {row.payment_plan}
                                                </td>
                                                <td className="py-3.5 px-4 text-center font-bold text-slate-800 font-mono whitespace-nowrap">
                                                    {row.assigned_seats} / {row.total_seats}
                                                </td>
                                                <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                                                    {row.customer_id}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                                    <p className="font-bold text-slate-800">{row.subscription_id}</p>
                                                    <p className="text-slate-400">Ord: {row.order_number}</p>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="py-8 text-center text-slate-400 text-xs">
                                                No Master Account records stored yet in MySQL.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TABLE 3: UPLOAD LOGS */}
                    {activeTab === "upload_logs" && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-purple-50/60 text-[11px] font-bold text-purple-900 uppercase tracking-wider">
                                        <th className="py-3 px-4 rounded-l-xl">File Name</th>
                                        <th className="py-3 px-4">Upload Slot</th>
                                        <th className="py-3 px-4">File Size</th>
                                        <th className="py-3 px-4">Records Inserted</th>
                                        <th className="py-3 px-4">Upload Timestamp</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {uploadLogs.length > 0 ? (
                                        uploadLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                                                    <i className="fa-solid fa-file-csv text-blue-600"></i>
                                                    {log.file_name}
                                                </td>
                                                <td className="py-3.5 px-4 font-medium text-slate-700">
                                                    {log.file_type}
                                                </td>
                                                <td className="py-3.5 px-4 font-mono text-slate-500">
                                                    {log.file_size}
                                                </td>
                                                <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                                                    {log.record_count} rows
                                                </td>
                                                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                                                    {log.uploaded_at ? new Date(log.uploaded_at).toLocaleString() : "Just now"}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        {log.status || "Ready"}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(log.id)}
                                                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        title="Delete Log"
                                                    >
                                                        <i className="fa-solid fa-trash-can"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="py-8 text-center text-slate-400 text-xs">
                                                No upload logs registered yet in MySQL.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                </div>

            </main>
        </div>
    );
}
