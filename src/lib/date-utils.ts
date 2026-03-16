export type Period = 'DAILY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

const getISTParts = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date);

    const map: Record<string, string> = {};
    for (const p of parts) {
        if (p.type !== 'literal') map[p.type] = p.value;
    }

    const year = parseInt(map.year, 10);
    const month = parseInt(map.month, 10);
    const day = parseInt(map.day, 10);

    return { year, month, day };
};

const makeISTDate = (year: number, month: number, day: number, time = '00:00:00') => {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return new Date(`${year}-${mm}-${dd}T${time}+05:30`);
};

export const getISTDateRangeForPeriod = (period: Period, baseDate = new Date()) => {
    const { year, month, day } = getISTParts(baseDate);

    if (period === 'DAILY') {
        const start = makeISTDate(year, month, day, '00:00:00');
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
        return { start, end };
    }

    if (period === 'MONTHLY') {
        const start = makeISTDate(year, month, 1, '00:00:00');
        const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
        const end = new Date(makeISTDate(nextMonth.year, nextMonth.month, 1, '00:00:00').getTime() - 1);
        return { start, end };
    }

    if (period === 'QUARTERLY') {
        const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
        const start = makeISTDate(year, quarterStartMonth, 1, '00:00:00');
        const nextQuarterMonth = quarterStartMonth + 3;
        const nextQuarter = nextQuarterMonth > 12
            ? { year: year + 1, month: nextQuarterMonth - 12 }
            : { year, month: nextQuarterMonth };
        const end = new Date(makeISTDate(nextQuarter.year, nextQuarter.month, 1, '00:00:00').getTime() - 1);
        return { start, end };
    }

    // YEARLY
    const start = makeISTDate(year, 1, 1, '00:00:00');
    const end = new Date(makeISTDate(year + 1, 1, 1, '00:00:00').getTime() - 1);
    return { start, end };
};

export const normalizePeriod = (value?: string | null): Period => {
    const v = (value || '').toUpperCase();
    if (v === 'MONTHLY' || v === 'QUARTERLY' || v === 'YEARLY') return v as Period;
    return 'DAILY';
};

export const formatToISTTime = (date?: Date | string | null, format?: string) => {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return '—';

    if (format === 'MMM') {
        return new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            month: 'short'
        }).format(d);
    }

    if (format === 'd') {
        return new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: 'numeric'
        }).format(d);
    }

    const hour12 = format === 'hh:mm a';
    const hour12Opt = format === 'HH:mm' ? false : hour12 ? true : true;

    return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: hour12Opt
    }).format(d);
};

export const formatToISTDate = (date?: Date | string | null) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(d);
};

export const getISTToday = () => {
    const now = new Date();
    const { year, month, day } = getISTParts(now);
    return makeISTDate(year, month, day, '00:00:00');
};
