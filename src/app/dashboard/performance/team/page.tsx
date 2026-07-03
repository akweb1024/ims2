'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { BarChart3, Users, Target, CheckCircle2, Clock, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';

type PeriodType = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';

interface Analytics {
    period: string;
    periodType: string;
    scope: 'TEAM' | 'COMPANY';
    summary: { employees: number; totalGoals: number; achievedGoals: number; avgAchievement: number; pendingVerification: number; atRisk: number };
    byMember: { employeeId: string; name: string; goalCount: number; achievedCount: number; avgAchievement: number }[];
    byStatus: { status: string; count: number }[];
    byDimension: { dimension: string; count: number; avgAchievement: number }[];
    byDepartment: { departmentId: string; name: string; employees: number; goalCount: number; avgAchievement: number }[];
    trend: { label: string; avgAchievement: number; goalCount: number }[];
}

const PERIOD_TYPES: { value: PeriodType; label: string }[] = [
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'QUARTERLY', label: 'Quarterly' },
    { value: 'HALF_YEARLY', label: 'Half-yearly' },
    { value: 'YEARLY', label: 'Yearly' },
];

const STATUS_COLORS: Record<string, string> = {
    IN_PROGRESS: '#6366f1', PENDING: '#94a3b8', SUBMITTED: '#f59e0b',
    TL_VERIFIED: '#0ea5e9', MANAGER_VERIFIED: '#10b981', ACHIEVED: '#22c55e', REJECTED: '#ef4444',
};
const DIM_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#94a3b8'];
const fmtStatus = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const barColor = (v: number) => (v >= 100 ? '#22c55e' : v >= 60 ? '#6366f1' : v >= 40 ? '#f59e0b' : '#ef4444');

function shiftRef(type: PeriodType, ref: Date, back: number): Date {
    const d = new Date(ref);
    if (type === 'MONTHLY') d.setMonth(d.getMonth() - back);
    else if (type === 'QUARTERLY') d.setMonth(d.getMonth() - back * 3);
    else if (type === 'HALF_YEARLY') d.setMonth(d.getMonth() - back * 6);
    else d.setFullYear(d.getFullYear() - back);
    return d;
}

