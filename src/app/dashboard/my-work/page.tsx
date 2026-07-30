'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
    Square, Clock, Folder, FolderKanban, ArrowRight, ListTodo, LifeBuoy,
    AlertCircle, Users, Info,
} from 'lucide-react';
import { useCurrentSessions, useMyProjects, useWorkSessionMutations, formatMinutes } from '@/hooks/useWorkSessions';
import { useTickets } from '@/hooks/useSupportTickets';
import { LifecycleTabs, StartPill } from '@/components/dashboard/it/LifecycleUI';
import {
    projectLifecycle, companyProjectLifecycle, taskLifecycle, ticketLifecycle,
    lifecycleStart, lifecycleLabel, LIFECYCLE_THEME,
    PROJECT_LIFECYCLES, TASK_LIFECYCLES, TICKET_LIFECYCLES,
    PROJECT_LIFECYCLE_LABELS, TASK_LIFECYCLE_LABELS, TICKET_LIFECYCLE_LABELS,
    type LifecycleKey,
} from '@/lib/it/lifecycle';

type Surface = 'projects' | 'tasks' | 'tickets';

const clockString = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const sessionProjectName = (s: any) => s.project?.title || s.itProject?.name || 'Unassigned';
const sessionHref = (s: any) =>
    s.projectId ? `/dashboard/projects/${s.projectId}`
        : s.itProjectId ? `/dashboard/it-management/projects/${s.itProjectId}` : '#';

/* ═══ Page ════════════════════════════════════════════════════════════════ */

