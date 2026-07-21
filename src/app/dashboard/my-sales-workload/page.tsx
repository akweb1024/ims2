'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    RefreshCw, Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus,
    Banknote, Users, Briefcase, Phone,
} from 'lucide-react';

type KpiState = 'ON_TRACK' | 'AT_RISK' | 'BEHIND';
type DueState = 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' | 'NONE';
type RenewalState = 'ON_TRACK' | 'AT_RISK' | 'OVERDUE';

interface Kpi {
    key: string; label: string; current: number; target: number; unit: string;
    period: string; achievementPercentage: number;
    direction: 'HIGHER_BETTER' | 'LOWER_BETTER'; state: KpiState;
}
interface DealStage { stage: string; label: string; count: number; value: number; open: boolean; }
interface LeadStage { status: string; label: string; count: number; }
interface FollowUp {
    id: string; customerId: string | null; customerName: string; type: string; channel: string;
    subject: string; leadStatus: string | null; dueDate: string | null; dueState: DueState; daysToDue: number | null;
}
interface Renewal {
    subscriptionId: string; customerName: string; total: number; currency: string;
    endDate: string; daysToRenew: number; autoRenew: boolean; renewalState: RenewalState;
}
interface Workload {
    employee: {
        id: string; name: string; role: string; roleTemplate: string;
        coverage: { openDeals: number; pipelineValue: number; assignedCustomers: number };
        reportsTo: { id: string; name: string } | null;
        generatedAt: string; window: string;
    };
    summary: { openFollowUps: number; overdue: number; dueToday: number };
    kpis: Kpi[];
    revenue: { period: string; amount: number; count: number; currency: string };
    pipeline: { deals: DealStage[]; totals: { openCount: number; openValue: number; wonValue: number }; leads: LeadStage[] };
    queue: FollowUp[];
    renewals: Renewal[];
}

