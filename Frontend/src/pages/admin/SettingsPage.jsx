import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import { fetchKeywordRules, createKeywordRule, updateKeywordRule, deleteKeywordRule } from "../../api/settingsApi";

export default function SettingsPage() {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [formData, setFormData] = useState({
        keyword_match: "",
        activity_classification: "",
        priority: 10,
        status: "ACTIVE"
    });
    const [submitting, setSubmitting] = useState(false);

    const loadRules = async () => {
        try {
            setLoading(true);
            const res = await fetchKeywordRules();
            if (res.data?.success) {
                setRules(res.data.rules || []);
            }
        } catch (error) {
            console.error("Failed to fetch keyword rules:", error);
            toast.error("Failed to load activity keyword rules");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRules();
    }, []);

    const openCreateModal = () => {
        setEditingRule(null);
        setFormData({
            keyword_match: "",
            activity_classification: "",
            priority: 10,
            status: "ACTIVE"
        });
        setIsModalOpen(true);
    };

    const openEditModal = (rule) => {
        setEditingRule(rule);
        setFormData({
            keyword_match: rule.keyword_match,
            activity_classification: rule.activity_classification,
            priority: rule.priority,
            status: rule.status
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.keyword_match.trim() || !formData.activity_classification.trim()) {
            toast.error("Keyword Match and Activity Classification are required");
            return;
        }

        try {
            setSubmitting(true);
            if (editingRule) {
                await updateKeywordRule(editingRule.id, formData);
                toast.success("Keyword rule updated successfully!");
            } else {
                await createKeywordRule(formData);
                toast.success("New keyword rule created successfully!");
            }
            setIsModalOpen(false);
            loadRules();
        } catch (error) {
            console.error("Save keyword rule error:", error);
            toast.error("Failed to save keyword rule");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this keyword rule?")) return;
        try {
            await deleteKeywordRule(id);
            toast.success("Keyword rule deleted successfully");
            loadRules();
        } catch (error) {
            console.error("Delete rule error:", error);
            toast.error("Failed to delete rule");
        }
    };

    const toggleRuleStatus = async (rule) => {
        const newStatus = rule.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        try {
            await updateKeywordRule(rule.id, { ...rule, status: newStatus });
            toast.success(`Rule status set to ${newStatus}`);
            loadRules();
        } catch (error) {
            toast.error("Failed to toggle status");
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar title="System Settings" />

            <main className="flex-1 w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
                
                {/* Header Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                Management Suite
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            System Configuration
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Configure description parsing rules and keyword priorities for transaction categorization
                        </p>
                    </div>

                    <button
                        onClick={openCreateModal}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto"
                    >
                        <i className="fa-solid fa-plus text-xs"></i>
                        Create Keyword Rule
                    </button>
                </div>

                {/* MAIN CONTENT: ACTIVITY KEYWORD RULES TABLE */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900">
                                Description Parsing Keywords
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Keyword priority rules automatically categorize uploaded reseller billing transactions
                            </p>
                        </div>

                        <span className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 self-start sm:self-auto">
                            {rules.length} Configured Rules
                        </span>
                    </div>

                    {/* Keyword Rules Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Keyword Match</th>
                                    <th className="py-3.5 px-4">Activity Classification</th>
                                    <th className="py-3.5 px-4 text-center">Priority</th>
                                    <th className="py-3.5 px-4 text-center">Status</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="py-12 text-center text-slate-400">
                                            <i className="fa-solid fa-circle-notch fa-spin text-xl mb-2 text-blue-600 block"></i>
                                            Loading keyword rules from MySQL...
                                        </td>
                                    </tr>
                                ) : rules.length > 0 ? (
                                    rules.map((rule) => (
                                        <tr key={rule.id} className="hover:bg-slate-50/80 transition-colors">
                                            
                                            {/* Keyword Match */}
                                            <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                                                "{rule.keyword_match}"
                                            </td>

                                            {/* Activity Classification */}
                                            <td className="py-3.5 px-4 font-semibold text-blue-700 capitalize">
                                                {rule.activity_classification}
                                            </td>

                                            {/* Priority */}
                                            <td className="py-3.5 px-4 text-center font-extrabold text-slate-800 font-mono">
                                                {rule.priority}
                                            </td>

                                            {/* Status */}
                                            <td className="py-3.5 px-4 text-center">
                                                <button
                                                    onClick={() => toggleRuleStatus(rule)}
                                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer ${
                                                        rule.status === "ACTIVE"
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                                            : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                                                    }`}
                                                >
                                                    {rule.status}
                                                </button>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3.5 px-4 text-right space-x-2">
                                                <button
                                                    onClick={() => openEditModal(rule)}
                                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-all cursor-pointer"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(rule.id)}
                                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-[11px] transition-all cursor-pointer"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="py-12 text-center text-slate-400 text-xs">
                                            No keyword rules configured.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>

            {/* CREATE / EDIT KEYWORD RULE MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-base font-extrabold text-slate-900">
                                {editingRule ? "Edit Keyword Rule" : "Create Keyword Rule"}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <i className="fa-solid fa-xmark text-base"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold">
                            <div>
                                <label className="block text-slate-700 mb-1">Keyword Match String</label>
                                <input
                                    type="text"
                                    required
                                    placeholder='e.g. "Commitment increase of"'
                                    value={formData.keyword_match}
                                    onChange={(e) => setFormData({ ...formData, keyword_match: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-700 mb-1">Activity Classification</label>
                                <input
                                    type="text"
                                    required
                                    placeholder='e.g. "commitment increase"'
                                    value={formData.activity_classification}
                                    onChange={(e) => setFormData({ ...formData, activity_classification: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-700 mb-1">Priority (Higher = Evaluated First)</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max="100"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-700 mb-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                                    >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="INACTIVE">INACTIVE</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                    {submitting ? "Saving..." : editingRule ? "Update Rule" : "Create Rule"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
