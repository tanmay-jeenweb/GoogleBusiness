import React, { useEffect, useState, useMemo } from "react";
import Navbar from "../../../components/Navbar";
import { getUserTypes, updateUserType, deleteUserType } from "../../../api/userTypeMasterApi";
import DataTable from "../../../components/DataTable";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { usePermission } from "../../../context/PermissionContext";

// ─── Permission Sections Registry ────────────────────────────────────────────
const PERMISSION_SECTIONS = [
  {
    title: "Core Pages & Dashboards",
    masters: [
      { key: "user_dashboard",        label: "User Dashboard", desc: "Overview analytics & portfolio summary (/user/home)" },
      { key: "upload_section",        label: "Upload Section", desc: "Ingest Account Activities & Master Accounts (/user/upload)" },
      { key: "transactions",          label: "Transaction Section", desc: "Inspect & search transaction records (/user/transactions)" },
      { key: "clients",               label: "Clients Directory", desc: "Manage client & subclient domain mappings (/user/clients)" },
      { key: "accounts",              label: "Accounts Registry", desc: "Customer accounts & lifetime billing (/user/accounts)" },
      { key: "financial_matrix",      label: "Financial Matrix", desc: "12-Month annual billing matrix (/user/matrix)" },
      { key: "activity_reports",      label: "Activity Reports Suite", desc: "Renewals, Increases, New Commitments, Usage (/user/reports/*)" },
      { key: "analytics",             label: "Analytics Suite", desc: "Compare Month Growth & Client Performance (/user/analytics/*)" },
    ]
  },
  {
    title: "System Administration & Management",
    masters: [
      { key: "system_settings",       label: "System Settings", desc: "Activity parsing rules & keywords (/admin/settings)" },
      { key: "user_master",           label: "User Master", desc: "Manage user profiles & account creation (/admin/dashboard)" },
      { key: "user_type",             label: "User Types Master", desc: "Create & manage role permission groups (/admin/user-types)" },
      { key: "activity_report",       label: "System Audit Logs", desc: "Platform security history & audit tracking (/admin/report)" },
    ]
  }
];

const MASTERS = PERMISSION_SECTIONS.flatMap(s => s.masters);

const defaultPerms = () =>
  MASTERS.map((m) => ({
    masterName: m.key,
    canRead: true,
    canWrite: m.key === "upload_section" || m.key === "user_master" || m.key === "user_type",
    canUpdate: true,
    canDelete: false,
  }));

const buildPermsFromApi = (apiPerms) => {
  if (!apiPerms || apiPerms.length === 0) return defaultPerms();
  return MASTERS.map((m) => {
    const found = apiPerms.find((p) => p.masterName === m.key);
    if (found) {
      return {
        masterName: m.key,
        canRead: !!found.canRead,
        canWrite: !!found.canWrite,
        canUpdate: !!found.canUpdate,
        canDelete: !!found.canDelete
      };
    }
    return { masterName: m.key, canRead: false, canWrite: false, canUpdate: false, canDelete: false };
  });
};

// ─── Inline Badges Component ───────────────────────────────────────────────────
function PermBadges({ permissions }) {
  if (!permissions || permissions.length === 0)
    return <span className="text-slate-400 text-xs">No permissions set</span>;

  const enabledPages = MASTERS.map((m) => {
    const p = permissions.find((x) => x.masterName === m.key);
    if (p && p.canRead) return { label: m.label, canWrite: p.canWrite };
    return null;
  }).filter(Boolean);

  if (enabledPages.length === 0)
    return <span className="text-slate-400 text-xs">No page access enabled</span>;

  return (
    <div className="flex flex-wrap gap-1.5 max-w-lg">
      {enabledPages.map((p) => (
        <span key={p.label} className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center gap-1">
          <i className="fa-solid fa-circle-check text-emerald-600 text-[10px]"></i>
          {p.label}
          {p.canWrite && <span className="text-blue-600 font-mono text-[9px] bg-blue-50 px-1 rounded">+Actions</span>}
        </span>
      ))}
    </div>
  );
}

