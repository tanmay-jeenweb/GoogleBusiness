import React, { createContext, useContext, useState, useEffect } from "react";

export const PRESET_THEMES = [
    {
        id: "classic",
        name: "Google Classic",
        navbarBg: "#ffffff",
        tableHeaderBg: "#f8fafc",
        tableHeaderText: "#475569",
        primaryColor: "#0256d0",
        accentColor: "#10b981"
    },
    {
        id: "midnight",
        name: "Midnight Dark",
        navbarBg: "#0f172a",
        tableHeaderBg: "#1e293b",
        tableHeaderText: "#cbd5e1",
        primaryColor: "#38bdf8",
        accentColor: "#34d399"
    },
    {
        id: "emerald",
        name: "Emerald Corporate",
        navbarBg: "#f0fdf4",
        tableHeaderBg: "#dcfce7",
        tableHeaderText: "#14532d",
        primaryColor: "#059669",
        accentColor: "#d97706"
    },
    {
        id: "purple",
        name: "Royal Purple",
        navbarBg: "#ffffff",
        tableHeaderBg: "#faf5ff",
        tableHeaderText: "#581c87",
        primaryColor: "#7c3aed",
        accentColor: "#f59e0b"
    },
    {
        id: "amber",
        name: "Sunset Amber",
        navbarBg: "#fffbeb",
        tableHeaderBg: "#fef3c7",
        tableHeaderText: "#78350f",
        primaryColor: "#d97706",
        accentColor: "#0d9488"
    }
];

const DEFAULT_THEME = PRESET_THEMES[0];

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        try {
            const saved = localStorage.getItem("app_theme_settings");
            return saved ? JSON.parse(saved) : DEFAULT_THEME;
        } catch (e) {
            console.error("Error loading theme from localStorage:", e);
            return DEFAULT_THEME;
        }
    });

    const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

    useEffect(() => {
        try {
            localStorage.setItem("app_theme_settings", JSON.stringify(theme));
        } catch (e) {
            console.error("Error saving theme to localStorage:", e);
        }

        // Apply CSS Custom Variables to :root
        const root = document.documentElement;
        root.style.setProperty("--theme-navbar-bg", theme.navbarBg || DEFAULT_THEME.navbarBg);
        root.style.setProperty("--theme-table-header-bg", theme.tableHeaderBg || DEFAULT_THEME.tableHeaderBg);
        root.style.setProperty("--theme-table-header-text", theme.tableHeaderText || DEFAULT_THEME.tableHeaderText);
        root.style.setProperty("--theme-primary-color", theme.primaryColor || DEFAULT_THEME.primaryColor);
        root.style.setProperty("--theme-accent-color", theme.accentColor || DEFAULT_THEME.accentColor);
    }, [theme]);

    const updateColor = (key, value) => {
        setTheme(prev => ({
            ...prev,
            id: "custom",
            [key]: value
        }));
    };

    const applyPreset = (preset) => {
        setTheme(preset);
    };

    const resetToDefault = () => {
        setTheme(DEFAULT_THEME);
    };

    return (
        <ThemeContext.Provider
            value={{
                theme,
                updateColor,
                applyPreset,
                resetToDefault,
                isThemeModalOpen,
                setIsThemeModalOpen,
                PRESET_THEMES
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
