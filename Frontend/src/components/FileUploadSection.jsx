import React, { useState, useRef } from "react";
import toast from "react-hot-toast";
import { uploadAccountActivitiesFile, uploadMasterAccountFile } from "../api/uploadApi";

export default function FileUploadSection() {
    // State for File 1 (Account Activities)
    const [file1, setFile1] = useState(null);
    const [isDragging1, setIsDragging1] = useState(false);
    const [uploading1, setUploading1] = useState(false);
    const [uploadSuccess1, setUploadSuccess1] = useState(false);
    const fileInputRef1 = useRef(null);

    // State for File 2 (Master Account)
    const [file2, setFile2] = useState(null);
    const [isDragging2, setIsDragging2] = useState(false);
    const [uploading2, setUploading2] = useState(false);
    const [uploadSuccess2, setUploadSuccess2] = useState(false);
    const fileInputRef2 = useRef(null);

    const allowedExtensions = ["xlsx", "xls", "csv", "svg"];

    const validateFile = (file) => {
        if (!file) return false;
        const ext = file.name.split(".").pop().toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            toast.error(`Invalid format (.${ext}). Only Excel (.xlsx, .xls, .csv) & SVG (.svg) files allowed.`);
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

    // Drag handlers 1
    const handleDragOver1 = (e) => { e.preventDefault(); setIsDragging1(true); };
    const handleDragLeave1 = () => setIsDragging1(false);
    const handleDrop1 = (e) => {
        e.preventDefault();
        setIsDragging1(false);
        const droppedFile = e.dataTransfer.files[0];
        if (validateFile(droppedFile)) {
            setFile1(droppedFile);
            setUploadSuccess1(false);
            toast.success(`Dropped Account Activities file: ${droppedFile.name}`);
        }
    };

    // Drag handlers 2
    const handleDragOver2 = (e) => { e.preventDefault(); setIsDragging2(true); };
    const handleDragLeave2 = () => setIsDragging2(false);
    const handleDrop2 = (e) => {
        e.preventDefault();
        setIsDragging2(false);
        const droppedFile = e.dataTransfer.files[0];
        if (validateFile(droppedFile)) {
            setFile2(droppedFile);
            setUploadSuccess2(false);
            toast.success(`Dropped Master Account file: ${droppedFile.name}`);
        }
    };

    // Submit File 1 (Account Activities) to MySQL
    const handleUpload1 = async (e) => {
        e.stopPropagation();
        if (!file1) return;
        try {
            setUploading1(true);
            const res = await uploadAccountActivitiesFile(file1);
            if (res.data?.success) {
                setUploadSuccess1(true);
                toast.success(res.data.message || "Account Activities stored in MySQL successfully!");
            }
        } catch (error) {
            console.error("Account Activities Upload Error:", error);
            toast.error(error.response?.data?.message || "Failed to upload Account Activities file.");
        } finally {
            setUploading1(false);
        }
    };

    // Submit File 2 (Master Account) to MySQL
    const handleUpload2 = async (e) => {
        e.stopPropagation();
        if (!file2) return;
        try {
            setUploading2(true);
            const res = await uploadMasterAccountFile(file2);
            if (res.data?.success) {
                setUploadSuccess2(true);
                toast.success(res.data.message || "Master Account stored in MySQL successfully!");
            }
        } catch (error) {
            console.error("Master Account Upload Error:", error);
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

    const getFileTypeBadge = (filename) => {
        const ext = filename?.split(".").pop().toLowerCase();
        if (ext === "svg") {
            return (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-100 text-purple-700 border border-purple-200">
                    SVG
                </span>
            );
        } else {
            return (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200">
                    EXCEL (.{ext})
                </span>
            );
        }
    };

    return (
        <>
            {/* UPLOAD CARD 1 - Account Activities */}
            <div className="group relative flex flex-col justify-between p-6 rounded-2xl border border-slate-200 bg-white hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/5 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-sky-500" />
                
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <i className="fa-solid fa-list-check text-sky-600 text-lg"></i>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            File 1
                        </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-sky-700 transition-colors">
                        Account Activities
                    </h3>
                    <p className="text-slate-500 text-xs leading-relaxed mb-4">
                        Upload Account Activities Excel (.xlsx, .csv) or SVG file.
                    </p>

                    {/* Hidden input */}
                    <input
                        type="file"
                        ref={fileInputRef1}
                        onChange={handleFileSelect1}
                        accept=".xlsx, .xls, .csv, .svg"
                        className="hidden"
                    />

                    {/* Dropzone Box */}
                    <div
                        onDragOver={handleDragOver1}
                        onDragLeave={handleDragLeave1}
                        onDrop={handleDrop1}
                        onClick={() => fileInputRef1.current?.click()}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center ${
                            isDragging1
                                ? "border-sky-500 bg-sky-50"
                                : file1
                                ? "border-emerald-400 bg-emerald-50/40"
                                : "border-slate-200 bg-slate-50/60 hover:border-sky-400 hover:bg-sky-50/30"
                        }`}
                    >
                        <i className={`fa-solid ${file1 ? "fa-file-circle-check text-emerald-600" : "fa-arrow-up-from-bracket text-slate-400"} text-xl mb-1.5`}></i>
                        <p className="text-xs font-semibold text-slate-700 truncate max-w-full px-2">
                            {file1 ? file1.name : "Choose or drag Account Activities File"}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                            {file1 ? formatFileSize(file1.size) : "Excel / SVG formats"}
                        </span>
                    </div>

                    {/* Progress Bar & Status */}
                    {file1 && (
                        <div className="mt-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-[11px]">
                                {getFileTypeBadge(file1.name)}
                                {uploadSuccess1 ? (
                                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                                        <i className="fa-solid fa-check"></i> Saved in SQL
                                    </span>
                                ) : uploading1 ? (
                                    <span className="text-sky-600 font-bold">Uploading...</span>
                                ) : (
                                    <span className="text-slate-400">Selected</span>
                                )}
                            </div>

                            {uploading1 && (
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-sky-600 h-1.5 rounded-full animate-pulse w-full" />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {file1 ? (
                        <>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFile1(null);
                                    setUploadSuccess1(false);
                                    if (fileInputRef1.current) fileInputRef1.current.value = "";
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                                Clear
                            </button>

                            <button
                                type="button"
                                disabled={uploading1}
                                onClick={handleUpload1}
                                className="flex-1 py-1.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                            >
                                {uploading1 ? (
                                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                                ) : uploadSuccess1 ? (
                                    <i className="fa-solid fa-circle-check"></i>
                                ) : (
                                    <i className="fa-solid fa-database"></i>
                                )}
                                {uploading1 ? "Saving..." : uploadSuccess1 ? "Saved in SQL" : "Upload to SQL"}
                            </button>
                        </>
                    ) : (
                        <div className="w-full flex items-center justify-between text-xs text-slate-400 cursor-pointer" onClick={() => fileInputRef1.current?.click()}>
                            <span>Select Account Activities File</span>
                            <span className="text-sky-600 font-bold flex items-center gap-1">
                                Browse
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                </svg>
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* UPLOAD CARD 2 - Master Account */}
            <div className="group relative flex flex-col justify-between p-6 rounded-2xl border border-slate-200 bg-white hover:border-teal-300 hover:shadow-lg hover:shadow-teal-500/5 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
                
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <i className="fa-solid fa-sitemap text-teal-600 text-lg"></i>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                            File 2
                        </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-teal-700 transition-colors">
                        Master Account
                    </h3>
                    <p className="text-slate-500 text-xs leading-relaxed mb-4">
                        Upload Master Account Excel (.xlsx, .csv) or SVG file.
                    </p>

                    {/* Hidden input */}
                    <input
                        type="file"
                        ref={fileInputRef2}
                        onChange={handleFileSelect2}
                        accept=".xlsx, .xls, .csv, .svg"
                        className="hidden"
                    />

                    {/* Dropzone Box */}
                    <div
                        onDragOver={handleDragOver2}
                        onDragLeave={handleDragLeave2}
                        onDrop={handleDrop2}
                        onClick={() => fileInputRef2.current?.click()}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center ${
                            isDragging2
                                ? "border-teal-500 bg-teal-50"
                                : file2
                                ? "border-emerald-400 bg-emerald-50/40"
                                : "border-slate-200 bg-slate-50/60 hover:border-teal-400 hover:bg-teal-50/30"
                        }`}
                    >
                        <i className={`fa-solid ${file2 ? "fa-file-circle-check text-emerald-600" : "fa-arrow-up-from-bracket text-slate-400"} text-xl mb-1.5`}></i>
                        <p className="text-xs font-semibold text-slate-700 truncate max-w-full px-2">
                            {file2 ? file2.name : "Choose or drag Master Account File"}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                            {file2 ? formatFileSize(file2.size) : "Excel / SVG formats"}
                        </span>
                    </div>

                    {/* Progress Bar & Status */}
                    {file2 && (
                        <div className="mt-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-[11px]">
                                {getFileTypeBadge(file2.name)}
                                {uploadSuccess2 ? (
                                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                                        <i className="fa-solid fa-check"></i> Saved in SQL
                                    </span>
                                ) : uploading2 ? (
                                    <span className="text-teal-600 font-bold">Uploading...</span>
                                ) : (
                                    <span className="text-slate-400">Selected</span>
                                )}
                            </div>

                            {uploading2 && (
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-teal-600 h-1.5 rounded-full animate-pulse w-full" />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {file2 ? (
                        <>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFile2(null);
                                    setUploadSuccess2(false);
                                    if (fileInputRef2.current) fileInputRef2.current.value = "";
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                                Clear
                            </button>

                            <button
                                type="button"
                                disabled={uploading2}
                                onClick={handleUpload2}
                                className="flex-1 py-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                            >
                                {uploading2 ? (
                                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                                ) : uploadSuccess2 ? (
                                    <i className="fa-solid fa-circle-check"></i>
                                ) : (
                                    <i className="fa-solid fa-database"></i>
                                )}
                                {uploading2 ? "Saving..." : uploadSuccess2 ? "Saved in SQL" : "Upload to SQL"}
                            </button>
                        </>
                    ) : (
                        <div className="w-full flex items-center justify-between text-xs text-slate-400 cursor-pointer" onClick={() => fileInputRef2.current?.click()}>
                            <span>Select Master Account File</span>
                            <span className="text-teal-600 font-bold flex items-center gap-1">
                                Browse
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                </svg>
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
