'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    RefreshCw, Loader2, BookOpen, AlertTriangle, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';

// ---- Types (mirror GET /api/staff/publication-workload) ----
type StageGroup = 'INTAKE' | 'REVIEW' | 'QUALITY' | 'PRODUCTION' | 'PUBLISHED';
type DueState = 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' | 'NONE';
type KpiState = 'ON_TRACK' | 'AT_RISK' | 'BEHIND';
type ReleaseState = 'ON_TIME' | 'AT_RISK' | 'OVERDUE';

interface Kpi {
    key: string; label: string; current: number; target: number; unit: string;
    period: string; achievementPercentage: number;
    direction: 'HIGHER_BETTER' | 'LOWER_BETTER'; state: KpiState;
}
interface QueueItem {
    assignmentId: string; articleId: string; manuscriptId: string | null; title: string;
    stage: string; stageGroup: StageGroup; status: string;
    dueDate: string | null; dueState: DueState; daysToDue: number | null;
}
interface QueueJournal { journalId: string; journalName: string; items: QueueItem[]; }
interface QueueDomain { domainId: string | null; domain: string; journals: QueueJournal[]; }
interface PipelineStage { key: string; label: string; count: number; }
interface Release {
    issueId: string; journalName: string; domain: string; label: string;
    status: string; completion: number; readyArticles: number; expectedManuscripts: number;
    plannedReleaseAt: string | null; daysToRelease: number | null; releaseState: ReleaseState;
}
interface Workload {
    employee: {
        id: string; name: string; role: string; roleTemplate: string;
        coverage: { journals: number; domains: number };
        reportsTo: { id: string; name: string } | null;
        generatedAt: string; window: string;
    };
    summary: { openAssignments: number; overdue: number; dueToday: number };
    kpis: Kpi[];
    queue: QueueDomain[];
    pipeline: { totalLive: number; asOf: string; stages: PipelineStage[] };
    releases: Release[];
}

// ---- Presentation maps ----
const STAGE_CHIP: Record<StageGroup, string> = {
    INTAKE: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    REVIEW: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    QUALITY: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    PRODUCTION: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    PUBLISHED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};
