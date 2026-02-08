import React from 'react';

interface PerformanceProgressBarProps {
    target: number;
    current: number;
    label: string;
    unit?: string;
    color?: string;
}

export default function PerformanceProgressBar({
    target,
    current,
    label,
    unit = '',
    color = 'bg-primary-500'
}: PerformanceProgressBarProps) {
    const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-xs font-bold text-secondary-400 uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-black text-secondary-900">
                        {current.toLocaleString()} <span className="text-xs text-secondary-500 font-bold">/ {target.toLocaleString()} {unit}</span>
                    </p>
                </div>
                <div className="text-right">
                    <span className={`text-sm font-black ${percentage >= 100 ? 'text-success-600' : percentage >= 70 ? 'text-primary-600' : 'text-warning-600'}`}>
                        {percentage.toFixed(1)}%
                    </span>
                </div>
            </div>
            <div className="w-full bg-secondary-100 rounded-full h-2 overflow-hidden shadow-inner">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${percentage >= 100 ? 'bg-success-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : color}`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}
