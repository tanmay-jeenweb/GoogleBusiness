import { useEffect, useState, useMemo } from "react";
import Navbar from "../../components/Navbar";
import DataTable from "../../components/DataTable";
import { fetchActivityLogs } from "../../api/authApi";
import toast from "react-hot-toast";

// ─── Modal to view detailed change / payload data ──────────────────────────────────
function DetailModal({ isOpen, row, onClose }) {
  if (!isOpen || !row) return null;

  const beforeObj = row.before_data || {};
  const afterObj = row.after_data || {};

  const allKeys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]))
    .filter(key => key !== 'device_id')
    .sort();

  const isFieldChanged = (key) => {
    const vBefore = beforeObj[key];
    const vAfter = afterObj[key];
    if (typeof vBefore === "object" || typeof vAfter === "object") {
      return JSON.stringify(vBefore) !== JSON.stringify(vAfter);
    }
    return vBefore !== vAfter;
  };

  const formatValue = (val) => {
    if (val === null || val === undefined) return <span style={{ color: "#94a3b8" }}>—</span>;
    if (typeof val === "boolean") return val ? "True" : "False";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }}>
      <div style={{
        background: "#fff", borderRadius: 18, width: "100%", maxWidth: 700, margin: "0 auto",
        boxShadow: "0 25px 60px rgba(0,0,0,0.2)", overflow: "hidden", display: "flex", flexDirection: "column",
        maxHeight: "90vh"
      }}>
        {/* Modal Header */}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg,#0056cf,#0040a1)" }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}>Activity Log Detail</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#d9e2ec" }}>
              {row.master_name} — {(row.change_type || 'LOG').toUpperCase()} by {row.username || 'System'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 18, height: 18 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px 28px", overflowY: "auto", flex: 1, background: "#f8fafc" }}>
          {/* Metadata Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20, background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>User</span>
              <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{row.username || "System"}</p>
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Action Type</span>
              <p style={{ margin: "2px 0 0" }}>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                  row.change_type === 'created' || row.change_type === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                  row.change_type === 'uploaded' ? 'bg-purple-100 text-purple-800' :
                  row.change_type === 'exported' ? 'bg-blue-100 text-blue-800' :
                  row.change_type === 'updated' ? 'bg-amber-100 text-amber-800' :
                  row.change_type === 'deleted' || row.change_type === 'rejected' ? 'bg-rose-100 text-rose-800' :
                  'bg-slate-100 text-slate-800'
                }`}>
                  {(row.change_type || 'LOG').toUpperCase()}
                </span>
              </p>
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Timestamp</span>
              <p style={{ margin: "2px 0 0", fontSize: 14, color: "#1e293b" }}>{new Date(row.created_at).toLocaleString()}</p>
            </div>
          </div>

          {/* Table View */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#475569" }}>Field</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#475569" }}>Before</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#475569" }}>After</th>
                </tr>
              </thead>
              <tbody>
                {allKeys.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: 14, textAlign: "center", color: "#64748b" }}>No details available</td>
                  </tr>
                ) : (
                  allKeys.map((key) => {
                    const changed = isFieldChanged(key);
                    return (
                      <tr key={key} style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: changed ? "rgba(254, 243, 199, 0.4)" : "transparent"
                      }}>
                        <td style={{ padding: "10px 14px", fontWeight: 550, color: "#1e293b", width: "30%" }}>{key}</td>
                        <td style={{ padding: "10px 14px", color: "#475569", width: "35%", wordBreak: "break-all" }}>{formatValue(beforeObj[key])}</td>
                        <td style={{
                          padding: "10px 14px",
                          color: changed ? "#92400e" : "#475569",
                          fontWeight: changed ? 600 : 400,
                          width: "35%",
                          wordBreak: "break-all"
                        }}>
                          {formatValue(afterObj[key])}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", background: "#fafafa" }}>
          <button type="button" onClick={onClose}
            style={{ padding: "9px 24px", borderRadius: 8, border: "1.5px solid #cbd5e1", color: "#475569", background: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Activity Report Component ──────────────────────────────────────────────
export default function ActivityReport() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetchActivityLogs();
      if (res.data?.success) {
        setLogs(res.data.logs || []);
      } else {
        toast.error(res.data?.message || "Failed to fetch activity logs");
      }
    } catch (err) {
      console.error("Error fetching activity logs:", err);
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleExportCSV = () => {
    if (logs.length === 0) return toast.error("No activity logs to export");
    const headers = ["Log ID", "Username", "Module / Master", "Action Type", "Device ID", "Timestamp"];
    const csvRows = [
      headers.join(","),
      ...logs.map(l => [
        l.id,
        `"${l.username || 'System'}"`,
        `"${l.master_name}"`,
        `"${l.change_type}"`,
        `"${l.device_id || 'N/A'}"`,
        `"${new Date(l.created_at).toLocaleString()}"`
      ].join(","))
    ];

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `System_Activity_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${logs.length} activity logs to CSV`);
  };

  const columns = useMemo(() => [
    {
      key: "username",
      label: "Username",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
            {row.username ? row.username[0].toUpperCase() : "S"}
          </div>
          <span className="font-semibold text-slate-800">{row.username || "System"}</span>
        </div>
      )
    },
    {
      key: "master_name",
      label: "Module / Master",
      render: (row) => <span className="font-semibold text-slate-700">{row.master_name}</span>
    },
    {
      key: "change_type",
      label: "Action",
      render: (row) => {
        const act = (row.change_type || 'LOG').toLowerCase();
        let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";

        if (act.includes("upload")) badgeStyle = "bg-purple-50 text-purple-700 border-purple-200";
        else if (act.includes("create") || act.includes("approve")) badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
        else if (act.includes("export") || act.includes("download")) badgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
        else if (act.includes("update") || act.includes("edit")) badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
        else if (act.includes("delete") || act.includes("reject") || act.includes("close")) badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";

        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase border tracking-wide ${badgeStyle}`}>
            {row.change_type ? row.change_type.toUpperCase() : 'LOG'}
          </span>
        );
      }
    },
    {
      key: "details",
      label: "Details",
      sortable: false,
      render: (row) => (row.before_data || row.after_data) ? (
        <button
          onClick={() => {
            setSelectedRow(row);
            setModalOpen(true);
          }}
          className="text-xs text-indigo-600 hover:text-indigo-900 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 font-semibold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
        >
          <i className="fa-solid fa-eye text-[11px]"></i> View Details
        </button>
      ) : <span className="text-slate-400">—</span>
    },
    {
      key: "created_at",
      label: "Timestamp",
      render: (row) => <span className="text-xs font-mono text-slate-500">{new Date(row.created_at).toLocaleString()}</span>
    }
  ], []);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans text-slate-900 min-h-screen">
      <Navbar title="Activity Report" />

      <main className="flex-1 flex flex-col w-full max-w-[96rem] mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header & Export Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wide">
                System Activity Audit Trail
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              Activity Report & System Logs
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Real-time audit log of client management, CSV/Excel uploads, report exports, and user modifications.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto"
          >
            <i className="fa-solid fa-file-excel text-sm"></i>
            Export Activity Logs CSV ({logs.length})
          </button>
        </div>

        {/* DIRECT DATATABLE DISPLAY */}
        <div className="flex-1 flex flex-col mb-8">
          <DataTable
            tableId="system_activity_report"
            title="Activity Report - Live System Audit Logs"
            data={logs}
            columns={columns}
            loading={loading}
            searchPlaceholder="Search logs by username, module, action or details..."
          />
        </div>

      </main>

      {/* Detail Modal */}
      <DetailModal
        isOpen={modalOpen}
        row={selectedRow}
        onClose={() => {
          setModalOpen(false);
          setSelectedRow(null);
        }}
      />
    </div>
  );
}
