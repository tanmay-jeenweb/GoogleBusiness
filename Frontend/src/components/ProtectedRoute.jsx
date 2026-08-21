import { Navigate, Outlet, useLocation } from "react-router-dom";
import { usePermission } from "../context/PermissionContext";
import Navbar from "./Navbar";

export default function ProtectedRoute({ allowedRole, allowedModule, requiredMaster, requiredMasters, requiredAction = "read" }) {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const location = useLocation();
    const { hasPermission, getFirstPermittedPage, loading } = usePermission();

    if (!token || !user) {
        return <Navigate to="/" replace />;
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm font-semibold">Verifying permissions...</p>
                </div>
            </div>
        );
    }

    const AccessDeniedScreen = () => (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar title="Access Restricted" />
            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center text-2xl mb-4 shadow-sm">
                    <i className="fa-solid fa-lock"></i>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Access Restricted</h1>
                <p className="text-sm text-slate-500 max-w-md mt-2 leading-relaxed">
                    Your account role does not have permission to access this page or section. Please contact your system administrator to request access.
                </p>
                <div className="mt-6 flex items-center gap-3">
                    <button
                        onClick={() => window.history.back()}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                    >
                        Go Back
                    </button>
                </div>
            </main>
        </div>
    );

    // Smart auto-redirect helper
    const handleUnpermittedRedirect = () => {
        const firstPermittedPath = getFirstPermittedPage();
        if (firstPermittedPath && firstPermittedPath !== location.pathname) {
            return <Navigate to={firstPermittedPath} replace />;
        }
        return <AccessDeniedScreen />;
    };

    // Role check
    if (allowedRole && user.role !== allowedRole && !(allowedRole === "admin" && user.role === "super admin")) {
        const isAllowedByMaster = (requiredMaster && hasPermission(requiredMaster, requiredAction)) ||
                                  (requiredMasters && requiredMasters.some(m => hasPermission(m, requiredAction)));
        if (!isAllowedByMaster) {
            return handleUnpermittedRedirect();
        }
    }

    // Master permission check
    if (requiredMaster && !hasPermission(requiredMaster, requiredAction)) {
        return handleUnpermittedRedirect();
    }
    if (requiredMasters && !requiredMasters.some(m => hasPermission(m, requiredAction))) {
        return handleUnpermittedRedirect();
    }

    // Module check
    if (allowedModule) {
        if (user.role !== "admin" && user.role !== "super admin") {
            const hasModule = user.modules && user.modules.includes(allowedModule);
            if (!hasModule) {
                return handleUnpermittedRedirect();
            }
        }
    }

    return <Outlet />;
}