const DUE_STRIPE: Record<DueState, string> = {
    OVERDUE: 'bg-rose-500', DUE_TODAY: 'bg-amber-500',
    UPCOMING: 'bg-indigo-300 dark:bg-indigo-700', NONE: 'bg-slate-200 dark:bg-slate-700',
};
const DUE_TEXT: Record<DueState, string> = {
    OVERDUE: 'text-rose-600 dark:text-rose-400', DUE_TODAY: 'text-amber-600 dark:text-amber-400',
    UPCOMING: 'text-slate-400', NONE: 'text-slate-400',
};
const PIPE_COLOR: Record<string, string> = {
    IN_LINE: 'bg-slate-400', IN_PROCESS: 'bg-indigo-500', BOARD_REVIEW: 'bg-violet-500',
    COPY_EDITING: 'bg-amber-500', GALLEY: 'bg-amber-500',
    PUBLISHED_TODAY: 'bg-emerald-500', REJECTED: 'bg-rose-500',
};
const KPI_STATE: Record<KpiState, { pill: string; bar: string; label: string }> = {
    ON_TRACK: { pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', bar: 'bg-emerald-500', label: 'On track' },
    AT_RISK: { pill: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300', bar: 'bg-amber-500', label: 'At risk' },
    BEHIND: { pill: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300', bar: 'bg-rose-500', label: 'Behind' },
};
const REL_PILL: Record<ReleaseState, string> = {
    ON_TIME: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    AT_RISK: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    OVERDUE: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};

const fmtDue = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';
const dueBadge = (it: QueueItem) => {
    if (it.dueState === 'OVERDUE') return `Overdue ${Math.abs(it.daysToDue ?? 0)}d`;
    if (it.dueState === 'DUE_TODAY') return 'Today';
    if (it.dueState === 'UPCOMING') return `In ${it.daysToDue}d`;
    return 'No due date';
};
const unitSuffix = (u: string) => (u.includes('PERCENT') ? '%' : '');

export default function PublicationWorkloadPage() {
    const [data, setData] = useState<Workload | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        try {
            const res = await fetch('/api/staff/publication-workload');
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
                    <p className="text-slate-500 text-sm font-medium">Loading your publication workload…</p>
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
                    <button onClick={() => fetchData()} className="px-5 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700">
                        Try again
                    </button>
                </div>
            </div>
        );
    }
    if (!data) return null;

    const { employee, summary, kpis, queue, pipeline, releases } = data;
    const totalAssignments = queue.reduce((n, d) => n + d.journals.reduce((m, j) => m + j.items.length, 0), 0);
    const maxPipe = Math.max(1, ...pipeline.stages.map((s) => s.count));

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-8 text-slate-900 dark:text-slate-100">
            <div className="max-w-6xl mx-auto space-y-4">

                {/* Header */}
                <header className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <div className="h-12 w-12 shrink-0 rounded-xl grid place-items-center text-white font-bold text-lg bg-gradient-to-br from-indigo-500 to-violet-500">
                        {employee.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight">{employee.name}</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{employee.roleTemplate}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                            <span><b className="text-slate-500 dark:text-slate-300">{employee.coverage.journals}</b> journals</span>
                            <span><b className="text-slate-500 dark:text-slate-300">{employee.coverage.domains}</b> domains</span>
                            {employee.reportsTo && <span>Reports to <b className="text-slate-500 dark:text-slate-300">{employee.reportsTo.name}</b></span>}
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                        {summary.overdue > 0 ? (
                            <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
                                <span className="h-2 w-2 rounded-full bg-current" />{summary.overdue} overdue
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                                <span className="h-2 w-2 rounded-full bg-current" />On track
                            </span>
                        )}
                        <button onClick={() => fetchData(true)} disabled={refreshing}
                            className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                            title="Refresh">
                            <RefreshCw size={18} className={`text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </header>

                {/* KPI strip */}
                {kpis.length > 0 && (
                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {kpis.slice(0, 4).map((k) => {
                            const s = KPI_STATE[k.state];
                            const pct = Math.max(0, Math.min(100, k.direction === 'LOWER_BETTER'
                                ? (k.target > 0 ? (k.current / k.target) * 100 : 0)
                                : k.achievementPercentage));
                            const Icon = k.direction === 'LOWER_BETTER' ? TrendingDown : k.state === 'BEHIND' ? Minus : TrendingUp;
                            return (
                                <div key={k.key} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 leading-tight">{k.label}</p>
                                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${s.pill}`}>
                                            <Icon size={11} />{s.label}
                                        </span>
                                    </div>
                                    <div className="text-2xl font-bold tracking-tight tabular-nums">
                                        {k.current}<span className="text-sm text-slate-400 font-semibold"> / {k.target}{unitSuffix(k.unit)}</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                        <span className={`block h-full rounded-full ${s.bar}`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <p className="text-[11px] text-slate-400">{k.period.toLowerCase()} · {k.direction === 'LOWER_BETTER' ? 'cap' : 'target'} {k.target}{unitSuffix(k.unit)}</p>
                                </div>
                            );
                        })}
                    </section>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                    {/* Work queue */}
                    <section className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="font-bold text-[15px]">My work queue</h2>
                            <span className="text-xs text-slate-400 font-medium">{totalAssignments} assignments · by domain</span>
                        </div>
                        {queue.length === 0 ? (
                            <p className="px-5 py-10 text-center text-sm text-slate-400">No open stage assignments. You’re all caught up.</p>
                        ) : queue.map((dom) => (
                            <div key={dom.domainId ?? dom.domain}>
                                {dom.journals.map((j) => (
                                    <div key={j.journalId}>
                                        <div className="flex items-center gap-2.5 px-5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">{dom.domain}</span>
                                            <span className="text-[11px] text-slate-400 truncate">{j.journalName}</span>
                                            <span className="ml-auto text-[11px] font-semibold text-slate-400">{j.items.length}</span>
                                        </div>
                                        {j.items.map((it) => (
                                            <div key={it.assignmentId} className="flex items-center border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                <span className={`w-1 self-stretch ${DUE_STRIPE[it.dueState]}`} />
                                                <div className="flex-1 min-w-0 py-3 pl-4 pr-3">
                                                    <p className="text-sm font-semibold leading-snug truncate">{it.title}</p>
                                                    {it.manuscriptId && <p className="text-[11px] text-slate-400 font-mono mt-0.5">{it.manuscriptId}</p>}
                                                </div>
                                                <div className="flex items-center gap-3 pr-4 shrink-0">
                                                    <span className={`text-[11px] font-bold px-2 py-1 rounded-md whitespace-nowrap ${STAGE_CHIP[it.stageGroup]}`}>
                                                        {it.stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                                                    </span>
                                                    <div className="text-right w-16">
                                                        <p className="text-xs font-semibold tabular-nums">{fmtDue(it.dueDate)}</p>
                                                        <p className={`text-[10px] font-bold uppercase tracking-wide ${DUE_TEXT[it.dueState]}`}>{dueBadge(it)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </section>

                    {/* Right column */}
                    <div className="space-y-4">
                        {/* Pipeline */}
                        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                                <h2 className="font-bold text-[15px]">Today’s pipeline</h2>
                                <span className="text-xs text-slate-400 font-medium">{pipeline.totalLive} live</span>
                            </div>
                            <div className="px-5 py-3">
                                {pipeline.stages.map((st) => (
                                    <div key={st.key} className="grid grid-cols-[7.5rem_1fr_1.75rem] items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                            <i className={`h-1.5 w-1.5 rounded-sm ${PIPE_COLOR[st.key] ?? 'bg-slate-400'}`} />{st.label}
                                        </span>
                                        <span className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                            <span className={`block h-full rounded-full ${PIPE_COLOR[st.key] ?? 'bg-slate-400'}`} style={{ width: `${(st.count / maxPipe) * 100}%` }} />
                                        </span>
                                        <span className="text-sm font-bold text-right tabular-nums">{st.count}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mx-5 mb-4 mt-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                <BookOpen size={13} /> Each publish credits your KRA metric automatically
                            </div>
                        </section>

                        {/* Releases */}
                        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                                <h2 className="font-bold text-[15px]">Upcoming issue releases</h2>
                            </div>
                            {releases.length === 0 ? (
                                <p className="px-5 py-8 text-center text-sm text-slate-400">No issues in progress.</p>
                            ) : releases.map((r) => (
                                <div key={r.issueId} className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold truncate">{r.journalName}</p>
                                        <p className="text-[11px] text-slate-400">{r.label} · {r.domain}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-semibold tabular-nums">{fmtDue(r.plannedReleaseAt)}</p>
                                        <p className="text-[10px] text-slate-400">{r.readyArticles}/{r.expectedManuscripts || '—'} ready</p>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full whitespace-nowrap ${REL_PILL[r.releaseState]}`}>
                                        {r.releaseState.replace('_', ' ').toLowerCase()}
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
