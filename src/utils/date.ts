// src/utils/date.ts

/**
 * Formats an ISO or UTC date string into GMT+7 (Asia/Ho_Chi_Minh) timezone with full date, month, year and time.
 */
export function formatGMT7(
    dateStr?: string | null,
    options?: {
        includeSeconds?: boolean;
        includeTimezoneLabel?: boolean;
    }
): string {
    if (!dateStr) return 'Just now';

    try {
        // If the dateStr is missing timezone indicator and looks like a bare ISO without Z (e.g. 2026-08-31 07:46:33),
        // handle it safely.
        let isoString = dateStr;
        if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
            isoString = dateStr.replace(' ', 'T') + 'Z';
        }

        const date = new Date(isoString);
        if (isNaN(date.getTime())) {
            const fallback = new Date(dateStr);
            if (isNaN(fallback.getTime())) return dateStr;
            return formatCustomGMT7(fallback, options);
        }

        return formatCustomGMT7(date, options);
    } catch {
        return dateStr || 'N/A';
    }
}

function formatCustomGMT7(
    date: Date,
    options?: {
        includeSeconds?: boolean;
        includeTimezoneLabel?: boolean;
    }
): string {
    const includeSeconds = options?.includeSeconds ?? true;
    const includeTz = options?.includeTimezoneLabel ?? false;

    const dtf = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: includeSeconds ? '2-digit' : undefined,
        hour12: false,
    });

    const formatted = dtf.format(date); // e.g. "31/08/2026, 14:46:33"
    return includeTz ? `${formatted} (GMT+7)` : formatted;
}

/**
 * Returns structured GMT+7 date and time for dual-line table displays.
 */
export function getGMT7Parts(dateStr?: string | null): { date: string; time: string } {
    if (!dateStr) return { date: '-', time: 'Just now' };

    try {
        let isoString = dateStr;
        if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
            isoString = dateStr.replace(' ', 'T') + 'Z';
        }
        const d = new Date(isoString);
        const validDate = isNaN(d.getTime()) ? new Date(dateStr) : d;
        if (isNaN(validDate.getTime())) return { date: dateStr, time: '' };

        const datePart = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(validDate);

        const timePart = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        }).format(validDate);

        return { date: datePart, time: timePart };
    } catch {
        return { date: dateStr, time: '' };
    }
}
