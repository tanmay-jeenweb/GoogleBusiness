import React from "react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeMasterModal() {
    const {
        theme,
        updateColor,
        applyPreset,
        resetToDefault,
        isThemeModalOpen,
        setIsThemeModalOpen,
        PRESET_THEMES
    } = useTheme();

    if (!isThemeModalOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-xs">
                            <i className="fa-solid fa-palette text-lg"></i>
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                                Theme Master & Color Customizer
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">
                                Customize global theme colors across navigation, tables & buttons
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsThemeModalOpen(false)}
                        className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer"
                    >
                        <i className="fa-solid fa-xmark text-base"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    
                    {/* SECTION 1: PRESET THEMES */}
                    <div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-3">
                            Quick Theme Presets
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {PRESET_THEMES.map((preset) => {
                                const isSelected = theme.id === preset.id;
                                return (
                                    <button
                                        key={preset.id}
                                        onClick={() => applyPreset(preset)}
                                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                                            isSelected
                                                ? "border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/30 shadow-xs"
                                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                        }`}
                                    >
                                        <span className="text-[11px] font-extrabold text-slate-800 truncate block">
                                            {preset.name}
                                        </span>

                                        {/* Color Swatch Pill */}
                                        <div className="flex items-center gap-1">
                                            <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: preset.navbarBg }}></span>
                                            <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: preset.tableHeaderBg }}></span>
                                            <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: preset.primaryColor }}></span>
                                            <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: preset.accentColor }}></span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION 2: 5 CUSTOMIZABLE COLOR TOKENS */}
                    <div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-3">
                            Custom Color Controls (5 Tokens)
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            
                            {/* Token 1: Navbar Background */}
                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-slate-800 block">Navbar Background</span>
                                    <span className="text-[10px] text-slate-400 font-medium">Header bar background</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={theme.navbarBg || "#ffffff"}
                                        onChange={(e) => updateColor("navbarBg", e.target.value)}
                                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
                                    />
                                    <span className="text-xs font-mono font-bold text-slate-600 uppercase w-16">
                                        {theme.navbarBg}
                                    </span>
                                </div>
                            </div>

                            {/* Token 2: Table Header Background */}
                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-slate-800 block">Table Header Background</span>
                                    <span className="text-[10px] text-slate-400 font-medium">DataTable header background</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={theme.tableHeaderBg || "#f8fafc"}
                                        onChange={(e) => updateColor("tableHeaderBg", e.target.value)}
                                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
                                    />
                                    <span className="text-xs font-mono font-bold text-slate-600 uppercase w-16">
                                        {theme.tableHeaderBg}
                                    </span>
                                </div>
                            </div>

                            {/* Token 3: Table Header Text */}
                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-slate-800 block">Table Header Text</span>
                                    <span className="text-[10px] text-slate-400 font-medium">DataTable header text color</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={theme.tableHeaderText || "#475569"}
                                        onChange={(e) => updateColor("tableHeaderText", e.target.value)}
                                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
                                    />
                                    <span className="text-xs font-mono font-bold text-slate-600 uppercase w-16">
                                        {theme.tableHeaderText}
                                    </span>
                                </div>
                            </div>

                            {/* Token 4: Primary Color */}
                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-slate-800 block">Primary Accent Color</span>
                                    <span className="text-[10px] text-slate-400 font-medium">Buttons, domain text, links</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={theme.primaryColor || "#0256d0"}
                                        onChange={(e) => updateColor("primaryColor", e.target.value)}
                                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
                                    />
                                    <span className="text-xs font-mono font-bold text-slate-600 uppercase w-16">
                                        {theme.primaryColor}
                                    </span>
                                </div>
                            </div>

                            {/* Token 5: Accent Color */}
                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-between col-span-1 sm:col-span-2">
                                <div>
                                    <span className="text-xs font-bold text-slate-800 block">Secondary Highlight Color</span>
                                    <span className="text-[10px] text-slate-400 font-medium">Total badges & status highlights</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={theme.accentColor || "#10b981"}
                                        onChange={(e) => updateColor("accentColor", e.target.value)}
                                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
                                    />
                                    <span className="text-xs font-mono font-bold text-slate-600 uppercase w-16">
                                        {theme.accentColor}
                                    </span>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* SECTION 3: LIVE PREVIEW CARD */}
                    <div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">
                            Live Interface Preview
                        </span>
                        <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                            {/* Preview Navbar */}
                            <div
                                className="px-4 py-3 border-b flex items-center justify-between transition-all"
                                style={{ backgroundColor: theme.navbarBg }}
                            >
                                <span className="text-xs font-black tracking-tight" style={{ color: theme.primaryColor }}>
                                    Google Business Analytics
                                </span>
                                <div className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold text-white" style={{ backgroundColor: theme.primaryColor }}>
                                    Active Button
                                </div>
                            </div>

                            {/* Preview Table Header */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr style={{ backgroundColor: theme.tableHeaderBg, color: theme.tableHeaderText }}>
                                            <th className="py-2.5 px-4 font-bold">Domain Name</th>
                                            <th className="py-2.5 px-4 font-bold">Customer ID</th>
                                            <th className="py-2.5 px-4 font-bold text-right">Amount (INR)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        <tr>
                                            <td className="py-2.5 px-4 font-extrabold" style={{ color: theme.primaryColor }}>example.com</td>
                                            <td className="py-2.5 px-4 font-mono text-slate-500">C01234567</td>
                                            <td className="py-2.5 px-4 font-mono font-extrabold text-right" style={{ color: theme.accentColor }}>₹10,500.00</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <button
                        onClick={resetToDefault}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                        <i className="fa-solid fa-rotate-left"></i> Reset to Default
                    </button>

                    <button
                        onClick={() => setIsThemeModalOpen(false)}
                        className="px-5 py-2 text-xs font-extrabold text-white rounded-xl shadow-xs transition-all cursor-pointer"
                        style={{ backgroundColor: theme.primaryColor }}
                    >
                        Apply & Close
                    </button>
                </div>

            </div>
        </div>
    );
}
