'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Users, FolderKanban, ListTodo, LifeBuoy, AlertCircle, Clock, ArrowRight,
    Folder, Info, UserX,
} from 'lucide-react';
import { useTeamWork, formatMinutes } from '@/hooks/useWorkSessions';
import { LifecycleTabs, StartPill, PeopleStack } from '@/components/dashboard/it/LifecycleUI';
import {
    projectLifecycle, companyProjectLifecycle, taskLifecycle, ticketLifecycle,
    lifecycleStart, lifecycleLabel, LIFECYCLE_THEME,
    PROJECT_LIFECYCLES, TASK_LIFECYCLES, TICKET_LIFECYCLES,
    PROJECT_LIFECYCLE_LABELS, TASK_LIFECYCLE_LABELS, TICKET_LIFECYCLE_LABELS,
    type LifecycleKey,
} from '@/lib/it/lifecycle';

type Surface = 'people' | 'projects' | 'tasks' | 'tickets';

const SCOPE_LABEL: Record<string, string> = {
    DOWNLINE: 'You and everyone reporting up to you',
    COMPANY: 'Everyone in your company',
    ALL: 'Everyone in your company (group admin)',
};

const personName = (p: { name?: string | null; email?: string | null }) =>
    p.name?.trim() || p.email?.split('@')[0] || 'Unknown';

