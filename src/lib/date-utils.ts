import { format } from 'date-fns';

/**
 * IST offset in milliseconds (5.5 hours * 60 min * 60 sec * 1000 ms)
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns a new Date object that represents the same point in time 
 * but shifted for IST display in environments that don't support timezones well.
 */
function getISTAdjustedDate(date: Date | string | null | undefined): Date | null {
    if (!date) return null;
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return null;

    // d.getTime() is ALWAYS UTC.
    return new Date(d.getTime() + IST_OFFSET_MS);
}

/**
 * Formats a date to a time string in IST
 * @param date - The date to format
 * @param formatStr - Optional format string or options
 */
export function formatToISTTime(date: Date | string | null | undefined, formatStr: string = 'hh:mm a'): string {
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (!d || isNaN(d.getTime())) return '--:--';
        return new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(d);
    } catch (e) {
        return '--:--';
    }
}

/**
 * Formats a date to a date string in IST
 */
export function formatToISTDate(date: Date | string | null | undefined): string {
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
 * Formats a date and time to IST
 */
export function formatToISTDateTime(date: Date | string | null | undefined): string {
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (!d || isNaN(d.getTime())) return '-';
        return new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
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
    const utcMidnight = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return new Date(utcMidnight.getTime() - IST_OFFSET_MS);
}