const KPI_STATE: Record<KpiState, { pill: string; bar: string; label: string }> = {
    ON_TRACK: { pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', bar: 'bg-emerald-500', label: 'On track' },
    AT_RISK: { pill: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300', bar: 'bg-amber-500', label: 'At risk' },
    BEHIND: { pill: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300', bar: 'bg-rose-500', label: 'Behind' },
};
const DUE_STRIPE: Record<DueState, string> = {
    OVERDUE: 'bg-rose-500', DUE_TODAY: 'bg-amber-500',
    UPCOMING: 'bg-indigo-300 dark:bg-indigo-700', NONE: 'bg-slate-200 dark:bg-slate-700',
};
const DUE_TEXT: Record<DueState, string> = {
    OVERDUE: 'text-rose-600 dark:text-rose-400', DUE_TODAY: 'text-amber-600 dark:text-amber-400',
    UPCOMING: 'text-slate-400', NONE: 'text-slate-400',
};
const RENEWAL_PILL: Record<RenewalState, string> = {
    ON_TRACK: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    AT_RISK: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    OVERDUE: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};

const fmtINR = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${Math.round(n).toLocaleString('en-IN')}`;
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';
const kpiValue = (k: Kpi) => {
    const suffix = k.unit.includes('PERCENT') ? '%' : k.unit === 'RATIO' ? 'x' : '';
    if (k.unit === 'INR' || k.unit === 'INR_MAX') return `${fmtINR(k.current)} / ${fmtINR(k.target)}`;
    return `${k.current}${suffix} / ${k.target}${suffix}`;
};
const dueBadge = (it: FollowUp) => {
    if (it.dueState === 'OVERDUE') return `Overdue ${Math.abs(it.daysToDue ?? 0)}d`;
    if (it.dueState === 'DUE_TODAY') return 'Today';
    if (it.dueState === 'UPCOMING') return `In ${it.daysToDue}d`;
    return 'No date';
};

export default function SalesWorkloadPage() {
    const [data, setData] = useState<Workload | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        try {
            const res = await fetch('/api/staff/sales-workload');
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `Request failed (${res.status})`);
            }
            setData(await res.json());
            setError('');
        } catch (err: any) {
            setError(err.message || 'Failed to load workload');
        } finally {
            setLoading(false); setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="animate-spin h-9 w-9 text-indigo-500 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm font-medium">Loading your sales & marketing workload…</p>
                </div>
            </div>
        );
    }
    if (error) {
        return (
            <div className="p-10 text-center">
                <div className="max-w-md mx-auto bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 rounded-2xl p-6">
                    <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto mb-3" />
                    <p className="font-bold text-rose-700 dark:text-rose-300 mb-1">Couldn’t load your workload</p>
                    <p className="text-sm text-rose-600/80 dark:text-rose-300/70 mb-4">{error}</p>
                    <button onClick={() => fetchData()} className="px-5 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700">Try again</button>
                </div>
            </div>
        );
    }
    if (!data) return null;

    const { employee, summary, kpis, revenue, pipeline, queue, renewals } = data;
    const maxDeal = Math.max(1, ...pipeline.deals.map((d) => d.count));
    const maxLead = Math.max(1, ...pipeline.leads.map((l) => l.count));

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-8 text-slate-900 dark:text-slate-100">
            <div className="max-w-6xl mx-auto space-y-4">

                {/* Header */}
                <header className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <div className="h-12 w-12 shrink-0 rounded-xl grid place-items-center text-white font-bold text-lg bg-gradient-to-br from-indigo-500 to-sky-500">
                        {employee.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight">{employee.name}</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{employee.roleTemplate}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                            <span className="inline-flex items-center gap-1"><Briefcase size={12} /> <b className="text-slate-500 dark:text-slate-300">{employee.coverage.openDeals}</b> open deals</span>
                            <span className="inline-flex items-center gap-1"><Banknote size={12} /> <b className="text-slate-500 dark:text-slate-300">{fmtINR(employee.coverage.pipelineValue)}</b> pipeline</span>
                            <span className="inline-flex items-center gap-1"><Users size={12} /> <b className="text-slate-500 dark:text-slate-300">{employee.coverage.assignedCustomers}</b> customers</span>
                            {employee.reportsTo && <span>Reports to <b className="text-slate-500 dark:text-slate-300">{employee.reportsTo.name}</b></span>}
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                        {summary.overdue > 0 ? (
                            <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
                                <span className="h-2 w-2 rounded-full bg-current" />{summary.overdue} follow-ups overdue
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                                <span className="h-2 w-2 rounded-full bg-current" />On track
                            </span>
                        )}
                        <button onClick={() => fetchData(true)} disabled={refreshing}
                            className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50" title="Refresh">
                            <RefreshCw size={18} className={`text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </header>

                {/* Revenue + KPI strip */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-indigo-600 to-sky-600 text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-white/80"><Banknote size={13} /> Revenue this month</div>
                        <div className="text-2xl font-bold tracking-tight mt-2">{fmtINR(revenue.amount)}</div>
                        <div className="text-[11px] text-white/70 mt-1">{revenue.count} claimed transaction{revenue.count === 1 ? '' : 's'}</div>
                    </div>
                    {kpis.slice(0, 3).map((k) => {
                        const s = KPI_STATE[k.state];
                        const pct = Math.max(0, Math.min(100, k.direction === 'LOWER_BETTER'
                            ? (k.target > 0 ? (k.current / k.target) * 100 : 0) : k.achievementPercentage));
                        const Icon = k.direction === 'LOWER_BETTER' ? TrendingDown : k.state === 'BEHIND' ? Minus : TrendingUp;
                        return (
                            <div key={k.key} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-2.5">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 leading-tight">{k.label}</p>
                                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${s.pill}`}><Icon size={11} />{s.label}</span>
                                </div>
                                <div className="text-lg font-bold tracking-tight tabular-nums">{kpiValue(k)}</div>
                                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <span className={`block h-full rounded-full ${s.bar}`} style={{ width: `${pct}%` }} />
                                </div>
                                <p className="text-[11px] text-slate-400">{k.period.toLowerCase()}</p>
                            </div>
                        );
                    })}
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                    {/* Follow-up queue */}
                    <section className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="font-bold text-[15px]">Follow-ups due</h2>
                            <span className="text-xs text-slate-400 font-medium">{summary.openFollowUps} open · {summary.overdue} overdue · {summary.dueToday} today</span>
                        </div>
                        {queue.length === 0 ? (
                            <p className="px-5 py-10 text-center text-sm text-slate-400">No pending follow-ups. Inbox zero.</p>
                        ) : queue.map((it) => (
                            <div key={it.id} className="flex items-center border-b border-slate-100 dark:border-slate-800 last:border-0">
                                <span className={`w-1 self-stretch ${DUE_STRIPE[it.dueState]}`} />
                                <div className="flex-1 min-w-0 py-3 pl-4 pr-3">
                                    <p className="text-sm font-semibold leading-snug truncate">{it.customerName}</p>
                                    <p className="text-[11px] text-slate-400 truncate">{it.subject}</p>
                                </div>
                                <div className="flex items-center gap-3 pr-4 shrink-0">
                                    <span className="text-[11px] font-bold px-2 py-1 rounded-md whitespace-nowrap bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 inline-flex items-center gap-1">
                                        <Phone size={11} />{it.type.toLowerCase()}
                                    </span>
                                    <div className="text-right w-16">
                                        <p className="text-xs font-semibold tabular-nums">{fmtDate(it.dueDate)}</p>
                                        <p className={`text-[10px] font-bold uppercase tracking-wide ${DUE_TEXT[it.dueState]}`}>{dueBadge(it)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </section>

                    {/* Right column */}
                    <div className="space-y-4">
                        {/* Deal pipeline */}
                        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                                <h2 className="font-bold text-[15px]">Deal pipeline</h2>
                                <span className="text-xs text-slate-400 font-medium">{fmtINR(pipeline.totals.openValue)} open</span>
                            </div>
                            <div className="px-5 py-3">
                                {pipeline.deals.map((d) => (
                                    <div key={d.stage} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                        <span className={`text-xs font-medium ${d.stage === 'CLOSED_WON' ? 'text-emerald-600' : d.stage === 'CLOSED_LOST' ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>{d.label}</span>
                                        <span className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                            <span className={`block h-full rounded-full ${d.stage === 'CLOSED_WON' ? 'bg-emerald-500' : d.stage === 'CLOSED_LOST' ? 'bg-slate-300 dark:bg-slate-600' : 'bg-indigo-500'}`} style={{ width: `${(d.count / maxDeal) * 100}%` }} />
                                        </span>
                                        <span className="text-xs font-bold text-right tabular-nums whitespace-nowrap">{d.count} · {fmtINR(d.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Lead funnel */}
                        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                                <h2 className="font-bold text-[15px]">Lead funnel</h2>
                            </div>
                            <div className="px-5 py-3">
                                {pipeline.leads.map((l) => (
                                    <div key={l.status} className="grid grid-cols-[6.5rem_1fr_1.75rem] items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                        <span className="text-xs text-slate-500 dark:text-slate-400">{l.label}</span>
                                        <span className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                            <span className="block h-full rounded-full bg-sky-500" style={{ width: `${(l.count / maxLead) * 100}%` }} />
                                        </span>
                                        <span className="text-sm font-bold text-right tabular-nums">{l.count}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Renewals */}
                        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                                <h2 className="font-bold text-[15px]">Renewals due</h2>
                                <span className="text-xs text-slate-400 font-medium">next 60 days</span>
                            </div>
                            {renewals.length === 0 ? (
                                <p className="px-5 py-8 text-center text-sm text-slate-400">No renewals coming up.</p>
                            ) : renewals.map((r) => (
                                <div key={r.subscriptionId} className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold truncate">{r.customerName}</p>
                                        <p className="text-[11px] text-slate-400">{fmtINR(r.total)} · {r.autoRenew ? 'auto-renew' : 'manual'}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-semibold tabular-nums">{fmtDate(r.endDate)}</p>
                                        <p className="text-[10px] text-slate-400">{r.daysToRenew < 0 ? `${Math.abs(r.daysToRenew)}d ago` : `in ${r.daysToRenew}d`}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full whitespace-nowrap ${RENEWAL_PILL[r.renewalState]}`}>
                                        {r.renewalState.replace('_', ' ').toLowerCase()}
                                    </span>
                                </div>
                            ))}
                        </section>
                    </div>
                </div>

                <p className="text-[11px] text-slate-400 pt-1">
                    Updated {new Date(employee.generatedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
}
