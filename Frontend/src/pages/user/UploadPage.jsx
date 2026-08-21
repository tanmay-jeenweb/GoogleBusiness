import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import {
    uploadAccountActivitiesFile,
    uploadMasterAccountFile,
    fetchUploadHistory
} from "../../api/uploadApi";

export default function UploadPage() {
    // Active Company Tab ('jeenweb' | 'satvaweb')
    const [activeCompany, setActiveCompany] = useState("jeenweb");

    // File 1 (Account Activities) State
    const [file1, setFile1] = useState(null);
    const [isDragging1, setIsDragging1] = useState(false);
    const [uploading1, setUploading1] = useState(false);
    const [uploadSuccess1, setUploadSuccess1] = useState(false);
    const fileInputRef1 = useRef(null);

    // File 2 (Master Account) State
    const [file2, setFile2] = useState(null);
    const [isDragging2, setIsDragging2] = useState(false);
    const [uploading2, setUploading2] = useState(false);
    const [uploadSuccess2, setUploadSuccess2] = useState(false);
    const fileInputRef2 = useRef(null);

    const [accountActivitiesCount, setAccountActivitiesCount] = useState(0);
    const [masterAccountCount, setMasterAccountCount] = useState(0);
    const [lastUpload1, setLastUpload1] = useState(null);
    const [lastUpload2, setLastUpload2] = useState(null);
    const [totalOverallRows, setTotalOverallRows] = useState(0);

    const formatTimestamp = (ts) => {
        if (!ts) return null;
        const d = new Date(ts);
        if (isNaN(d.getTime())) return String(ts);
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    // Load history for active company
    const loadHistoryData = async () => {
        try {
            // Fetch active company history
            const res = await fetchUploadHistory(activeCompany);
            if (res.data?.success) {
                const logs = res.data.logs || [];
                const acts = res.data.accountActivities || [];
                const masters = res.data.masterAccounts || [];

                setAccountActivitiesCount(acts.length);
                setMasterAccountCount(masters.length);

                const log1 = logs.find(l => l.file_type === "Account Activities");
                const lastDate1 = log1?.uploaded_at || (acts.length > 0 ? acts[0].uploaded_at : null);
                setLastUpload1(formatTimestamp(lastDate1));

                const log2 = logs.find(l => l.file_type === "Master Account");
                const lastDate2 = log2?.uploaded_at || (masters.length > 0 ? masters[0].uploaded_at : null);
                setLastUpload2(formatTimestamp(lastDate2));
            }

            // Fetch overall count across all tables
            const resAll = await fetchUploadHistory("all");
            if (resAll.data?.success) {
                const total = (resAll.data.accountActivities?.length || 0) + (resAll.data.masterAccounts?.length || 0);
                setTotalOverallRows(total);
            }
        } catch (error) {
            console.error("Failed to load upload history from MySQL:", error);
        }
    };

    useEffect(() => {
        setFile1(null);
        setFile2(null);
        setUploadSuccess1(false);
        setUploadSuccess2(false);
        loadHistoryData();
    }, [activeCompany]);

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

    const handleUpload1 = async () => {
        if (!file1) return;
        try {
            setUploading1(true);
            const res = await uploadAccountActivitiesFile(file1, activeCompany);
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

    const handleUpload2 = async () => {
        if (!file2) return;
        try {
            setUploading2(true);
            const res = await uploadMasterAccountFile(file2, activeCompany);
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

    const formatFileSize = (bytes) => {
        if (!bytes) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    const activeLabel = activeCompany === "satvaweb" ? "SatvaWeb" : "JeenWeb";

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/70 font-sans text-slate-900">
            <Navbar title="Upload Center" />

            <main className="flex-1 w-full max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col">
                
                {/* Header & Overall Status */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-slate-200/80">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200/60 uppercase tracking-wide">
                                4 MySQL Tables Active
                            </span>
                            {totalOverallRows > 0 && (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {totalOverallRows} Total Rows in DB
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                            Upload Center
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Upload Account Activities & Master Account files separately for JeenWeb and SatvaWeb into isolated SQL tables.
                        </p>
                    </div>
                </div>

                {/* COMPANY SWITCHER TABS */}
                <div className="flex items-center gap-3 mb-8 bg-slate-200/60 p-1.5 rounded-2xl w-fit border border-slate-300/60">
                    <button
                        type="button"
                        onClick={() => setActiveCompany("jeenweb")}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            activeCompany === "jeenweb"
                                ? "bg-white text-sky-700 shadow-md border border-sky-100"
                                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                        }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${activeCompany === "jeenweb" ? "bg-sky-500 animate-pulse" : "bg-slate-400"}`}></div>
                        <i className="fa-solid fa-building text-sm"></i>
                        <span>JeenWeb (Reseller 1)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveCompany("satvaweb")}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            activeCompany === "satvaweb"
                                ? "bg-white text-purple-700 shadow-md border border-purple-100"
                                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                        }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${activeCompany === "satvaweb" ? "bg-purple-500 animate-pulse" : "bg-slate-400"}`}></div>
                        <i className="fa-solid fa-building-user text-sm"></i>
                        <span>SatvaWeb (Reseller 2)</span>
                    </button>
                </div>

                {/* DUAL UPLOAD CARDS FOR ACTIVE COMPANY */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* UPLOAD CARD 1 - Account Activities */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-300 p-6 flex flex-col justify-between">
                        <div>
                            {/* Card Header & Last Upload Date Chip */}
                            <div className="flex flex-col gap-2 mb-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl font-bold text-base border flex items-center justify-center ${
                                            activeCompany === "satvaweb"
                                                ? "bg-purple-50 text-purple-600 border-purple-100"
                                                : "bg-sky-50 text-sky-600 border-sky-100"
                                        }`}>
                                            <i className="fa-solid fa-list-check"></i>
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-slate-800">
                                                {activeLabel} - Account Activities
                                            </h3>
                                            <p className="text-[11px] text-slate-400">File 1 • Activity & Order records</p>
                                        </div>
                                    </div>
                                    {accountActivitiesCount > 0 && (
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                            activeCompany === "satvaweb"
                                                ? "text-purple-700 bg-purple-50 border-purple-100"
                                                : "text-sky-700 bg-sky-50 border-sky-100"
                                        }`}>
                                            {accountActivitiesCount} records
                                        </span>
                                    )}
                                </div>

                                {/* LAST UPLOAD DATE BUTTON / CHIP */}
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border shadow-2xs ${
                                        activeCompany === "satvaweb"
                                            ? "bg-purple-50/80 text-purple-800 border-purple-200/60"
                                            : "bg-sky-50/80 text-sky-800 border-sky-200/60"
                                    }`}>
                                        <i className={`fa-solid fa-clock-rotate-left text-[10px] ${
                                            activeCompany === "satvaweb" ? "text-purple-500" : "text-sky-500"
                                        }`}></i>
                                        <span>Last Upload: <strong>{lastUpload1 || "No uploads yet"}</strong></span>
                                    </span>
                                </div>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef1}
                                onChange={handleFileSelect1}
                                accept=".xlsx, .xls, .csv, .svg"
                                className="hidden"
                            />

                            {/* Dropzone */}
                            <div
                                onDragOver={handleDragOver1}
                                onDragLeave={handleDragLeave1}
                                onDrop={handleDrop1}
                                onClick={() => fileInputRef1.current?.click()}
                                className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center ${
                                    isDragging1
                                        ? "border-sky-500 bg-sky-50/80"
                                        : file1
                                        ? "border-emerald-400 bg-emerald-50/30"
                                        : "border-slate-200 bg-slate-50/50 hover:border-sky-400 hover:bg-sky-50/30"
                                }`}
                            >
                                <i className={`fa-solid ${file1 ? "fa-file-circle-check text-emerald-600" : "fa-cloud-arrow-up text-slate-400"} text-2xl mb-2`}></i>
                                <p className="text-xs font-bold text-slate-700 truncate max-w-full px-2">
                                    {file1 ? file1.name : `Choose or drag ${activeLabel} Account Activities file`}
                                </p>
                                <span className="text-[10px] text-slate-400 mt-1">
                                    {file1 ? formatFileSize(file1.size) : "Excel (.xlsx, .csv) or SVG"}
                                </span>
                            </div>

                            {/* Status indicator */}
                            {file1 && (
                                <div className="mt-3 flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500 font-medium">Status:</span>
                                    {uploading1 ? (
                                        <span className="text-sky-600 font-bold flex items-center gap-1">
                                            <i className="fa-solid fa-circle-notch fa-spin"></i> Uploading to {activeLabel} SQL...
                                        </span>
                                    ) : uploadSuccess1 ? (
                                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                                            <i className="fa-solid fa-check"></i> Stored in {activeLabel} Table
                                        </span>
                                    ) : (
                                        <span className="text-slate-600 font-semibold">Ready to upload</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Card Actions */}
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                            {file1 ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFile1(null);
                                        setUploadSuccess1(false);
                                        if (fileInputRef1.current) fileInputRef1.current.value = "";
                                    }}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                                >
                                    Clear Selection
                                </button>
                            ) : (
                                <span className="text-[11px] text-slate-400">Ready</span>
                            )}

                            <button
                                type="button"
                                disabled={!file1 || uploading1}
                                onClick={handleUpload1}
                                className={`flex-1 max-w-[170px] py-2 px-3 rounded-xl text-white text-xs font-bold shadow-sm disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 ml-auto ${
                                    activeCompany === "satvaweb"
                                        ? "bg-purple-600 hover:bg-purple-700"
                                        : "bg-sky-600 hover:bg-sky-700"
                                }`}
                            >
                                {uploading1 ? (
                                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                                ) : uploadSuccess1 ? (
                                    <i className="fa-solid fa-circle-check"></i>
                                ) : (
                                    <i className="fa-solid fa-upload"></i>
                                )}
                                {uploading1 ? "Saving..." : uploadSuccess1 ? "Uploaded" : `Upload to ${activeLabel}`}
                            </button>
                        </div>
                    </div>

                    {/* UPLOAD CARD 2 - Master Account */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-300 p-6 flex flex-col justify-between">
                        <div>
                            {/* Card Header & Last Upload Date Chip */}
                            <div className="flex flex-col gap-2 mb-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl font-bold text-base border flex items-center justify-center ${
                                            activeCompany === "satvaweb"
                                                ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                                                : "bg-teal-50 text-teal-600 border-teal-100"
                                        }`}>
                                            <i className="fa-solid fa-sitemap"></i>
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-slate-800">
                                                {activeLabel} - Master Account
                                            </h3>
                                            <p className="text-[11px] text-slate-400">File 2 • Domain & Plan records</p>
                                        </div>
                                    </div>
                                    {masterAccountCount > 0 && (
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                            activeCompany === "satvaweb"
                                                ? "text-indigo-700 bg-indigo-50 border-indigo-100"
                                                : "text-teal-700 bg-teal-50 border-teal-100"
                                        }`}>
                                            {masterAccountCount} records
                                        </span>
                                    )}
                                </div>

                                {/* LAST UPLOAD DATE BUTTON / CHIP */}
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border shadow-2xs ${
                                        activeCompany === "satvaweb"
                                            ? "bg-indigo-50/80 text-indigo-800 border-indigo-200/60"
                                            : "bg-teal-50/80 text-teal-800 border-teal-200/60"
                                    }`}>
                                        <i className={`fa-solid fa-clock-rotate-left text-[10px] ${
                                            activeCompany === "satvaweb" ? "text-indigo-500" : "text-teal-500"
                                        }`}></i>
                                        <span>Last Upload: <strong>{lastUpload2 || "No uploads yet"}</strong></span>
                                    </span>
                                </div>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef2}
                                onChange={handleFileSelect2}
                                accept=".xlsx, .xls, .csv, .svg"
                                className="hidden"
                            />

                            {/* Dropzone */}
                            <div
                                onDragOver={handleDragOver2}
                                onDragLeave={handleDragLeave2}
                                onDrop={handleDrop2}
                                onClick={() => fileInputRef2.current?.click()}
                                className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center ${
                                    isDragging2
                                        ? "border-teal-500 bg-teal-50/80"
                                        : file2
                                        ? "border-emerald-400 bg-emerald-50/30"
                                        : "border-slate-200 bg-slate-50/50 hover:border-teal-400 hover:bg-teal-50/30"
                                }`}
                            >
                                <i className={`fa-solid ${file2 ? "fa-file-circle-check text-emerald-600" : "fa-file-arrow-up text-slate-400"} text-2xl mb-2`}></i>
                                <p className="text-xs font-bold text-slate-700 truncate max-w-full px-2">
                                    {file2 ? file2.name : `Choose or drag ${activeLabel} Master Account file`}
                                </p>
                                <span className="text-[10px] text-slate-400 mt-1">
                                    {file2 ? formatFileSize(file2.size) : "Excel (.xlsx, .csv) or SVG"}
                                </span>
                            </div>

                            {/* Status indicator */}
                            {file2 && (
                                <div className="mt-3 flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500 font-medium">Status:</span>
                                    {uploading2 ? (
                                        <span className="text-teal-600 font-bold flex items-center gap-1">
                                            <i className="fa-solid fa-circle-notch fa-spin"></i> Uploading to {activeLabel} SQL...
                                        </span>
                                    ) : uploadSuccess2 ? (
                                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                                            <i className="fa-solid fa-check"></i> Stored in {activeLabel} Table
                                        </span>
                                    ) : (
                                        <span className="text-slate-600 font-semibold">Ready to upload</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Card Actions */}
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                            {file2 ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFile2(null);
                                        setUploadSuccess2(false);
                                        if (fileInputRef2.current) fileInputRef2.current.value = "";
                                    }}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                                >
                                    Clear Selection
                                </button>
                            ) : (
                                <span className="text-[11px] text-slate-400">Ready</span>
                            )}

                            <button
                                type="button"
                                disabled={!file2 || uploading2}
                                onClick={handleUpload2}
                                className={`flex-1 max-w-[170px] py-2 px-3 rounded-xl text-white text-xs font-bold shadow-sm disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 ml-auto ${
                                    activeCompany === "satvaweb"
                                        ? "bg-indigo-600 hover:bg-indigo-700"
                                        : "bg-teal-600 hover:bg-teal-700"
                                }`}
                            >
                                {uploading2 ? (
                                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                                ) : uploadSuccess2 ? (
                                    <i className="fa-solid fa-circle-check"></i>
                                ) : (
                                    <i className="fa-solid fa-upload"></i>
                                )}
                                {uploading2 ? "Saving..." : uploadSuccess2 ? "Uploaded" : `Upload to ${activeLabel}`}
                            </button>
                        </div>
                    </div>

                </div>

            </main>
        </div>
    );
}
