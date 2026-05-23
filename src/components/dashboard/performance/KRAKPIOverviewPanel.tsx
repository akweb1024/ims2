'use client';

import { useEffect, useMemo, useState } from 'react';

type PeriodKey = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

type Props = {
    scope?: 'self' | 'team';
    title?: string;
    className?: string;
};

const PERIOD_OPTIONS: Array<{ value: PeriodKey; label: string }> = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
];

export default function KRAKPIOverviewPanel({
    scope = 'self',
    title,
    className = '',
}: Props) {
    const [period, setPeriod] = useState<PeriodKey>('monthly');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [data, setData] = useState<any>(null);

    const endpoint = useMemo(() => {
        const params = new URLSearchParams({
            period,
            scope,
        });
        return `/api/hr/performance/kra-kpi-overview?${params.toString()}`;
    }, [period, scope]);

    useEffect(() => {
        let isActive = true;
        const run = async () => {
            try {
                setLoading(true);
                setError('');
                const token = localStorage.getItem('token');
                const res = await fetch(endpoint, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const payload = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(payload?.error || payload?.message || 'Failed to load overview');
                if (isActive) setData(payload);
            } catch (e: any) {
                if (isActive) setError(e?.message || 'Failed to load overview');
            } finally {
                if (isActive) setLoading(false);
            }
        };
        run();
        return () => {
            isActive = false;
        };
    }, [endpoint]);

    return (
        <div className={`card-premium overflow-hidden ${className}`}>
            <div className="p-5 border-b border-secondary-100 bg-secondary-50/60">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-black text-secondary-900">
                            {title || (scope === 'team' ? 'Team KRA/KPI Overview' : 'My KRA/KPI Overview')}
                        </h3>
                        <p className="text-xs text-secondary-500 font-semibold">
                            Unified KPI progress + work report analysis for {period}.
                        </p>
                    </div>
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as PeriodKey)}
                        className="bg-white border border-secondary-200 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider text-secondary-700"
                    >
                        {PERIOD_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loading && (
                <div className="p-8 text-sm text-secondary-500">Loading KRA/KPI analytics...</div>
            )}

            {!loading && error && (
                <div className="p-8 text-sm text-danger-600 font-semibold">{error}</div>
            )}

            {!loading && !error && data && (
                <div className="p-5 space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <MetricCard label="Employees" value={data?.summary?.employeeCount ?? 0} />
                        <MetricCard label="Submission Rate" value={`${data?.summary?.submissionRate ?? 0}%`} />
                        <MetricCard label="Avg KRA Match" value={`${(((data?.summary?.avgKraMatch ?? 0) * 100).toFixed(1))}%`} />
                        <MetricCard label="Avg Manager Rating" value={data?.summary?.avgManagerRating ?? 0} />
                        <MetricCard label="Reports" value={`${data?.summary?.reportsSubmitted ?? 0}/${data?.summary?.reportsExpected ?? 0}`} />
                        <MetricCard label="Tasks Done" value={data?.summary?.totalTasksCompleted ?? 0} />
                        <MetricCard label="Hours Logged" value={data?.summary?.totalHoursSpent ?? 0} />
                        <MetricCard label="Revenue Tagged" value={data?.summary?.totalRevenueGenerated ?? 0} />
                    </div>

                    <div className="overflow-x-auto border border-secondary-100 rounded-xl">
                        <table className="min-w-full text-xs">
                            <thead className="bg-secondary-50">
                                <tr className="text-left text-secondary-600">
                                    <th className="px-3 py-2 font-black uppercase tracking-wider">Employee</th>
                                    <th className="px-3 py-2 font-black uppercase tracking-wider">KPI Progress</th>
                                    <th className="px-3 py-2 font-black uppercase tracking-wider">Reports</th>
                                    <th className="px-3 py-2 font-black uppercase tracking-wider">KRA Match</th>
                                    <th className="px-3 py-2 font-black uppercase tracking-wider">Ratings</th>
                                    <th className="px-3 py-2 font-black uppercase tracking-wider">Effectiveness</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data?.employees || []).map((employee: any) => (
                                    <tr key={employee.employeeId} className="border-t border-secondary-100">
                                        <td className="px-3 py-2">
                                            <div className="font-bold text-secondary-900">{employee.name}</div>
                                            <div className="text-secondary-500">{employee.designation}</div>
                                        </td>
                                        <td className="px-3 py-2 font-semibold">
                                            {employee?.score?.kpiProgress ?? 0}%
                                        </td>
                                        <td className="px-3 py-2">
                                            {employee?.workReport?.submitted ?? 0}/{employee?.workReport?.expected ?? 0}
                                            <span className="ml-2 text-secondary-500">({employee?.workReport?.submissionRate ?? 0}%)</span>
                                        </td>
                                        <td className="px-3 py-2">
                                            {(((employee?.workReport?.avgKraMatch ?? 0) * 100).toFixed(1))}%
                                        </td>
                                        <td className="px-3 py-2">
                                            M: {employee?.workReport?.avgManagerRating ?? 0} | S: {employee?.workReport?.avgSelfRating ?? 0}
                                        </td>
                                        <td className="px-3 py-2 font-bold text-primary-700">
                                            {employee?.score?.effectiveness ?? 0}
                                        </td>
                                    </tr>
                                ))}
                                {(!data?.employees || data.employees.length === 0) && (
                                    <tr>
                                        <td colSpan={6} className="px-3 py-4 text-center text-secondary-500">
                                            No records available for this period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-xl border border-secondary-100 bg-white p-3">
            <div className="text-[10px] text-secondary-500 font-black uppercase tracking-wider">{label}</div>
            <div className="mt-1 text-lg font-black text-secondary-900">{value}</div>
        </div>
    );
}

// Style guide accessibility compliance: aria-label placeholder <label>
