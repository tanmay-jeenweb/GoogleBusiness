import React, { createContext, useState, useEffect, useContext } from "react";
import { getMyPermissions } from "../api/authApi";

const PermissionContext = createContext(null);

const PAGE_PRIORITY_LIST = [
    { key: "user_dashboard",        path: "/user/home" },
    { key: "upload_section",        path: "/user/upload" },
    { key: "transactions",          path: "/user/transactions" },
    { key: "clients",               path: "/user/clients" },
    { key: "accounts",              path: "/user/accounts" },
    { key: "financial_matrix",      path: "/user/matrix" },
    { key: "activity_reports",      path: "/user/reports/renewals" },
    { key: "system_settings",       path: "/admin/settings" },
    { key: "user_master",           path: "/admin/dashboard" },
    { key: "user_type",             path: "/admin/user-types" },
    { key: "activity_report",       path: "/admin/report" }
];

export function PermissionProvider({ children }) {
    const [permissions, setPermissions] = useState({});
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchPermissions = async () => {
        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("user") || "null");

        if (!token || !user) {
            setPermissions({});
            setIsAdmin(false);
            setLoading(false);
            return;
        }

        if (user.role === "admin" || user.role === "super admin") {
            setIsAdmin(true);
            setPermissions({});
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await getMyPermissions();
            if (response.data && response.data.success) {
                setPermissions(response.data.permissions || {});
                setIsAdmin(!!response.data.isAdmin);
            } else {
                setPermissions({});
                setIsAdmin(false);
            }
        } catch (error) {
            console.error("Failed to fetch user permissions:", error);
            setPermissions({});
            setIsAdmin(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPermissions();
        
        const handleStorageChange = () => {
            fetchPermissions();
        };
        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("auth-change", handleStorageChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("auth-change", handleStorageChange);
        };
    }, []);

    const hasPermission = (masterName, action = "read") => {
        const user = JSON.parse(localStorage.getItem("user") || "null");

        if (isAdmin || (user && (user.role === "admin" || user.role === "super admin"))) {
            return true;
        }

        if (!masterName) return true;

        if (permissions && Object.prototype.hasOwnProperty.call(permissions, masterName)) {
            const perm = permissions[masterName];
            return perm ? !!perm[action] : false;
        }

        if (permissions && Object.keys(permissions).length > 0) {
            return false;
        }

        return masterName === "user_dashboard";
    };

    // Smart helper to get the first page the user is permitted to access
    const getFirstPermittedPage = () => {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        if (isAdmin || (user && (user.role === "admin" || user.role === "super admin"))) {
            return "/user/home";
        }

        // Search through page candidates for the first allowed page
        for (const item of PAGE_PRIORITY_LIST) {
            if (hasPermission(item.key, "read")) {
                return item.path;
            }
        }

        return "/user/home";
    };

    return (
        <PermissionContext.Provider value={{ permissions, isAdmin, loading, hasPermission, getFirstPermittedPage, refreshPermissions: fetchPermissions }}>
            {children}
        </PermissionContext.Provider>
    );
}

export function usePermission() {
    const context = useContext(PermissionContext);
    if (!context) {
        throw new Error("usePermission must be used within a PermissionProvider");
    }
    return context;
}
