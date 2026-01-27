'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function EmailLogFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Initial state from URL
    const [search, setSearch] = useState(searchParams.get('q') || '');
    const [status, setStatus] = useState(searchParams.get('status') || 'ALL');
    const [dateFrom, setDateFrom] = useState(searchParams.get('from') || '');
    const [dateTo, setDateTo] = useState(searchParams.get('to') || '');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            applyFilters();
        }, 500);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, status, dateFrom, dateTo]);

    const applyFilters = () => {
        const params = new URLSearchParams(Array.from(searchParams.entries()));

        if (search) params.set('q', search);
        else params.delete('q');

        if (status && status !== 'ALL') params.set('status', status);
        else params.delete('status');

        if (dateFrom) params.set('from', dateFrom);
        else params.delete('from');

        if (dateTo) params.set('to', dateTo);
        else params.delete('to');

        // Reset page on filter change
        params.set('page', '1');

        router.push(`${pathname}?${params.toString()}`);
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('ALL');
        setDateFrom('');
        setDateTo('');
        router.push(pathname);
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-secondary-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">Search</label>
                    <input
                        type="text"
                        placeholder="Subject or Recipient..."
                        className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Status */}
                <div>
                    <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">Status</label>
                    <select
                        className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="SENT">Sent</option>
                        <option value="FAILED">Failed</option>
                    </select>
                </div>

                {/* Date Range */}
                <div className="flex space-x-2">
                    <div className="w-1/2">
                        <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">From</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>
                    <div className="w-1/2">
                        <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">To</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-end">
                    <button
                        onClick={clearFilters}
                        className="w-full px-4 py-2 bg-secondary-100 text-secondary-600 font-bold rounded-lg text-sm hover:bg-secondary-200 transition-colors"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>
        </div>
    );
}