export default function MyWorkPage() {
    const [surface, setSurface] = useState<Surface>('projects');
    const [stage, setStage] = useState<LifecycleKey | 'ALL'>('ALL');

    const { data: running = [] } = useCurrentSessions();
    const { data: myProjectData, isLoading: projectsLoading } = useMyProjects();
    const { data: tickets = [], isLoading: ticketsLoading } = useTickets();
    const { stop } = useWorkSessionMutations();

    const { data: tasks = [], isLoading: tasksLoading } = useQuery({
        queryKey: ['my-work-tasks'],
        queryFn: async () => {
            const res = await fetch('/api/it/tasks?view=my');
            if (!res.ok) throw new Error('Could not load tasks');
            return res.json();
        },
        select: (d: any) => (Array.isArray(d) ? d : []),
    });

    // One ticking clock drives every live session row.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (running.length === 0) return;
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, [running.length]);

    /* ── Decorate each surface with lifecycle + timing ──────────────────── */

    const stagedProjects = useMemo(
        () =>
            (myProjectData?.projects ?? []).map((p: any) => {
                const lifecycle = p.kind === 'IT' ? projectLifecycle(p.status) : companyProjectLifecycle(p.status);
                return {
                    ...p,
                    lifecycle,
                    start: lifecycleStart({
                        lifecycle, startDate: p.startDate, dueDate: p.endDate, completedAt: p.completedAt,
                    }),
                };
            }),
        [myProjectData],
    );

    const stagedTasks = useMemo(
        () =>
            (tasks as any[]).map((t) => {
                const lifecycle = taskLifecycle(t.status);
                return {
                    ...t,
                    lifecycle,
                    start: lifecycleStart({
                        lifecycle, startDate: t.startDate, dueDate: t.dueDate, completedAt: t.completedAt,
                    }),
                };
            }),
        [tasks],
    );

    const stagedTickets = useMemo(
        () =>
            (tickets as any[]).map((t) => {
                const lifecycle = ticketLifecycle(t.status);
                return {
                    ...t,
                    lifecycle,
                    start: lifecycleStart({
                        lifecycle, kind: 'queue', startDate: t.createdAt, dueDate: t.dueAt, completedAt: t.resolvedAt,
                    }),
                };
            }),
        [tickets],
    );

    const active = surface === 'projects' ? stagedProjects : surface === 'tasks' ? stagedTasks : stagedTickets;
    const stages = surface === 'projects' ? PROJECT_LIFECYCLES : surface === 'tasks' ? TASK_LIFECYCLES : TICKET_LIFECYCLES;
    const labels = surface === 'projects' ? PROJECT_LIFECYCLE_LABELS : surface === 'tasks' ? TASK_LIFECYCLE_LABELS : TICKET_LIFECYCLE_LABELS;

    const stageCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        active.forEach((i: any) => { counts[i.lifecycle] = (counts[i.lifecycle] ?? 0) + 1; });
        return counts;
    }, [active]);

    const visible = stage === 'ALL' ? active : active.filter((i: any) => i.lifecycle === stage);
    const loading = surface === 'projects' ? projectsLoading : surface === 'tasks' ? tasksLoading : ticketsLoading;

    const handleStop = async (id: string) => {
        try {
            await stop.mutateAsync({ id });
            toast.success('Work session stopped');
        } catch (e: any) {
            toast.error(e?.message || 'Could not stop session');
        }
    };

    const tabs: { key: Surface; label: string; count: number; icon: typeof Folder }[] = [
        { key: 'projects', label: 'My Projects', count: stagedProjects.length, icon: FolderKanban },
        { key: 'tasks', label: 'My Tasks', count: stagedTasks.length, icon: ListTodo },
        { key: 'tickets', label: 'My Tickets', count: stagedTickets.length, icon: LifeBuoy },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-black text-secondary-900 tracking-tight">My Work</h1>
                <p className="text-secondary-500 font-medium mt-1">
                    Everything assigned to you — projects, tasks and tickets — plus whatever you have running right now.
                </p>
            </div>

            {/* ── LIVE SESSIONS ──────────────────────────────────────────── */}
            {running.length > 0 && (
                <div className="card-premium p-6 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-sm font-black uppercase tracking-widest text-secondary-400 flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-success-500 opacity-75 animate-ping" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
                            </span>
                            Running now
                            <span className="px-2 py-0.5 rounded-md bg-success-50 text-success-700 border border-success-200">{running.length}</span>
                        </h2>
                    </div>

                    <div className="space-y-2">
                        {running.map((s: any) => (
                            <div key={s.id} className="flex items-center justify-between gap-4 rounded-xl border border-success-200 bg-success-50/40 px-4 py-3">
                                <div className="min-w-0">
                                    <Link href={sessionHref(s)} className="font-black text-secondary-900 hover:text-primary-600 truncate block">
                                        {sessionProjectName(s)}
                                    </Link>
                                    <p className="text-[11px] font-bold text-secondary-500 uppercase tracking-wider">
                                        {s.itProjectId ? 'IT project' : 'Company project'} · started {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <span className="text-2xl font-black tabular-nums text-secondary-900">
                                        {clockString(now - new Date(s.startedAt).getTime())}
                                    </span>
                                    <button
                                        onClick={() => handleStop(s.id)}
                                        disabled={stop.isPending}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 disabled:opacity-60"
                                    >
                                        <Square size={14} /> Stop
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Parallel timers overlap, so say so rather than letting the numbers imply
                        more hours than the day actually contains. */}
                    {running.length > 1 && (
                        <p className="flex items-start gap-2 text-xs text-secondary-500">
                            <Info size={14} className="mt-0.5 shrink-0 text-secondary-400" />
                            <span>
                                {running.length} timers are running at once. Each project counts the full elapsed time, so
                                per-project totals add up to more than the hours you have actually worked.
                            </span>
                        </p>
                    )}
                </div>
            )}

            {/* ── SURFACE TABS ───────────────────────────────────────────── */}
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
                            <span className={`px-1.5 py-0.5 rounded-md text-[11px] ${on ? 'bg-white/20' : 'bg-secondary-100'}`}>
                                {t.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ── LIFECYCLE FILTER ───────────────────────────────────────── */}
            {!loading && active.length > 0 && (
                <LifecycleTabs
                    tone="light"
                    value={stage}
                    onChange={setStage}
                    stages={stages}
                    counts={stageCounts}
                    total={active.length}
                    labels={labels}
                    allLabel="All Stages"
                />
            )}

            {/* ── LIST ───────────────────────────────────────────────────── */}
            {loading ? (
                <div className="p-10 text-center animate-pulse text-secondary-400">Loading your work…</div>
            ) : visible.length === 0 ? (
                <div className="card-premium p-12 text-center text-secondary-400">
                    <Folder size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="font-bold text-secondary-600">
                        {active.length === 0
                            ? `Nothing here yet — you're not on any ${surface} right now.`
                            : 'Nothing sits in this stage.'}
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
                                    {p.isRunning && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-success-700">
                                            <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" /> live
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

                                {p.myRoles.length > 0 && (
                                    <p className="mt-3 text-[10px] font-bold text-secondary-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <Users size={11} /> {p.myRoles.join(' · ')}
                                    </p>
                                )}

                                <div className="mt-2 flex items-center justify-between text-xs text-secondary-500">
                                    <span className="flex items-center gap-1.5"><Clock size={12} /> {formatMinutes(p.loggedMinutes)} logged</span>
                                    {(p.myOpenTasks > 0 || p.myDoneTasks > 0) && (
                                        <span className="font-bold">{p.myOpenTasks} open · {p.myDoneTasks} done</span>
                                    )}
                                </div>

                                <div className="mt-3 flex items-center gap-1 text-primary-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
                                    Open <ArrowRight size={14} />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : surface === 'tasks' ? (
                <div className="space-y-3">
                    {visible.map((t: any) => (
                        <Link key={t.id} href={`/dashboard/it-management/tasks/${t.id}`} className="card-premium p-5 flex items-center justify-between gap-4 hover:-translate-y-0.5 hover:shadow-lg transition-all group">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">{t.taskCode}</span>
                                    <StartPill state={t.start} tone="light" />
                                </div>
                                <h3 className="font-black text-secondary-900 truncate group-hover:text-primary-600">{t.title}</h3>
                                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-secondary-500">
                                    {t.project?.name && <span className="flex items-center gap-1"><FolderKanban size={11} /> {t.project.name}</span>}
                                    <span className="font-bold">{t.priority}</span>
                                    <span>{t.progressPercent}% done</span>
                                </div>
                            </div>
                            <ArrowRight size={18} className="text-secondary-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all shrink-0" />
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {visible.map((t: any) => (
                        <Link key={t.id} href={`/dashboard/support-desk/${t.id}`} className="card-premium p-5 flex items-center justify-between gap-4 hover:-translate-y-0.5 hover:shadow-lg transition-all group">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">{t.status.replace('_', ' ')}</span>
                                    <StartPill state={t.start} tone="light" />
                                </div>
                                <h3 className="font-black text-secondary-900 truncate group-hover:text-primary-600">{t.title}</h3>
                                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-secondary-500">
                                    <span className="font-bold">{t.priority}</span>
                                    {t.department?.name && <span>{t.department.name}</span>}
                                    <span>
                                        {t.assignedTo ? `Handled by ${t.assignedTo.name || t.assignedTo.email}` : 'Awaiting assignment'}
                                    </span>
                                </div>
                            </div>
                            <ArrowRight size={18} className="text-secondary-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all shrink-0" />
                        </Link>
                    ))}
                </div>
            )}

            {/* Deep links to the full-featured screens */}
            <div className="flex flex-wrap gap-4 text-xs font-black uppercase tracking-widest text-primary-600">
                <Link href="/dashboard/my-tasks" className="hover:underline flex items-center gap-1">Full task workspace <ArrowRight size={12} /></Link>
                <Link href="/dashboard/support-desk" className="hover:underline flex items-center gap-1">Support desk <ArrowRight size={12} /></Link>
            </div>
        </div>
    );
}