// ─── Edit Form Component ───────────────────────────────────────────────────────
function EditForm({ row, onClose, onSave, saving }) {
  const [typeName, setTypeName] = useState(row.type_name || "");
  const [permissions, setPermissions] = useState(buildPermsFromApi(row.permissions));

  const togglePageAccess = (masterKey) => {
    setPermissions((prev) =>
      prev.map((p) => (p.masterName === masterKey ? { ...p, canRead: !p.canRead } : p))
    );
  };

  const toggleWritePermission = (masterKey) => {
    setPermissions((prev) =>
      prev.map((p) => (p.masterName === masterKey ? { ...p, canWrite: !p.canWrite } : p))
    );
  };

  const enableAllPages = () => {
    setPermissions((prev) => prev.map((p) => ({ ...p, canRead: true, canWrite: true })));
  };

  const disableAllPages = () => {
    setPermissions((prev) => prev.map((p) => ({ ...p, canRead: false, canWrite: false })));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(row.id, typeName, permissions);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
      <main className="flex-1 flex flex-col w-full max-w-6xl mx-auto py-4 px-4 sm:px-6 space-y-6">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                Edit User Type Access
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Edit Role: {row.type_name}</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Update page access toggles and operational permissions for this user role.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2"
          >
            <i className="fa-solid fa-arrow-left"></i> Cancel Edit
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Role Name Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                User Type / Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-4 sm:pt-0">
              <button
                type="button"
                onClick={enableAllPages}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Enable All Pages
              </button>
              <button
                type="button"
                onClick={disableAllPages}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Disable All Pages
              </button>
            </div>
          </div>

          {/* PAGE PERMISSION SECTIONS */}
          {PERMISSION_SECTIONS.map((sec, sIdx) => (
            <div key={sIdx} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-layer-group text-blue-600"></i>
                  {sec.title}
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  {sec.masters.length} Pages Configurable
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {sec.masters.map((m) => {
                  const permObj = permissions.find((p) => p.masterName === m.key) || { canRead: false, canWrite: false };
                  const isReadEnabled = permObj.canRead;
                  const isWriteEnabled = permObj.canWrite;

                  return (
                    <div key={m.key} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900">{m.label}</span>
                          <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{m.key}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* READ ACCESS TOGGLE */}
                        <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-extrabold cursor-pointer transition-all ${
                          isReadEnabled
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs"
                            : "bg-slate-100 text-slate-400 border-slate-200"
                        }`}>
                          <input
                            type="checkbox"
                            checked={isReadEnabled}
                            onChange={() => togglePageAccess(m.key)}
                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                          />
                          <span>{isReadEnabled ? "Page Enabled" : "Disabled"}</span>
                        </label>

                        {/* WRITE / ACTION PERMISSION (IF APPLICABLE) */}
                        {(m.key === "upload_section" || m.key === "user_master" || m.key === "user_type" || m.key === "system_settings") && (
                          <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-extrabold cursor-pointer transition-all ${
                            isWriteEnabled
                              ? "bg-blue-50 text-blue-800 border-blue-200 shadow-2xs"
                              : "bg-slate-100 text-slate-400 border-slate-200"
                          }`}>
                            <input
                              type="checkbox"
                              checked={isWriteEnabled}
                              onChange={() => toggleWritePermission(m.key)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <span>{m.key === "upload_section" ? "Can Upload Files" : "Can Edit / Modify"}</span>
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Action Footer */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !typeName.trim()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <i className="fa-solid fa-floppy-disk"></i>
              {saving ? "Saving Changes..." : "Save Role Permissions"}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}

// ─── Main User Group Master Page ───────────────────────────────────────────────
export default function UserGroupMaster() {
  const navigate = useNavigate();
  const [userTypes, setUserTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingRow, setEditingRow] = useState(null);

  const loadUserTypes = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getUserTypes();
      setUserTypes(response.data.data || []);
    } catch (err) {
      console.error("Failed to load user types", err);
      setError("Unable to load user types. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUserTypes(); }, []);

  const handleSave = async (id, typeName, permissions) => {
    if (!typeName.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      await updateUserType(id, { typeName: typeName.trim(), permissions });
      toast.success("User type updated successfully");
      setEditingRow(null);
      await loadUserTypes();
    } catch (err) {
      console.error("Failed to update user type", err);
      toast.error(err?.response?.data?.message || "Unable to update user type.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user type?")) return;
    setSaving(true);
    try {
      await deleteUserType(id);
      toast.success("User type deleted successfully");
      await loadUserTypes();
    } catch (err) {
      console.error("Failed to delete user type", err);
      toast.error(err?.response?.data?.message || "Unable to delete user type.");
    } finally {
      setSaving(false);
    }
  };

  const { hasPermission } = usePermission();

  const columns = useMemo(() => {
    const cols = [
      { key: "id", label: "ID", minWidth: "60px" },
      {
        key: "type_name", label: "User Type",
        render: (row) => <span className="font-extrabold text-slate-900">{row.type_name}</span>
      },
      {
        key: "permissions", label: "Page Access Permissions",
        sortable: false,
        render: (row) => <PermBadges permissions={row.permissions} />
      }
    ];

    const canUpdate = hasPermission("user_type", "update") || hasPermission("user_type", "write");
    const canDelete = hasPermission("user_type", "delete");

    if (canUpdate || canDelete) {
      cols.push({
        key: "actions", label: "Actions", sortable: false, minWidth: "120px",
        render: (row) => (
          <div className="flex items-center gap-2">
            {canUpdate && (
              <button
                onClick={() => setEditingRow(row)}
                className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center hover:bg-blue-100 transition-all cursor-pointer"
                title="Edit Role Permissions"
              >
                <i className="fa-solid fa-[#0056cf] fa-pen-to-square text-xs"></i>
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => handleDelete(row.id)}
                className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center justify-center hover:bg-red-100 transition-all cursor-pointer"
                title="Delete User Type"
              >
                <i className="fa-solid fa-trash-can text-xs"></i>
              </button>
            )}
          </div>
        )
      });
    }

    return cols;
  }, [saving, hasPermission]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", flex: 1, background: "#f8fafc", fontFamily: "'Inter',sans-serif" }}>
      <Navbar title="CRM Admin" />

      <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-5 text-sm font-semibold">
            {error}
          </div>
        )}
        {editingRow ? (
          <EditForm
            row={editingRow}
            onClose={() => setEditingRow(null)}
            onSave={handleSave}
            saving={saving}
          />
        ) : (
          <DataTable
            tableId="user_group_master"
            title="User Types Master"
            data={userTypes}
            columns={columns}
            loading={loading}
            searchPlaceholder="Search user types..."
            actionButton={
              hasPermission("user_type", "write") ? (
                <button
                  onClick={() => navigate("/admin/user-types/create")}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
                  title="Create User Type"
                >
                  <i className="fa-solid fa-plus text-xs"></i> Create User Type
                </button>
              ) : null
            }
          />
        )}
      </main>
    </div>
  );
}
