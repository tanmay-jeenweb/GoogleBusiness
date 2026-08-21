// Unified Date Formatter for Frontend UI Components
export const formatStandardDate = (val) => {
    if (!val) return "N/A";
    const str = String(val).trim();
    if (!str || str === 'N/A' || str === 'null' || str === 'undefined') return "N/A";

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // 1. Date ranges like 'Aug 1 – 31, 2026' or 'August / 2026'
    if (str.includes('–') || str.includes('-')) {
        const rangeMatch = str.match(/([A-Za-z]+)\s+\d+.*(\d{4})/);
        if (rangeMatch) {
            return `${rangeMatch[1].slice(0, 3)} ${rangeMatch[2]}`;
        }
    }

    // 2. Slash formats like '8/10/26', '08/10/2026', '08/26', '8/26', 'August / 2026'
    if (str.includes('/')) {
        const parts = str.split('/').map(p => p.trim());
        if (parts.length === 3) {
            const m = parseInt(parts[0]);
            const d = parseInt(parts[1]);
            let y = parseInt(parts[2]);
            if (y < 100) y += 2000;
            if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000) {
                return `${d} ${months[m - 1]} ${y}`;
            }
        }
        if (parts.length === 2) {
            let m = parseInt(parts[0]);
            let y = parseInt(parts[1]);
            if (isNaN(m)) {
                const mIdx = months.findIndex(mon => parts[0].toLowerCase().startsWith(mon.toLowerCase()));
                if (mIdx !== -1) m = mIdx + 1;
            }
            if (y < 100) y += 2000;
            if (m >= 1 && m <= 12 && y >= 2000) {
                return `${months[m - 1]} ${y}`;
            }
        }
    }

    // 3. ISO or standard JS Date parseable strings (e.g. '2026-08-21 11:56:05')
    const dObj = new Date(str);
    if (!isNaN(dObj.getTime()) && dObj.getFullYear() >= 2000) {
        return `${dObj.getDate()} ${months[dObj.getMonth()]} ${dObj.getFullYear()}`;
    }

    return str;
};
