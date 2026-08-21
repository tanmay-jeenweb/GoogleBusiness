import React, { useState } from "react";
import Navbar from "../../../components/Navbar";
import { createUserType } from "../../../api/userTypeMasterApi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

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

export default function CreateUserType() {
  const [newTypeName, setNewTypeName] = useState("");
  const [permissions, setPermissions] = useState(defaultPerms());
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!newTypeName.trim()) {
      toast.error("Please enter a User Type / Role Name.");
      return;
    }
    setSaving(true);
    try {
      await createUserType({ typeName: newTypeName.trim(), permissions });
      toast.success(`User type '${newTypeName.trim()}' added successfully.`);
      setNewTypeName("");
      setPermissions(defaultPerms());
      setTimeout(() => navigate("/admin/user-types"), 1000);
    } catch (err) {
      console.error("Failed to add user type", err);
      toast.error(err?.response?.data?.message || "Unable to add user type. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", flex: 1, background: "#f8fafc", fontFamily: "'Inter',sans-serif" }}>
      <Navbar title="CRM Admin" />

      <main className="flex-1 flex flex-col w-full max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                User Access Control
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create User Type / Role</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Define a new role and configure page-level access permissions for your team.
            </p>
          </div>

          <button
            onClick={() => navigate("/admin/user-types")}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2"
          >
            <i className="fa-solid fa-arrow-left"></i> Back to User Types
          </button>
        </div>

        {/* Save Form */}
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Role Name Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                User Type / Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="e.g. Finance Analyst, Sales Representative, Auditor"
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
              onClick={() => navigate("/admin/user-types")}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <i className="fa-solid fa-floppy-disk"></i>
              {saving ? "Saving User Type..." : "Save User Type & Permissions"}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}
