import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import {
    uploadAccountActivitiesFile,
    uploadMasterAccountFile,
    fetchUploadHistory,
    deleteUploadRecord,
    clearAccountActivitiesSql,
    clearMasterAccountSql,
    clearAllUploadsSql
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

    // View tab state: 'top10_clients' | 'upload_logs'
    const [activeTab, setActiveTab] = useState("top10_clients");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [clearing, setClearing] = useState(false);

    // Data from MySQL
    const [uploadLogs, setUploadLogs] = useState([]);
    const [accountActivitiesData, setAccountActivitiesData] = useState([]);
    const [masterAccountData, setMasterAccountData] = useState([]);

    // Load data from MySQL backend API
    const loadHistoryData = async () => {
        try {
            setLoading(true);
            const res = await fetchUploadHistory();
            if (res.data?.success) {
                setUploadLogs(res.data.logs || []);
                setAccountActivitiesData(res.data.accountActivities || []);
                setMasterAccountData(res.data.masterAccounts || []);
            }
        } catch (error) {
            console.error("Failed to load upload history from MySQL:", error);
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

    // Clear Account Activities Table in SQL
    const handleClearAccountActivitiesSql = async () => {
        if (!window.confirm("Are you sure you want to clear all Account Activities data from the MySQL database?")) return;
        try {
            setClearing(true);
            await clearAccountActivitiesSql();
            toast.success("Account Activities SQL table cleared!");
            setFile1(null);
            setUploadSuccess1(false);
            loadHistoryData();
        } catch (error) {
            console.error("Clear Account Activities error:", error);
            toast.error("Failed to clear Account Activities SQL table.");
        } finally {
            setClearing(false);
        }
    };

    // Clear Master Account Table in SQL
    const handleClearMasterAccountSql = async () => {
        if (!window.confirm("Are you sure you want to clear all Master Account data from the MySQL database?")) return;
        try {
            setClearing(true);
            await clearMasterAccountSql();
            toast.success("Master Account SQL table cleared!");
            setFile2(null);
            setUploadSuccess2(false);
            loadHistoryData();
        } catch (error) {
            console.error("Clear Master Account error:", error);
            toast.error("Failed to clear Master Account SQL table.");
        } finally {
            setClearing(false);
        }
    };

    // Clear ALL SQL tables
    const handleClearAllSqlData = async () => {
        if (!window.confirm("WARNING: Are you sure you want to CLEAR ALL upload tables from MySQL?")) return;
        try {
            setClearing(true);
            await clearAllUploadsSql();
            toast.success("All upload tables cleared from MySQL database!");
            setFile1(null);
            setFile2(null);
            setUploadSuccess1(false);
            setUploadSuccess2(false);
            loadHistoryData();
        } catch (error) {
            console.error("Clear All SQL error:", error);
            toast.error("Failed to clear all SQL data.");
        } finally {
            setClearing(false);
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

    // Computed Executive Metrics
    const uniqueDomains = Array.from(new Set([
        ...accountActivitiesData.map(d => d.domain_name),
        ...masterAccountData.map(m => m.domain_name)
    ].filter(Boolean)));

    const totalRowsCount = accountActivitiesData.length + masterAccountData.length;
    
    const highestTransaction = accountActivitiesData.reduce((max, curr) => {
        const val = parseFloat(String(curr.amount || 0).replace(/,/g, ""));
        return val > max ? val : max;
    }, 0);

    const totalSeatsCount = masterAccountData.reduce((acc, curr) => acc + (parseInt(curr.assigned_seats) || 0), 0);

    // Merge & sort Top 10 High Value Accounts/Clients
    const top10ClientsList = [...accountActivitiesData].sort((a, b) => {
        const valA = parseFloat(String(a.amount || 0).replace(/,/g, ""));
        const valB = parseFloat(String(b.amount || 0).replace(/,/g, ""));
        return valB - valA;
    }).slice(0, 10);

    const filteredTop10 = top10ClientsList.filter(item =>
        (item.domain_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (item.customer_id?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (item.order_number?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (item.description?.toLowerCase() || "").includes(searchTerm.toLowerCase())
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
                                    Full Data Archived in Database
                                </span>
                            </div>

                            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
                                Data Upload Center
                            </h1>
                            <p className="text-sky-100 text-sm sm:text-base leading-relaxed">
                                Upload Excel files (.xlsx, .csv) & SVG graphics (.svg). Full historical records are stored securely in MySQL across <code className="bg-white/15 px-1.5 py-0.5 rounded font-mono text-xs text-white">account_activities</code> and <code className="bg-white/15 px-1.5 py-0.5 rounded font-mono text-xs text-white">master_accounts</code> tables.
                            </p>
                        </div>

                        {/* Global Clear Action */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                            <button
                                type="button"
                                disabled={clearing || totalRowsCount === 0}
                                onClick={handleClearAllSqlData}
                                className="px-4 py-2.5 rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 backdrop-blur-md text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-40 cursor-pointer"
                                title="Truncate all upload tables in MySQL"
                            >
                                <i className="fa-solid fa-trash-arrow-up"></i>
                                Clear All SQL Data
                            </button>
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
                        <div className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                            <button
                                type="button"
                                disabled={!file1 || uploading1}
                                onClick={() => {
                                    setFile1(null);
                                    setUploadSuccess1(false);
                                    if (fileInputRef1.current) fileInputRef1.current.value = "";
                                }}
                                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                            >
                                Clear File
                            </button>

                            <button
                                type="button"
                                disabled={clearing || accountActivitiesData.length === 0}
                                onClick={handleClearAccountActivitiesSql}
                                className="px-3.5 py-2 rounded-xl border border-red-200 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                                title="Clear Account Activities rows from SQL"
                            >
                                <i className="fa-solid fa-database text-[11px]"></i> Clear SQL Data
                            </button>

                            <button
                                type="button"
                                disabled={!file1 || uploading1}
                                onClick={handleUpload1}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold shadow-md shadow-sky-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
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
                                        <i className="fa-solid fa-database"></i> Upload to SQL
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
                        <div className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                            <button
                                type="button"
                                disabled={!file2 || uploading2}
                                onClick={() => {
                                    setFile2(null);
                                    setUploadSuccess2(false);
                                    if (fileInputRef2.current) fileInputRef2.current.value = "";
                                }}
                                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                            >
                                Clear File
                            </button>

                            <button
                                type="button"
                                disabled={clearing || masterAccountData.length === 0}
                                onClick={handleClearMasterAccountSql}
                                className="px-3.5 py-2 rounded-xl border border-red-200 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                                title="Clear Master Account rows from SQL"
                            >
                                <i className="fa-solid fa-database text-[11px]"></i> Clear SQL Data
                            </button>

                            <button
                                type="button"
                                disabled={!file2 || uploading2}
                                onClick={handleUpload2}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-md shadow-teal-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
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
                                        <i className="fa-solid fa-database"></i> Upload to SQL
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                </div>

                {/* EXECUTIVE DATA INSIGHTS & TOP 10 CLIENTS SUMMARY */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
                    
                    {/* Header & Tabs */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-100">
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                                <i className="fa-solid fa-chart-pie text-blue-600"></i> Executive Data Insights
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                                High-level overview & top 10 highest-value clients. Full raw records remain archived in MySQL.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                                <input
                                    type="text"
                                    placeholder="Search domain, customer..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 w-44 sm:w-56 bg-slate-50/50"
                                />
                            </div>

                            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("top10_clients")}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        activeTab === "top10_clients" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    Top 10 High-Value Clients
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

                    {/* Executive Summary Metric Cards Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                <i className="fa-solid fa-building flex-shrink-0"></i>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Total Clients</p>
                                <p className="text-xl font-black text-slate-800">{uniqueDomains.length}</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                <i className="fa-solid fa-database flex-shrink-0"></i>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Total SQL Rows</p>
                                <p className="text-xl font-black text-slate-800">{totalRowsCount}</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                <i className="fa-solid fa-indian-rupee-sign flex-shrink-0"></i>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Top Transaction</p>
                                <p className="text-xl font-black text-slate-800">
                                    ₹{highestTransaction > 0 ? highestTransaction.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : "0.00"}
                                </p>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                <i className="fa-solid fa-users flex-shrink-0"></i>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Active Seats</p>
                                <p className="text-xl font-black text-slate-800">{totalSeatsCount} Seats</p>
                            </div>
                        </div>
                    </div>

                    {/* VIEW 1: TOP 10 HIGH VALUE CLIENTS TABLE */}
                    {activeTab === "top10_clients" && (
                        <div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                            <th className="py-3 px-4 rounded-l-xl">Client Domain</th>
                                            <th className="py-3 px-4 font-mono">Customer ID</th>
                                            <th className="py-3 px-4 font-mono">Order Number</th>
                                            <th className="py-3 px-4">Plan / Description</th>
                                            <th className="py-3 px-4 text-center">Seats</th>
                                            <th className="py-3 px-4 text-right">Transaction Value</th>
                                            <th className="py-3 px-4 text-right rounded-r-xl">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {filteredTop10.length > 0 ? (
                                            filteredTop10.map((item, idx) => (
                                                <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                                                        <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-100">
                                                            {item.domain_name || "N/A"}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                                                        {item.customer_id || "N/A"}
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono text-slate-600 font-semibold whitespace-nowrap">
                                                        {item.order_number || "N/A"}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">
                                                        {item.description || "Google Workspace Business"}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center font-bold text-slate-800 font-mono whitespace-nowrap">
                                                        4 / 4
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700 font-mono text-sm whitespace-nowrap">
                                                        ₹{typeof item.amount === 'number' ? item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : (item.amount || "0.00")}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                            Active
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="py-8 text-center text-slate-400 text-xs">
                                                    No High-Value Client records stored yet in MySQL. Upload a file above to insert new data.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footnote */}
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                <span className="flex items-center gap-1.5">
                                    <i className="fa-solid fa-circle-check text-emerald-500"></i>
                                    Displaying Top 10 High-Value Clients summary. Full raw historical records remain indexed in MySQL.
                                </span>
                                <span className="font-semibold text-slate-500">Database: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">google_business</code></span>
                            </div>
                        </div>
                    )}

                    {/* VIEW 2: UPLOAD FILE LOGS SUMMARY */}
                    {activeTab === "upload_logs" && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-purple-50/60 text-[11px] font-bold text-purple-900 uppercase tracking-wider">
                                        <th className="py-3 px-4 rounded-l-xl">File Name</th>
                                        <th className="py-3 px-4">Upload Target</th>
                                        <th className="py-3 px-4">File Size</th>
                                        <th className="py-3 px-4">Rows Inserted</th>
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