export default function TeamKraAnalyticsPage() {
    const [data, setData] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [periodType, setPeriodType] = useState<PeriodType>('MONTHLY');
    const [ref, setRef] = useState<Date>(new Date());
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
    const [departmentId, setDepartmentId] = useState<string>('');

    const authHeaders = useCallback(() => ({ Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}` }), []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ periodType, periodRef: ref.toISOString() });
            if (departmentId) params.set('departmentId', departmentId);
            const res = await fetch(`/api/kra/analytics?${params.toString()}`, { headers: authHeaders() });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to load analytics');
            setData(await res.json());
        } catch (e: any) {
            setError(e.message);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [authHeaders, periodType, ref, departmentId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Department filter list (best-effort; cross-company for heads).
    useEffect(() => {
        (async () => {
            try {
                let r = await fetch('/api/departments?companyId=ALL', { headers: authHeaders() });
                if (!r.ok) r = await fetch('/api/departments', { headers: authHeaders() });
                if (r.ok) {
                    const d = await r.json();
                    setDepartments(Array.isArray(d) ? d.map((x: any) => ({ id: x.id, name: x.name })) : []);
                }
            } catch { /* optional */ }
        })();
    }, [authHeaders]);

    const isCompanyScope = data?.scope === 'COMPANY';

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="w-7 h-7 text-indigo-600" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Team KRA Analytics</h1>
                            <p className="text-sm text-gray-500">{isCompanyScope ? 'Company-wide' : 'Your team'} goal achievement, statistics and trends.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select value={periodType} onChange={(e) => { setPeriodType(e.target.value as PeriodType); setRef(new Date()); }}
                            className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white">
                            {PERIOD_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                        {isCompanyScope && (
                            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}
                                className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white max-w-[180px]">
                                <option value="">All departments</option>
                                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        )}
                        <div className="flex items-center gap-1">
                            <button onClick={() => setRef((r) => shiftRef(periodType, r, 1))} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"><ChevronLeft className="w-4 h-4" /></button>
                            <span className="text-sm font-semibold text-gray-900 min-w-[120px] text-center">{data?.period || '…'}</span>
                            <button onClick={() => setRef((r) => shiftRef(periodType, r, -1))} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

                {loading ? (
                    <div className="text-gray-400 text-sm">Loading…</div>
                ) : !data ? (
                    <div className="text-gray-400 text-sm">No data.</div>
                ) : (
                    <>
                        {/* Summary cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <SummaryCard icon={<Users className="w-4 h-4" />} label="Employees" value={data.summary.employees} color="text-gray-700" />
                            <SummaryCard icon={<Target className="w-4 h-4" />} label="Total goals" value={data.summary.totalGoals} color="text-indigo-600" />
                            <SummaryCard icon={<CheckCircle2 className="w-4 h-4" />} label="Achieved" value={data.summary.achievedGoals} color="text-emerald-600" />
                            <SummaryCard icon={<BarChart3 className="w-4 h-4" />} label="Avg achievement" value={`${data.summary.avgAchievement}%`} color="text-indigo-600" />
                            <SummaryCard icon={<Clock className="w-4 h-4" />} label="Pending verify" value={data.summary.pendingVerification} color="text-amber-600" />
                            <SummaryCard icon={<AlertTriangle className="w-4 h-4" />} label="At risk" value={data.summary.atRisk} color="text-rose-600" />
                        </div>

                        {data.summary.totalGoals === 0 ? (
                            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
                                No KRA goals found for this period. Change the period or assign goals first.
                            </div>
                        ) : (
                            <>
                                {/* Member-wise achievement */}
                                <ChartCard title="Member-wise achievement (%)">
                                    <ResponsiveContainer width="100%" height={Math.max(220, data.byMember.length * 38)}>
                                        <BarChart data={data.byMember} layout="vertical" margin={{ left: 20, right: 30 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                                            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                                            <Tooltip formatter={(v: any, _n, p: any) => [`${v}%  (${p.payload.achievedCount}/${p.payload.goalCount} achieved)`, 'Achievement']} />
                                            <Bar dataKey="avgAchievement" radius={[0, 4, 4, 0]}>
                                                {data.byMember.map((m) => <Cell key={m.employeeId} fill={barColor(m.avgAchievement)} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartCard>

                                {/* Status + Dimension donuts */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <ChartCard title="Goals by status">
                                        <ResponsiveContainer width="100%" height={260}>
                                            <PieChart>
                                                <Pie data={data.byStatus} dataKey="count" nameKey="status" innerRadius={55} outerRadius={90} paddingAngle={2}>
                                                    {data.byStatus.map((s) => <Cell key={s.status} fill={STATUS_COLORS[s.status] || '#94a3b8'} />)}
                                                </Pie>
                                                <Tooltip formatter={(v: any, n: any) => [v, fmtStatus(String(n))]} />
                                                <Legend formatter={(v) => fmtStatus(String(v))} wrapperStyle={{ fontSize: 12 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </ChartCard>
                                    <ChartCard title="Goals by dimension">
                                        <ResponsiveContainer width="100%" height={260}>
                                            <PieChart>
                                                <Pie data={data.byDimension} dataKey="count" nameKey="dimension" innerRadius={55} outerRadius={90} paddingAngle={2}>
                                                    {data.byDimension.map((d, i) => <Cell key={d.dimension} fill={DIM_COLORS[i % DIM_COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip formatter={(v: any, n: any, p: any) => [`${v} goals · ${p.payload.avgAchievement}% avg`, fmtStatus(String(n))]} />
                                                <Legend formatter={(v) => fmtStatus(String(v))} wrapperStyle={{ fontSize: 12 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </ChartCard>
                                </div>

                                {/* Trend */}
                                <ChartCard title={`Average achievement trend (last 6 ${PERIOD_TYPES.find((p) => p.value === periodType)?.label.toLowerCase()})`}>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <LineChart data={data.trend} margin={{ left: 0, right: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                                            <Tooltip formatter={(v: any, _n, p: any) => [`${v}%  (${p.payload.goalCount} goals)`, 'Avg achievement']} />
                                            <Line type="monotone" dataKey="avgAchievement" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </ChartCard>

                                {/* Department rollup */}
                                {data.byDepartment.length > 1 && (
                                    <ChartCard title="Department rollup (avg achievement %)">
                                        <ResponsiveContainer width="100%" height={Math.max(220, data.byDepartment.length * 42)}>
                                            <BarChart data={data.byDepartment} layout="vertical" margin={{ left: 20, right: 30 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                                                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                                                <Tooltip formatter={(v: any, _n, p: any) => [`${v}%  (${p.payload.goalCount} goals · ${p.payload.employees} ppl)`, 'Achievement']} />
                                                <Bar dataKey="avgAchievement" radius={[0, 4, 4, 0]}>
                                                    {data.byDepartment.map((d) => <Cell key={d.departmentId} fill={barColor(d.avgAchievement)} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartCard>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>{icon}{label}</div>
            <div className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
        </div>
    );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">{title}</h2>
            {children}
        </section>
    );
}
