import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { logoutUser } from "../api/authApi";
import { fetchUploadHistory } from "../api/uploadApi";
import { usePermission } from "../context/PermissionContext";
import { useTheme } from "../context/ThemeContext";
import ThemeMasterModal from "./ThemeMasterModal";

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const [isManagementOpen, setIsManagementOpen] = useState(false);
    const [isDataExplorerOpen, setIsDataExplorerOpen] = useState(false);
    const [isReportsOpen, setIsReportsOpen] = useState(false);
    const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isUploadHistoryOpen, setIsUploadHistoryOpen] = useState(false);

    const [lastUploads, setLastUploads] = useState({
        p1Account: null,
        p1Master: null,
        p2Account: null,
        p2Master: null
    });

    const { hasPermission } = usePermission();
    const { setIsThemeModalOpen } = useTheme();
    const isAdmin = user.role === "admin" || user.role === "super admin";

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

    const loadLastUploadHistory = async () => {
        try {
            const res = await fetchUploadHistory("all");
            if (res.data?.success) {
                const logs = res.data.logs || [];
                const acts = res.data.accountActivities || [];
                const masters = res.data.masterAccounts || [];

                const isP1 = (c) => !c || c === "Panel 1" || c === "panel1" || c === "jeenweb" || c === "JeenWeb";
                const isP2 = (c) => c === "Panel 2" || c === "panel2" || c === "satvaweb" || c === "SatvaWeb";

                // Panel 1 (jeenweb / Panel 1)
                const logP1Act = logs.find(l => isP1(l.company) && (l.file_type === "Account Activities" || l.file_type === "ACCOUNT_ACTIVITIES"));
                const actsP1 = acts.filter(a => isP1(a.company));
                const dateP1Act = logP1Act?.uploaded_at || (actsP1.length > 0 ? (actsP1[0].created_at || actsP1[0].uploaded_at) : null);

                const logP1Mas = logs.find(l => isP1(l.company) && (l.file_type === "Master Account" || l.file_type === "MASTER_ACCOUNTS"));
                const masP1 = masters.filter(m => isP1(m.company));
                const dateP1Mas = logP1Mas?.uploaded_at || (masP1.length > 0 ? (masP1[0].created_at || masP1[0].uploaded_at) : null);

                // Panel 2 (satvaweb / Panel 2)
                const logP2Act = logs.find(l => isP2(l.company) && (l.file_type === "Account Activities" || l.file_type === "ACCOUNT_ACTIVITIES"));
                const actsP2 = acts.filter(a => isP2(a.company));
                const dateP2Act = logP2Act?.uploaded_at || (actsP2.length > 0 ? (actsP2[0].created_at || actsP2[0].uploaded_at) : null);

                const logP2Mas = logs.find(l => isP2(l.company) && (l.file_type === "Master Account" || l.file_type === "MASTER_ACCOUNTS"));
                const masP2 = masters.filter(m => isP2(m.company));
                const dateP2Mas = logP2Mas?.uploaded_at || (masP2.length > 0 ? (masP2[0].created_at || masP2[0].uploaded_at) : null);

                setLastUploads({
                    p1Account: formatTimestamp(dateP1Act),
                    p1Master: formatTimestamp(dateP1Mas),
                    p2Account: formatTimestamp(dateP2Act),
                    p2Master: formatTimestamp(dateP2Mas)
                });
            }
        } catch (err) {
            console.error("Failed to load last upload history for navbar", err);
        }
    };

    useEffect(() => {
        loadLastUploadHistory();
        window.addEventListener("upload-success", loadLastUploadHistory);
        return () => window.removeEventListener("upload-success", loadLastUploadHistory);
    }, []);

    const [isUploadOpen, setIsUploadOpen] = useState(false);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (isManagementOpen && !e.target.closest("#management-dropdown")) {
                setIsManagementOpen(false);
            }
            if (isDataExplorerOpen && !e.target.closest("#data-explorer-dropdown")) {
                setIsDataExplorerOpen(false);
            }
            if (isReportsOpen && !e.target.closest("#reports-dropdown")) {
                setIsReportsOpen(false);
            }
            if (isAnalyticsOpen && !e.target.closest("#analytics-dropdown")) {
                setIsAnalyticsOpen(false);
            }
            if (isProfileOpen && !e.target.closest("#profile-dropdown")) {
                setIsProfileOpen(false);
            }
            if (isUploadHistoryOpen && !e.target.closest("#upload-history-dropdown")) {
                setIsUploadHistoryOpen(false);
            }
            if (isUploadOpen && !e.target.closest("#upload-dropdown")) {
                setIsUploadOpen(false);
            }
        };
        document.addEventListener("click", handleOutsideClick);
        return () => document.removeEventListener("click", handleOutsideClick);
    }, [isManagementOpen, isDataExplorerOpen, isReportsOpen, isAnalyticsOpen, isProfileOpen, isUploadHistoryOpen, isUploadOpen]);

    const toggleUpload = () => {
        setIsUploadOpen(!isUploadOpen);
        if (isManagementOpen) setIsManagementOpen(false);
        if (isDataExplorerOpen) setIsDataExplorerOpen(false);
        if (isReportsOpen) setIsReportsOpen(false);
        if (isAnalyticsOpen) setIsAnalyticsOpen(false);
    };

    const toggleManagement = () => {
        setIsManagementOpen(!isManagementOpen);
        if (isDataExplorerOpen) setIsDataExplorerOpen(false);
        if (isReportsOpen) setIsReportsOpen(false);
        if (isAnalyticsOpen) setIsAnalyticsOpen(false);
        if (isUploadOpen) setIsUploadOpen(false);
    };

    const toggleDataExplorer = () => {
        setIsDataExplorerOpen(!isDataExplorerOpen);
        if (isManagementOpen) setIsManagementOpen(false);
        if (isReportsOpen) setIsReportsOpen(false);
        if (isAnalyticsOpen) setIsAnalyticsOpen(false);
        if (isUploadOpen) setIsUploadOpen(false);
    };

    const toggleReports = () => {
        setIsReportsOpen(!isReportsOpen);
        if (isManagementOpen) setIsManagementOpen(false);
        if (isDataExplorerOpen) setIsDataExplorerOpen(false);
        if (isAnalyticsOpen) setIsAnalyticsOpen(false);
        if (isUploadOpen) setIsUploadOpen(false);
    };

    const toggleAnalytics = () => {
        setIsAnalyticsOpen(!isAnalyticsOpen);
        if (isManagementOpen) setIsManagementOpen(false);
        if (isDataExplorerOpen) setIsDataExplorerOpen(false);
        if (isReportsOpen) setIsReportsOpen(false);
        if (isUploadOpen) setIsUploadOpen(false);
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error("Logout failed", error);
        }
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        sessionStorage.removeItem("loginTime");
        window.dispatchEvent(new Event("auth-change"));
        navigate("/");
    };

    const rawDataExplorerItems = [
        {
            name: "Transaction Section",
            path: "/user/transactions",
            masterKey: "transactions",
            icon: "fa-solid fa-receipt",
            desc: "Inspect ingested transaction billing records"
        },
        {
            name: "Clients",
            path: "/user/clients",
            masterKey: "clients",
            icon: "fa-solid fa-users-rectangle",
            desc: "Client & Subclient domain assignment directory"
        },
        {
            name: "Accounts Registry",
            path: "/user/accounts",
            masterKey: "accounts",
            icon: "fa-solid fa-building-user",
            desc: "Customer accounts, active seats & lifetime billing"
        }
    ];

    const dataExplorerItems = rawDataExplorerItems.filter(item => 
        isAdmin || hasPermission(item.masterKey, "read")
    );

    const rawAnalyticsItems = [
        {
            name: "Compare Month",
            path: "/user/analytics/compare",
            masterKey: "analytics",
            icon: "fa-solid fa-code-compare",
            desc: "Evaluate invoicing growth & seat expansions"
        },
        {
            name: "Client Performance",
            path: "/user/analytics/client-performance",
            masterKey: "analytics",
            icon: "fa-solid fa-chart-pie",
            desc: "Analyze active seats & client revenue performance"
        }
    ];

    const analyticsItems = rawAnalyticsItems.filter(item => 
        isAdmin || hasPermission(item.masterKey, "read")
    );

    const rawActivityReportItems = [
        {
            name: "Commitment Renewals",
            path: "/user/reports/renewals",
            masterKey: "activity_reports",
            icon: "fa-solid fa-rotate",
            desc: "Contract renewals & seat commitments"
        },
        {
            name: "Commitment Increases",
            path: "/user/reports/increases",
            masterKey: "activity_reports",
            icon: "fa-solid fa-arrow-trend-up",
            desc: "Seat expansion values & contract upgrades"
        },
        {
            name: "New Commitments",
            path: "/user/reports/new-commitments",
            masterKey: "activity_reports",
            icon: "fa-solid fa-circle-plus",
            desc: "Newly initiated commitments & subscriptions"
        },
        {
            name: "Commitments",
            path: "/user/reports/commitments",
            masterKey: "activity_reports",
            icon: "fa-solid fa-file-contract",
            desc: "Active baseline commitments & allocations"
        },
        {
            name: "Usage-Based Billing",
            path: "/user/reports/usage",
            masterKey: "activity_reports",
            icon: "fa-solid fa-bolt",
            desc: "Flexible pay-as-you-go consumption"
        }
    ];

    const activityReportItems = rawActivityReportItems.filter(item => 
        isAdmin || hasPermission(item.masterKey, "read")
    );

    const rawManagementItems = [
        {
            name: "System Settings",
            path: "/admin/settings",
            masterKey: "system_settings",
            icon: "fa-solid fa-sliders",
            desc: "Configure activity rules & system preferences"
        },
        {
            name: "User Master",
            path: "/admin/dashboard",
            masterKey: "user_master",
            icon: "fa-solid fa-users-gear",
            desc: "Manage user profiles & account statuses"
        },
        {
            name: "User Types Master",
            path: "/admin/user-types",
            masterKey: "user_type",
            icon: "fa-solid fa-user-shield",
            desc: "Configure access roles & permissions"
        },
        {
            name: "System Audit Logs",
            path: "/admin/report",
            masterKey: "activity_report",
            icon: "fa-solid fa-list-check",
            desc: "Inspect system audit logs & security history"
        }
    ];

    const availableManagement = rawManagementItems.filter(m => {
        if (isAdmin) return true;
        return hasPermission(m.masterKey, "read");
    });

    const isDashboardAllowed = isAdmin || hasPermission("user_dashboard", "read");
    const isUploadAllowed = isAdmin || hasPermission("upload_section", "read");
    const isMatrixAllowed = isAdmin || hasPermission("financial_matrix", "read");

    const isDataExplorerActive = dataExplorerItems.some(item => location.pathname === item.path);
    const isAnalyticsActive = analyticsItems.some(item => location.pathname === item.path);
    const isReportsActive = activityReportItems.some(item => location.pathname.includes(item.path.replace("/user", "")));
    const isManagementActive = availableManagement.some(item => location.pathname === item.path);

    return (
        <nav className="bg-white shadow-sm border-b border-slate-200 flex flex-col relative z-50">
            {/* First Row */}
            <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between relative z-40">
                <div className="flex items-center gap-2 select-none cursor-pointer" onClick={() => navigate("/user/home")}>
                    <img 
                        src="/Untitled_design-removebg-preview.png" 
                        alt="Google Business Analytics Logo" 
                        className="h-10 sm:h-12 w-auto object-contain transition-transform duration-200 hover:scale-105" 
                    />
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                    {/* Clean 2-Line Text-Only Upload Status Indicator (No Background) */}
                    <div className="hidden lg:flex flex-col gap-0.5 text-[10px] select-none">
                        {/* Line 1: Panel 1 (JeenWeb) */}
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="font-extrabold text-sky-700 bg-sky-100/90 border border-sky-200/80 px-1 py-0.2 rounded text-[9px] uppercase">P1</span>
                            <span className="font-semibold text-slate-500">Account: <span className="font-extrabold font-mono text-slate-800">{lastUploads.p1Account || "No upload yet"}</span></span>
                            <span className="text-slate-300">•</span>
                            <span className="font-semibold text-slate-500">Master: <span className="font-extrabold font-mono text-slate-800">{lastUploads.p1Master || "No upload yet"}</span></span>
                        </div>

                        {/* Line 2: Panel 2 (SatvaWeb) */}
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="font-extrabold text-purple-700 bg-purple-100/90 border border-purple-200/80 px-1 py-0.2 rounded text-[9px] uppercase">P2</span>
                            <span className="font-semibold text-slate-500">Account: <span className="font-extrabold font-mono text-slate-800">{lastUploads.p2Account || "No upload yet"}</span></span>
                            <span className="text-slate-300">•</span>
                            <span className="font-semibold text-slate-500">Master: <span className="font-extrabold font-mono text-slate-800">{lastUploads.p2Master || "No upload yet"}</span></span>
                        </div>
                    </div>

                    {/* Theme Master Palette Trigger Button */}
                    <button
                        type="button"
                        onClick={() => setIsThemeModalOpen(true)}
                        title="Theme Master & Color Customizer"
                        className="w-9 h-9 rounded-xl bg-slate-100/90 hover:bg-slate-200/90 text-slate-700 hover:text-slate-900 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
                    >
                        <i className="fa-solid fa-palette text-sm text-indigo-600"></i>
                    </button>

                    {/* Profile Dropdown */}
                    <div className="relative" id="profile-dropdown">
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-2.5 px-3 py-1.5 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all duration-200 cursor-pointer focus:outline-none"
                            title="User menu"
                        >
                            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-sm">
                                {user.name ? user.name[0].toUpperCase() : "U"}
                            </div>
                            <span className="hidden sm:inline text-sm font-semibold text-slate-700">{user.name || "User"}</span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2.5}
                                stroke="currentColor"
                                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isProfileOpen ? "rotate-180" : ""}`}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>

                        {isProfileOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50 origin-top-right animate-in fade-in slide-in-from-top-2 duration-150">
                                <div className="px-4 py-2.5 border-b border-slate-100">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Signed in as</p>
                                    <p className="text-sm font-bold text-slate-800 truncate mt-0.5">{user.name || "User"}</p>
                                    {user.email && (
                                        <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
                                    )}
                                </div>

                                <div className="px-1.5 py-1 space-y-0.5">
                                    <button
                                        onClick={() => {
                                            navigate("/profile");
                                            setIsProfileOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-all duration-150 cursor-pointer text-left"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 text-slate-400">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                        </svg>
                                        Your Profile
                                    </button>

                                    <button
                                        onClick={() => {
                                            setIsProfileOpen(false);
                                            setIsThemeModalOpen(true);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-all duration-150 cursor-pointer text-left"
                                    >
                                        <i className="fa-solid fa-palette text-indigo-600 text-sm"></i>
                                        Theme Master (Colors)
                                    </button>
                                </div>

                                <div className="border-t border-slate-100 my-1"></div>

                                <div className="px-1.5 py-1">
                                    <button
                                        onClick={() => {
                                            setIsProfileOpen(false);
                                            handleLogout();
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 text-sm font-semibold transition-all duration-150 cursor-pointer text-left"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 text-red-500">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 6.75 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                                        </svg>
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Second Row: Navigation */}
            {user.role && (
                <div className="bg-[#0056cf] border-t border-slate-200 px-4 sm:px-6 lg:px-8 py-0 flex items-center gap-2">
                    <div className="flex items-center flex-wrap relative z-30" id="custom-nav-dropdown">
                        
                        {/* User Dashboard Tab */}
                        {isDashboardAllowed && (
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        navigate("/user/home");
                                    }}
                                    className={`flex items-center justify-center px-4 py-2.5 text-sm border-r border-l border-white/10 rounded-none focus:outline-none transition-all duration-200 font-semibold text-white cursor-pointer ${
                                        location.pathname === "/user/home" ? "bg-white/15" : "bg-[#0056cf] hover:bg-white/5"
                                    }`}
                                >
                                    <span className="font-semibold text-white truncate">User Dashboard</span>
                                </button>
                            </div>
                        )}

                        {/* Upload Section Dropdown with Panel 1 & Panel 2 Sub-Items */}
                        {isUploadAllowed && (
                            <div className="relative" id="upload-dropdown">
                                <button
                                    onClick={toggleUpload}
                                    className={`flex items-center justify-center px-4 py-2.5 text-sm border-r border-white/10 rounded-none focus:outline-none transition-all duration-200 font-semibold text-white cursor-pointer ${
                                        isUploadOpen || location.pathname === "/user/upload" ? "bg-white/15" : "bg-[#0056cf] hover:bg-white/5"
                                    }`}
                                >
                                    <span className="flex items-center gap-2 truncate">
                                        <span className="font-semibold text-white truncate">Upload Section</span>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2.5}
                                            stroke="currentColor"
                                            className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${isUploadOpen ? "rotate-180 text-white" : ""}`}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </span>
                                </button>

                                {isUploadOpen && (
                                    <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 origin-top animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => {
                                                    navigate("/user/upload", { state: { company: "jeenweb" } });
                                                    setIsUploadOpen(false);
                                                }}
                                                className="relative group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-left border border-transparent text-slate-600 hover:bg-sky-50 hover:text-sky-900"
                                            >
                                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-100/80 text-sky-700 font-extrabold shrink-0 text-xs shadow-xs">
                                                    P1
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 group-hover:text-sky-950">Panel 1 (JeenWeb)</p>
                                                    <p className="text-[10.5px] text-slate-400">Account Activities & Master</p>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    navigate("/user/upload", { state: { company: "satvaweb" } });
                                                    setIsUploadOpen(false);
                                                }}
                                                className="relative group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-left border border-transparent text-slate-600 hover:bg-purple-50 hover:text-purple-900"
                                            >
                                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100/80 text-purple-700 font-extrabold shrink-0 text-xs shadow-xs">
                                                    P2
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 group-hover:text-purple-950">Panel 2 (SatvaWeb)</p>
                                                    <p className="text-[10.5px] text-slate-400">Account Activities & Master</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Data & Explorer Dropdown */}
                        {dataExplorerItems.length > 0 && (
                            <div className="relative" id="data-explorer-dropdown">
                                <button
                                    onClick={toggleDataExplorer}
                                    className={`flex items-center justify-center px-4 py-2.5 text-sm border-r border-white/10 rounded-none focus:outline-none transition-all duration-200 font-semibold text-white cursor-pointer ${
                                        isDataExplorerOpen || isDataExplorerActive ? "bg-white/15" : "bg-[#0056cf] hover:bg-white/5"
                                    }`}
                                >
                                    <span className="flex items-center gap-2 truncate">
                                        <span className="font-semibold text-white truncate">Data & Explorer</span>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2.5}
                                            stroke="currentColor"
                                            className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${isDataExplorerOpen ? "rotate-180 text-white" : ""}`}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </span>
                                </button>

                                {isDataExplorerOpen && (
                                    <div className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 origin-top animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex flex-col gap-1">
                                            {dataExplorerItems.map((item, idx) => {
                                                const isActive = location.pathname === item.path;
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            navigate(item.path);
                                                            setIsDataExplorerOpen(false);
                                                        }}
                                                        className={`relative group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-left border border-transparent ${isActive
                                                            ? "bg-indigo-50/70 text-indigo-700 font-semibold border-indigo-100/50"
                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-100"
                                                        }`}
                                                    >
                                                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all shadow-sm shrink-0 ${isActive ? "bg-indigo-100/80 text-indigo-700" : "bg-sky-50 text-sky-600 group-hover:scale-105"
                                                        }`}>
                                                            <i className={`${item.icon || "fa-solid fa-folder"} text-sm`}></i>
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-semibold leading-snug py-0.5 transition-colors truncate ${isActive ? "text-indigo-900 font-bold" : "text-slate-800 group-hover:text-slate-950"
                                                            }`}>
                                                                {item.name}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Analytics Dropdown */}
                        {analyticsItems.length > 0 && (
                            <div className="relative" id="analytics-dropdown">
                                <button
                                    onClick={toggleAnalytics}
                                    className={`flex items-center justify-center px-4 py-2.5 text-sm border-r border-white/10 rounded-none focus:outline-none transition-all duration-200 font-semibold text-white cursor-pointer ${
                                        isAnalyticsOpen || isAnalyticsActive ? "bg-white/15" : "bg-[#0056cf] hover:bg-white/5"
                                    }`}
                                >
                                    <span className="flex items-center gap-2 truncate">
                                        <span className="font-semibold text-white truncate">Analytics</span>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2.5}
                                            stroke="currentColor"
                                            className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${isAnalyticsOpen ? "rotate-180 text-white" : ""}`}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </span>
                                </button>

                                {isAnalyticsOpen && (
                                    <div className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 origin-top animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex flex-col gap-1">
                                            {analyticsItems.map((item, idx) => {
                                                const isActive = location.pathname === item.path;
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            navigate(item.path);
                                                            setIsAnalyticsOpen(false);
                                                        }}
                                                        className={`relative group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-left border border-transparent ${isActive
                                                            ? "bg-indigo-50/70 text-indigo-700 font-semibold border-indigo-100/50"
                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-100"
                                                        }`}
                                                    >
                                                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all shadow-sm shrink-0 ${isActive ? "bg-indigo-100/80 text-indigo-700" : "bg-sky-50 text-sky-600 group-hover:scale-105"
                                                        }`}>
                                                            <i className={`${item.icon || "fa-solid fa-chart-line"} text-sm`}></i>
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-semibold leading-snug py-0.5 transition-colors truncate ${isActive ? "text-indigo-900 font-bold" : "text-slate-800 group-hover:text-slate-950"
                                                            }`}>
                                                                {item.name}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Activity Reports Direct Tab Link */}
                        {activityReportItems.length > 0 && (
                            <div className="relative">
                                <button
                                    onClick={() => navigate("/user/reports/increases")}
                                    className={`flex items-center justify-center px-4 py-2.5 text-sm border-r border-white/10 rounded-none focus:outline-none transition-all duration-200 font-semibold text-white cursor-pointer ${
                                        isReportsActive ? "bg-white/15" : "bg-[#0056cf] hover:bg-white/5"
                                    }`}
                                >
                                    <span className="font-semibold text-white truncate">Activity Reports</span>
                                </button>
                            </div>
                        )}

                        {/* Management Dropdown */}
                        {availableManagement.length > 0 && (
                            <div className="relative" id="management-dropdown">
                                <button
                                    onClick={toggleManagement}
                                    className={`flex items-center justify-center px-4 py-2.5 text-sm border-r border-white/10 rounded-none focus:outline-none transition-all duration-200 font-semibold text-white cursor-pointer ${
                                        isManagementOpen || isManagementActive ? "bg-white/15" : "bg-[#0056cf] hover:bg-white/5"
                                    }`}
                                >
                                    <span className="flex items-center gap-2 truncate">
                                        <span className="font-semibold text-white truncate">Management</span>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2.5}
                                            stroke="currentColor"
                                            className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${isManagementOpen ? "rotate-180 text-white" : ""}`}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </span>
                                </button>

                                {isManagementOpen && (
                                    <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 origin-top-right animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex flex-col gap-1">
                                            {availableManagement.map((m, idx) => {
                                                const isActive = location.pathname === m.path;
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            navigate(m.path);
                                                            setIsManagementOpen(false);
                                                        }}
                                                        className={`relative group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-left border border-transparent ${isActive
                                                            ? "bg-indigo-50/70 text-indigo-700 font-semibold border-indigo-100/50"
                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-100"
                                                            }`}
                                                    >
                                                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all shadow-sm shrink-0 ${isActive ? "bg-indigo-100/80 text-indigo-700" : "bg-sky-50 text-sky-600 group-hover:scale-105"
                                                            }`}>
                                                            <i className={`${m.icon || "fa-solid fa-folder"} text-sm`}></i>
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-semibold leading-snug py-0.5 transition-colors truncate ${isActive ? "text-indigo-900 font-bold" : "text-slate-800 group-hover:text-slate-950"
                                                                }`}>
                                                                {m.name}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Financial Matrix Tab - Clean Text without icons */}
                        {isMatrixAllowed && (
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        navigate("/user/matrix");
                                    }}
                                    className={`flex items-center justify-center px-4 py-2.5 text-sm border-r border-white/10 rounded-none focus:outline-none transition-all duration-200 font-semibold text-white cursor-pointer ${
                                        location.pathname === "/user/matrix" ? "bg-white/15" : "bg-[#0056cf] hover:bg-white/5"
                                    }`}
                                >
                                    <span className="font-semibold text-white truncate">Financial Matrix</span>
                                </button>
                            </div>
                        )}

                        {/* Google Payable Liability Tab */}
                        {isMatrixAllowed && (
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        navigate("/user/google-payable");
                                    }}
                                    className={`flex items-center justify-center px-4 py-2.5 text-sm border-r border-white/10 rounded-none focus:outline-none transition-all duration-200 font-semibold text-white cursor-pointer ${
                                        location.pathname === "/user/google-payable" ? "bg-white/15" : "bg-[#0056cf] hover:bg-white/5"
                                    }`}
                                >
                                    <span className="font-semibold text-white truncate">Google Payable</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <ThemeMasterModal />
        </nav>
    );
}
