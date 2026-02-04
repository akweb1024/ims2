import { format } from 'date-fns';

/**
 * IST offset in milliseconds (5.5 hours * 60 min * 60 sec * 1000 ms)
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns a new Date object that represents the same point in time 
 * but shifted for IST display in environments that don't support timezones well.
 * It strictly takes a UTC date and adds 5.5 hours.
 */
function getISTAdjustedDate(date: Date | string | null | undefined): Date | null {
    if (!date) return null;
    const d = typeof date === 'string' ? new Date(date) : date;

    // d.getTime() is ALWAYS UTC.
    return new Date(d.getTime() + IST_OFFSET_MS);
}

/**
 * Formats a date to a time string in IST
 * @param date - The date to format
 * @param formatStr - The format string (default: 'HH:mm')
 */
export function formatToISTTime(date: Date | string | null | undefined, formatStr: string = 'hh:mm a'): string {
    const istDate = getISTAdjustedDate(date);
    if (!istDate) return '-';
    // Use format with 'UTC' mode if possible, but date-fns format uses local time.
    // However, since we manually added 5.5 hours, we should treat it carefully.
    // Actually, to avoid local interference, we can use toISOString or similar but format is better.
    // Let's use the shifted date and hope format() works or manually handle it.

    // Improved: Use Intl for absolute consistency
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (!d || isNaN(d.getTime())) return '-';
        return new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(d);
    } catch (e) {
        return '-';
    }
}

/**
 * Formats a date to a date string in IST
 */
export function formatToISTDate(date: Date | string | null | undefined, formatStr: string = 'MMM d, yyyy'): string {
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (!d || isNaN(d.getTime())) return '-';
        return new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(d);
    } catch (e) {
        return '-';
    }
}

/**
 * Returns the start of today in IST as a UTC date object that represents 00:00:00 IST
 */
export function getISTToday(): Date {
    const now = new Date();

    // Get year, month, day in IST
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(now);

    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;

    // Create a date for 00:00 IST of that day
    // 00:00 IST is 18:30 UTC of the previous day
    // But easiest is to create UTC for 00:00 and subtract 5.5 hours
    const utcMidnight = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return new Date(utcMidnight.getTime() - IST_OFFSET_MS);
}
