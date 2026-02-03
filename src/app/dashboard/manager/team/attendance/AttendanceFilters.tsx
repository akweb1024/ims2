'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function AttendanceFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentMonth = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const currentYear = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const [month, setMonth] = useState(currentMonth);
    const [year, setYear] = useState(currentYear);

    const handleApply = () => {
        const params = new URLSearchParams(searchParams);
        params.set('month', month.toString());
        params.set('year', year.toString());
        router.push(`?${params.toString()}`);
    };

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end mb-6">
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Month</label>
                <select
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value))}
                    className="select-input w-40 rounded-lg border-gray-300 text-sm focus:ring-primary-500 focus:border-primary-500"
                >
                    {months.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                <select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="select-input w-32 rounded-lg border-gray-300 text-sm focus:ring-primary-500 focus:border-primary-500"
                >
                    {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            <button
                onClick={handleApply}
                className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
                Apply Filters
            </button>
        </div>
    );
}