export default function TeamWorkPage() {
    const [surface, setSurface] = useState<Surface>('people');
    const [stage, setStage] = useState<LifecycleKey | 'ALL'>('ALL');
    const [personFilter, setPersonFilter] = useState<string>('');

    const { data, isLoading, isError } = useTeamWork();

    const members = data?.members ?? [];
    const summary = data?.summary;

    /* ── Lifecycle-stamp the three work lists ───────────────────────────── */

    const stagedProjects = useMemo(
        () =>
            (data?.projects ?? []).map((p: any) => {
                const lifecycle = p.kind === 'IT' ? projectLifecycle(p.status) : companyProjectLifecycle(p.status);
                return {
                    ...p,
                    lifecycle,
                    start: lifecycleStart({ lifecycle, startDate: p.startDate, dueDate: p.endDate, completedAt: p.completedAt }),
                };
            }),
        [data],
    );

    const stagedTasks = useMemo(
        () =>
            (data?.tasks ?? []).map((t: any) => {
                const lifecycle = taskLifecycle(t.status);
                return {
                    ...t,
                    lifecycle,
                    start: lifecycleStart({ lifecycle, startDate: t.startDate, dueDate: t.dueDate, completedAt: t.completedAt }),
                };
            }),
        [data],
    );

    const stagedTickets = useMemo(
        () =>
            (data?.tickets ?? []).map((t: any) => {
                const lifecycle = ticketLifecycle(t.status);
                return {
                    ...t,
                    lifecycle,
                    start: lifecycleStart({ lifecycle, kind: 'queue', startDate: t.createdAt, dueDate: t.dueAt, completedAt: t.resolvedAt }),
                };
            }),
        [data],
    );

    const active = useMemo(
        () =>
            surface === 'projects' ? stagedProjects
                : surface === 'tasks' ? stagedTasks
                    : surface === 'tickets' ? stagedTickets : [],
        [surface, stagedProjects, stagedTasks, stagedTickets],
    );
    const stages = surface === 'projects' ? PROJECT_LIFECYCLES : surface === 'tasks' ? TASK_LIFECYCLES : TICKET_LIFECYCLES;
    const labels = surface === 'projects' ? PROJECT_LIFECYCLE_LABELS : surface === 'tasks' ? TASK_LIFECYCLE_LABELS : TICKET_LIFECYCLE_LABELS;

    // The person filter applies to tasks and tickets, which carry an assignee.
    const scoped = useMemo(
        () =>
            personFilter && (surface === 'tasks' || surface === 'tickets')
                ? active.filter((i: any) => i.assigneeId === personFilter)
                : active,
        [active, personFilter, surface],
    );

    const stageCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        scoped.forEach((i: any) => { counts[i.lifecycle] = (counts[i.lifecycle] ?? 0) + 1; });
        return counts;
    }, [scoped]);

    const visible = stage === 'ALL' ? scoped : scoped.filter((i: any) => i.lifecycle === stage);

    const tabs: { key: Surface; label: string; count: number; icon: typeof Users }[] = [
        { key: 'people', label: 'People', count: members.length, icon: Users },
        { key: 'projects', label: 'Team Projects', count: stagedProjects.length, icon: FolderKanban },
        { key: 'tasks', label: 'Team Tasks', count: stagedTasks.length, icon: ListTodo },
        { key: 'tickets', label: 'Team Tickets', count: stagedTickets.length, icon: LifeBuoy },
    ];

    if (isLoading) return <div className="p-10 text-center animate-pulse text-secondary-400">Loading your team…</div>;
    if (isError) return <div className="card-premium p-10 text-center text-secondary-500">Could not load team work.</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-black text-secondary-900 tracking-tight flex items-center gap-3">
                    <Users size={26} className="text-primary-500" /> Team Work
                </h1>
                <p className="text-secondary-500 font-medium mt-1">
                    What your team is carrying — from assigned work, not just who happens to have a timer running.
                    <span className="block text-xs mt-0.5 text-secondary-400">
                        {SCOPE_LABEL[data?.scope?.kind ?? 'DOWNLINE']} · {data?.scope?.memberCount ?? 0} people
                    </span>
                </p>
            </div>

            {/* ── HEADLINE NUMBERS ───────────────────────────────────────── */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                        { label: 'Working now', value: summary.running, tone: 'text-success-700 bg-success-50 border-success-200' },
                        { label: 'Idle & late', value: summary.idleWithOverdue, tone: 'text-rose-700 bg-rose-50 border-rose-200' },
                        { label: 'Open tasks', value: summary.openTasks, tone: 'text-secondary-800 bg-white border-secondary-200' },
                        { label: 'Overdue tasks', value: summary.overdueTasks, tone: 'text-rose-700 bg-rose-50 border-rose-200' },
                        { label: 'Open tickets', value: summary.openTickets, tone: 'text-secondary-800 bg-white border-secondary-200' },
                        { label: 'Overdue tickets', value: summary.overdueTickets, tone: 'text-rose-700 bg-rose-50 border-rose-200' },
                    ].map((s) => (
                        <div key={s.label} className={`rounded-2xl border p-4 ${s.tone}`}>
                            <p className="text-3xl font-black leading-none">{s.value}</p>
                            <p className="mt-1.5 text-[10px] font-black uppercase tracking-widest opacity-70">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* ── TABS ───────────────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-2">
                {tabs.map((t) => {
                    const on = surface === t.key;
                    return (
                        <button
                            key={t.key}
                            onClick={() => { setSurface(t.key); setStage('ALL'); }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                                on
                                    ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/20'
                                    : 'bg-white border-secondary-200 text-secondary-600 hover:bg-secondary-50'
                            }`}
                        >
                            <t.icon size={16} /> {t.label}
                            <span className={`px-1.5 py-0.5 rounded-md text-[11px] ${on ? 'bg-white/20' : 'bg-secondary-100'}`}>{t.count}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── PEOPLE ROLL-UP ─────────────────────────────────────────── */}
            {surface === 'people' ? (
                members.length === 0 ? (
                    <div className="card-premium p-12 text-center text-secondary-400">
                        <Users size={40} className="mx-auto mb-3 opacity-40" />
                        <p className="font-bold text-secondary-600">Nobody reports up to you yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {members.map((m: any) => (
                            <div
                                key={m.userId}
                                className={`card-premium p-5 ${m.idleWithOverdue ? 'ring-2 ring-rose-200' : ''}`}
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                    <div className="flex items-center gap-3 min-w-0 lg:w-64">
                                        <PeopleStack
                                            tone="light" size="md" caption={null}
                                            people={[{ id: m.userId, name: m.name, email: m.email, role: m.role }]}
                                        />
                                        <div className="min-w-0">
                                            <p className="font-black text-secondary-900 truncate">
                                                {personName(m)}
                                                {m.isYou && <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-primary-600">you</span>}
                                            </p>
                                            <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">{m.role}</p>
                                        </div>
                                    </div>

                                    {/* What they are on right now */}
                                    <div className="flex-1 min-w-0">
                                        {m.running.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {m.running.map((s: any) => (
                                                    <Link
                                                        key={s.id}
                                                        href={s.href}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success-50 border border-success-200 text-success-800 text-xs font-bold hover:bg-success-100"
                                                    >
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="absolute inline-flex h-full w-full rounded-full bg-success-500 opacity-75 animate-ping" />
                                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
                                                        </span>
                                                        {s.projectName}
                                                        <span className="tabular-nums opacity-70">{formatMinutes(s.minutes)}</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        ) : m.idleWithOverdue ? (
                                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black uppercase tracking-wider">
                                                <UserX size={13} /> No timer running, and work is late
                                            </span>
                                        ) : (
                                            <span className="text-xs font-bold text-secondary-400">No timer running</span>
                                        )}
                                        {m.lastActiveAt && m.running.length === 0 && (
                                            <p className="mt-1.5 text-[10px] font-bold text-secondary-400 uppercase tracking-widest flex items-center gap-1">
                                                <Clock size={10} /> Last logged {new Date(m.lastActiveAt).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>

                                    {/* Load */}
                                    <div className="flex items-center gap-5 shrink-0 text-xs">
                                        {[
                                            { n: m.projectCount, label: 'projects' },
                                            { n: m.openTasks, label: 'open tasks' },
                                            { n: m.overdueTasks, label: 'late tasks', bad: true },
                                            { n: m.openTickets, label: 'tickets' },
                                            { n: m.overdueTickets, label: 'late tickets', bad: true },
                                        ].map((x) => (
                                            <div key={x.label} className="text-center">
                                                <p className={`text-xl font-black leading-none ${x.bad && x.n > 0 ? 'text-rose-600' : 'text-secondary-800'}`}>{x.n}</p>
                                                <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-secondary-400">{x.label}</p>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => { setPersonFilter(m.userId); setSurface('tasks'); setStage('ALL'); }}
                                            className="ml-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary-600 hover:underline"
                                        >
                                            Their work <ArrowRight size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <>
                    {/* Person filter, when drilled in from a roll-up row */}
                    {personFilter && (surface === 'tasks' || surface === 'tickets') && (
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-50 border border-primary-200 text-primary-700 text-xs font-bold">
                                Filtered to {personName(members.find((m: any) => m.userId === personFilter) ?? {})}
                                <button onClick={() => setPersonFilter('')} className="hover:underline font-black">clear</button>
                            </span>
                        </div>
                    )}

                    {scoped.length > 0 && (
                        <LifecycleTabs
                            tone="light"
                            value={stage}
                            onChange={setStage}
                            stages={stages}
                            counts={stageCounts}
                            total={scoped.length}
                            labels={labels}
                            allLabel="All Stages"
                        />
                    )}

                    {visible.length === 0 ? (
                        <div className="card-premium p-12 text-center text-secondary-400">
                            <Folder size={40} className="mx-auto mb-3 opacity-40" />
                            <p className="font-bold text-secondary-600">
                                {scoped.length === 0 ? `No team ${surface} to show.` : 'Nothing sits in this stage.'}
                            </p>
                            {stage !== 'ALL' && (
                                <button onClick={() => setStage('ALL')} className="mt-4 text-xs font-black text-primary-600 uppercase tracking-widest hover:underline">
                                    Show all stages
                                </button>
                            )}
                        </div>
                    ) : surface === 'projects' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {visible.map((p: any) => {
                                const theme = LIFECYCLE_THEME[p.lifecycle as LifecycleKey];
                                return (
                                    <Link key={p.key} href={p.href} className="card-premium p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all group">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className={`p-2.5 rounded-xl ${p.kind === 'IT' ? 'bg-indigo-50 text-indigo-600' : 'bg-primary-50 text-primary-600'}`}>
                                                {p.kind === 'IT' ? <FolderKanban size={20} /> : <Folder size={20} />}
                                            </div>
                                            {p.liveNow > 0 && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-success-700">
                                                    <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" /> {p.liveNow} live
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-black text-secondary-900 truncate group-hover:text-primary-600">{p.name}</p>
                                        {p.code && <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest mt-0.5">{p.code}</p>}
                                        <div className="flex flex-wrap items-center gap-1.5 mt-3">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${theme.light.bg} ${theme.light.text} ${theme.light.border}`}>
                                                {lifecycleLabel(p.lifecycle, PROJECT_LIFECYCLE_LABELS)}
                                            </span>
                                            <StartPill state={p.start} tone="light" />
                                        </div>
                                        <div className="mt-3 flex items-center justify-between text-xs text-secondary-500">
                                            <span className="flex items-center gap-1.5"><Users size={12} /> {p.teamOnIt} from your team</span>
                                            <span className="font-bold">{p.teamOpenTasks} open</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : surface === 'tasks' ? (
                        <div className="space-y-3">
                            {visible.map((t: any) => (
                                <Link key={t.key} href={t.href} className="card-premium p-5 flex items-center justify-between gap-4 hover:-translate-y-0.5 hover:shadow-lg transition-all group">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            {t.code && <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">{t.code}</span>}
                                            <StartPill state={t.start} tone="light" />
                                        </div>
                                        <h3 className="font-black text-secondary-900 truncate group-hover:text-primary-600">{t.title}</h3>
                                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-secondary-500">
                                            <span className="font-bold">{t.assigneeName || 'Unassigned'}</span>
                                            {t.projectName && <span className="flex items-center gap-1"><FolderKanban size={11} /> {t.projectName}</span>}
                                            <span>{t.priority}</span>
                                        </div>
                                    </div>
                                    <ArrowRight size={18} className="text-secondary-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all shrink-0" />
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {visible.map((t: any) => (
                                <Link key={t.id} href={t.href} className="card-premium p-5 flex items-center justify-between gap-4 hover:-translate-y-0.5 hover:shadow-lg transition-all group">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">{t.status.replace('_', ' ')}</span>
                                            <StartPill state={t.start} tone="light" />
                                        </div>
                                        <h3 className="font-black text-secondary-900 truncate group-hover:text-primary-600">{t.title}</h3>
                                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-secondary-500">
                                            <span className="font-bold">{t.assigneeName || 'Unassigned'}</span>
                                            {t.departmentName && <span>{t.departmentName}</span>}
                                            <span>{t.priority}</span>
                                        </div>
                                    </div>
                                    <ArrowRight size={18} className="text-secondary-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all shrink-0" />
                                </Link>
                            ))}
                        </div>
                    )}

                    {data && (surface === 'tasks' || surface === 'tickets') && scoped.length >= 400 && (
                        <p className="flex items-center gap-2 text-xs text-secondary-500">
                            <Info size={14} className="text-secondary-400" />
                            Showing the first 400 — the counts above are exact, this list is capped.
                        </p>
                    )}
                </>
            )}

            <div className="flex flex-wrap gap-4 text-xs font-black uppercase tracking-widest text-primary-600">
                <Link href="/dashboard/work-activity" className="hover:underline flex items-center gap-1">Live work activity <ArrowRight size={12} /></Link>
                <Link href="/dashboard/my-work" className="hover:underline flex items-center gap-1">My own work <ArrowRight size={12} /></Link>
            </div>
        </div>
    );
}
