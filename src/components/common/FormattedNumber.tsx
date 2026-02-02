import React from 'react';

interface FormattedNumberProps {
    value: number | string | null | undefined;
    decimals?: number;
    currency?: string;
    compact?: boolean;
}

export const FormattedNumber: React.FC<FormattedNumberProps> = ({
    value,
    decimals = 0,
    currency,
    compact = false
}) => {
    if (value === null || value === undefined || value === '') {
        return <span>-</span>;
    }

    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(num)) {
        return <span>-</span>;
    }

    const options: Intl.NumberFormatOptions = {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    };

    if (compact) {
        options.notation = 'compact';
        options.compactDisplay = 'short';
    }

    if (currency) {
        options.style = 'currency';
        options.currency = currency;
    }

    return <span>{new Intl.NumberFormat('en-IN', options).format(num)}</span>;
};
