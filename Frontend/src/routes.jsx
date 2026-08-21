import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import DeviceRegistration from "./pages/DeviceRegistration";
import PendingApproval from "./pages/PendingApproval";

import UserHome from "./pages/user/UserHome";
import UploadPage from "./pages/user/UploadPage";
import TransactionsPage from "./pages/user/TransactionsPage";
import ClientsPage from "./pages/user/ClientsPage";
import AccountsPage from "./pages/user/AccountsPage";
import ActivityReportPage from "./pages/user/ActivityReportPage";
import FinancialMatrixPage from "./pages/user/FinancialMatrixPage";
import CompareMonthPage from "./pages/user/CompareMonthPage";
import ClientPerformancePage from "./pages/user/ClientPerformancePage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserGroupMaster from "./pages/admin/user/UserGroupMaster";
import CreateUser from "./pages/admin/user/CreateUser";
import CreateUserType from "./pages/admin/user/CreateUserType";
import ActivityReport from "./pages/admin/ActivityReport";
import SettingsPage from "./pages/admin/SettingsPage";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";

export default function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/"
                element={<Login />}
            />

            <Route
                path="/device-registration"
                element={<DeviceRegistration />}
            />

            <Route
                path="/pending-approval"
                element={<PendingApproval />}
            />

            {/* Standard Protected Routes with Master Permissions */}
            <Route element={<ProtectedRoute requiredMaster="user_dashboard" />}>
                <Route
                    path="/user/home"
                    element={<UserHome />}
                />
            </Route>

            <Route element={<ProtectedRoute requiredMaster="upload_section" />}>
                <Route
                    path="/user/upload"
                    element={<UploadPage />}
                />
            </Route>

            <Route element={<ProtectedRoute requiredMaster="transactions" />}>
                <Route
                    path="/user/transactions"
                    element={<TransactionsPage />}
                />
            </Route>

            <Route element={<ProtectedRoute requiredMaster="clients" />}>
                <Route
                    path="/user/clients"
                    element={<ClientsPage />}
                />
            </Route>

            <Route element={<ProtectedRoute requiredMaster="accounts" />}>
                <Route
                    path="/user/accounts"
                    element={<AccountsPage />}
                />
            </Route>

            <Route element={<ProtectedRoute requiredMaster="financial_matrix" />}>
                <Route
                    path="/user/matrix"
                    element={<FinancialMatrixPage />}
                />
            </Route>

            {/* Analytics Suite Routes */}
            <Route element={<ProtectedRoute requiredMaster="analytics" />}>
                <Route
                    path="/user/analytics/compare"
                    element={<CompareMonthPage />}
                />
                <Route
                    path="/reports/compare-month"
                    element={<CompareMonthPage />}
                />
                <Route
                    path="/user/analytics/client-performance"
                    element={<ClientPerformancePage />}
                />
                <Route
                    path="/reports/client-performance"
                    element={<ClientPerformancePage />}
                />
            </Route>

            <Route element={<ProtectedRoute requiredMaster="activity_reports" />}>
                <Route
                    path="/user/reports/:type"
                    element={<ActivityReportPage />}
                />
                <Route
                    path="/reports/:type"
                    element={<ActivityReportPage />}
                />
            </Route>

            <Route element={<ProtectedRoute />}>
                <Route
                    path="/profile"
                    element={<Profile />}
                />
            </Route>

            {/* Administration & Governance Routes */}
            <Route element={<ProtectedRoute requiredMaster="user_master" />}>
                <Route
                    path="/admin/dashboard"
                    element={<AdminDashboard />}
                />
                <Route
                    path="/admin/create-user"
                    element={<CreateUser />}
                />
                <Route
                    path="/admin/users/create"
                    element={<CreateUser />}
                />
                <Route
                    path="/admin/user/create"
                    element={<CreateUser />}
                />
            </Route>

            <Route element={<ProtectedRoute requiredMaster="user_type" />}>
                <Route
                    path="/admin/user-types"
                    element={<UserGroupMaster />}
                />
                <Route
                    path="/admin/create-user-type"
                    element={<CreateUserType />}
                />
                <Route
                    path="/admin/user-types/create"
                    element={<CreateUserType />}
                />
                <Route
                    path="/admin/user-type/create"
                    element={<CreateUserType />}
                />
            </Route>

            <Route element={<ProtectedRoute requiredMaster="activity_report" />}>
                <Route
                    path="/admin/report"
                    element={<ActivityReport />}
                />
            </Route>

            <Route element={<ProtectedRoute requiredMaster="system_settings" />}>
                <Route
                    path="/admin/settings"
                    element={<SettingsPage />}
                />
            </Route>
        </Routes>
    );
}