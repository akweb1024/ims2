'use client';

import { useState, useEffect } from 'react';
import { formatToISTDate } from '@/lib/date-utils';

interface FormattedDateProps {
    date: string | Date | null | undefined;
    fallback?: string;
}

export default function FormattedDate({ date, fallback = 'N/A' }: FormattedDateProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!date) return <span>{fallback}</span>;

    // During SSR, return a placeholder or a consistent format if possible
    // But since we want local date format, we wait for mount
    if (!mounted) {
        return <span className="opacity-0">...</span>;
    }

    try {
        return <span>{formatToISTDate(date)}</span>;
    } catch (e) {
        return <span>{fallback}</span>;
    }
}
