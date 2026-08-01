'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
    Square, Clock, Folder, FolderKanban, ArrowRight, ListTodo, LifeBuoy,
    Users, Info, CheckSquare, Plus, Trash2, Check, X, Calendar,
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

/**
 * The one place a person looks for their own work.
 *
 * `tasks` are ITTask records (the IT delivery board); `todos` are Task records (the personal
 * / DPR list). They are different tables that both used to have their own top-level nav
 * entry alongside this page, which meant three menu items all reading as "my tasks". The
 * other two now redirect here, so every action they offered has to live on this page.
 */
type Surface = 'projects' | 'tasks' | 'todos' | 'tickets';
const SURFACES: Surface[] = ['projects', 'tasks', 'todos', 'tickets'];

const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED', 'CANCELLED'];
const IT_TASK_STATUS_LABELS: Record<string, string> = {
    PENDING: 'Not started',
    IN_PROGRESS: 'In progress',
    UNDER_REVIEW: 'In review',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
};

const clockString = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const sessionProjectName = (s: any) => s.project?.title || s.itProject?.name || 'Unassigned';
const sessionHref = (s: any) =>
    s.projectId ? `/dashboard/projects/${s.projectId}`
        : s.itProjectId ? `/dashboard/it-management/projects/${s.itProjectId}` : '#';

const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const PRIORITY_STYLE: Record<string, string> = {
    URGENT: 'bg-rose-50 text-rose-700 border-rose-200',
    HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
    MEDIUM: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

/* ═══ Page ════════════════════════════════════════════════════════════════ */

export default function MyWorkPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center animate-pulse text-secondary-400">Loading your work…</div>}>
            <MyWork />
        </Suspense>
    );
}

function MyWork() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    const qc = useQueryClient();

    const [surface, setSurface] = useState<Surface>(
        SURFACES.includes(tabParam as Surface) ? (tabParam as Surface) : 'projects',
    );
    const [stage, setStage] = useState<LifecycleKey | 'ALL'>('ALL');

    // A redirect from the retired pages lands with ?tab=…; honour it on client nav too.
    useEffect(() => {
        if (SURFACES.includes(tabParam as Surface)) {
            setSurface(tabParam as Surface);
            setStage('ALL');
        }
    }, [tabParam]);

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

    const { data: todos = [], isLoading: todosLoading } = useQuery({
        queryKey: ['my-work-todos'],
        queryFn: async () => {
            const res = await fetch('/api/tasks', { headers: authHeaders() });
            if (!res.ok) throw new Error('Could not load your to-dos');
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

    // Task rows carry no completedAt column, so a completed to-do falls back to its due date
    // for the "delivered on" line — the same fallback lifecycleStart already applies.
    const stagedTodos = useMemo(
        () =>
            (todos as any[]).map((t) => {
                const lifecycle = taskLifecycle(t.status);
                return {
                    ...t,
                    lifecycle,
                    start: lifecycleStart({
                        lifecycle, startDate: t.startDate, dueDate: t.dueDate,
                    }),
                };
            }),
        [todos],
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

    const active =
        surface === 'projects' ? stagedProjects
            : surface === 'tasks' ? stagedTasks
                : surface === 'todos' ? stagedTodos
                    : stagedTickets;
    const stages = surface === 'projects' ? PROJECT_LIFECYCLES : surface === 'tickets' ? TICKET_LIFECYCLES : TASK_LIFECYCLES;
    const labels = surface === 'projects' ? PROJECT_LIFECYCLE_LABELS : surface === 'tickets' ? TICKET_LIFECYCLE_LABELS : TASK_LIFECYCLE_LABELS;

    const stageCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        active.forEach((i: any) => { counts[i.lifecycle] = (counts[i.lifecycle] ?? 0) + 1; });
        return counts;
    }, [active]);

    const visible = stage === 'ALL' ? active : active.filter((i: any) => i.lifecycle === stage);
    const loading =
        surface === 'projects' ? projectsLoading
            : surface === 'tasks' ? tasksLoading
                : surface === 'todos' ? todosLoading
                    : ticketsLoading;

    /* ── Actions ────────────────────────────────────────────────────────── */

    const handleStop = async (id: string) => {
        try {
            await stop.mutateAsync({ id });
            toast.success('Work session stopped');
        } catch (e: any) {
            toast.error(e?.message || 'Could not stop session');
        }
    };

    // Inline IT-task edits, carried over from the retired My IT Tasks board.
    const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
    const patchTask = async (id: string, patch: Record<string, unknown>, okMessage: string) => {
        setBusyTaskId(id);
        try {
            const res = await fetch(`/api/it/tasks/${id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Update failed');
            await qc.invalidateQueries({ queryKey: ['my-work-tasks'] });
            toast.success(okMessage);
        } catch (e: any) {
            toast.error(e?.message || 'Could not update the task');
        } finally {
            setBusyTaskId(null);
        }
    };

    // To-do actions, carried over from the retired To-Dos page.
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [todoForm, setTodoForm] = useState({ title: '', description: '', dueDate: '', priority: 'MEDIUM' });

    const refreshTodos = () => qc.invalidateQueries({ queryKey: ['my-work-todos'] });

    const toggleTodo = async (todo: any) => {
        const status = todo.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
        try {
            const res = await fetch(`/api/tasks/${todo.id}`, {
                method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error('Update failed');
            await refreshTodos();
        } catch {
            toast.error('Could not update the to-do');
        }
    };

    const deleteTodo = async (id: string) => {
        if (!confirm('Delete this to-do?')) return;
        try {
            const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE', headers: authHeaders() });
            if (!res.ok) throw new Error('Delete failed');
            await refreshTodos();
            toast.success('To-do deleted');
        } catch {
            toast.error('Could not delete the to-do');
        }
    };

    const createTodo = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST', headers: authHeaders(), body: JSON.stringify(todoForm),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not create the to-do');
            setCreating(false);
            setTodoForm({ title: '', description: '', dueDate: '', priority: 'MEDIUM' });
            await refreshTodos();
            toast.success('To-do added');
        } catch (e: any) {
            toast.error(e?.message || 'Could not create the to-do');
        } finally {
            setSaving(false);
        }
    };

    const tabs: { key: Surface; label: string; count: number; icon: typeof Folder }[] = [
        { key: 'projects', label: 'Projects', count: stagedProjects.length, icon: FolderKanban },
        { key: 'tasks', label: 'IT Tasks', count: stagedTasks.length, icon: ListTodo },
        { key: 'todos', label: 'To-Dos', count: stagedTodos.length, icon: CheckSquare },
        { key: 'tickets', label: 'Tickets', count: stagedTickets.length, icon: LifeBuoy },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-secondary-900 tracking-tight">My Work</h1>
                    <p className="text-secondary-500 font-medium mt-1">
                        Everything assigned to you — projects, IT tasks, personal to-dos and tickets — plus whatever you have running right now.
                    </p>
                </div>
                {surface === 'todos' && (
                    <button
                        onClick={() => setCreating(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 shadow-lg shadow-primary-500/20"
                    >
                        <Plus size={16} /> Add To-Do
                    </button>
                )}
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
                            ? surface === 'todos'
                                ? 'No to-dos yet — add one to get started.'
                                : `Nothing here yet — you're not on any ${surface} right now.`
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
                        <div key={t.id} className="card-premium p-5 flex flex-col lg:flex-row lg:items-center gap-5 hover:shadow-lg transition-all group">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">{t.taskCode}</span>
                                    <StartPill state={t.start} tone="light" />
                                </div>
                                <Link href={`/dashboard/it-management/tasks/${t.id}`} className="font-black text-secondary-900 truncate block hover:text-primary-600">
                                    {t.title}
                                </Link>
                                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-secondary-500">
                                    {t.project?.name && <span className="flex items-center gap-1"><FolderKanban size={11} /> {t.project.name}</span>}
                                    <span className="font-bold">{t.priority}</span>
                                    {t.dueDate && (
                                        <span className="flex items-center gap-1"><Calendar size={11} /> due {new Date(t.dueDate).toLocaleDateString()}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 mt-3">
                                    <div className="flex-1 h-2 bg-secondary-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${t.progressPercent === 100 ? 'bg-success-500' : 'bg-primary-600'}`}
                                            style={{ width: `${t.progressPercent ?? 0}%` }}
                                        />
                                    </div>
                                    <span className="text-[11px] font-black text-secondary-700 w-10 text-right">{t.progressPercent ?? 0}%</span>
                                </div>
                            </div>

                            {/* Inline status + progress, so the full board is not needed for a quick update. */}
                            <div className="flex flex-wrap items-end gap-3 shrink-0 lg:border-l border-secondary-100 lg:pl-5">
                                <label className="block">
                                    <span className="block text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Status</span>
                                    <select
                                        value={t.status}
                                        disabled={busyTaskId === t.id}
                                        onChange={(e) => patchTask(t.id, { status: e.target.value }, 'Status updated')}
                                        className="rounded-lg border border-secondary-200 px-3 py-2 text-xs font-bold text-secondary-700 focus:border-primary-500 outline-none disabled:opacity-50"
                                    >
                                        {TASK_STATUSES.map((s) => <option key={s} value={s}>{IT_TASK_STATUS_LABELS[s]}</option>)}
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="block text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Progress</span>
                                    <select
                                        value={Math.round((t.progressPercent ?? 0) / 5) * 5}
                                        disabled={busyTaskId === t.id}
                                        onChange={(e) => patchTask(t.id, { progressPercent: parseInt(e.target.value, 10) }, 'Progress updated')}
                                        className="rounded-lg border border-secondary-200 px-3 py-2 text-xs font-bold text-secondary-700 focus:border-primary-500 outline-none disabled:opacity-50"
                                    >
                                        {Array.from({ length: 21 }, (_, i) => i * 5).map((v) => <option key={v} value={v}>{v}%</option>)}
                                    </select>
                                </label>
                                <Link
                                    href={`/dashboard/it-management/tasks/${t.id}`}
                                    className="px-4 py-2 rounded-lg bg-secondary-900 text-white text-xs font-bold hover:bg-secondary-800"
                                >
                                    Open
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            ) : surface === 'todos' ? (
                <div className="space-y-3">
                    {visible.map((t: any) => {
                        const done = t.status === 'COMPLETED';
                        return (
                            <div key={t.id} className={`card-premium p-5 flex items-start gap-4 group transition-all ${done ? 'opacity-60' : 'hover:shadow-lg'}`}>
                                <button
                                    onClick={() => toggleTodo(t)}
                                    aria-label={done ? 'Mark as not done' : 'Mark as done'}
                                    className={`mt-0.5 w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                                        done ? 'bg-success-500 border-success-500 text-white' : 'border-secondary-300 hover:border-primary-500'
                                    }`}
                                >
                                    {done && <Check size={14} strokeWidth={3} />}
                                </button>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.MEDIUM}`}>
                                            {t.priority}
                                        </span>
                                        <StartPill state={t.start} tone="light" />
                                    </div>
                                    <h3 className={`font-black truncate ${done ? 'line-through text-secondary-400' : 'text-secondary-900'}`}>{t.title}</h3>
                                    {t.description && <p className="text-sm text-secondary-500 mt-1 line-clamp-2">{t.description}</p>}
                                    {t.dueDate && (
                                        <p className="flex items-center gap-1.5 mt-2 text-xs font-bold text-secondary-400">
                                            <Calendar size={12} /> Due {new Date(t.dueDate).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>

                                <button
                                    onClick={() => deleteTodo(t.id)}
                                    aria-label="Delete to-do"
                                    className="p-2 rounded-lg text-secondary-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        );
                    })}
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
                <Link href="/dashboard/it-management/tasks" className="hover:underline flex items-center gap-1">IT task board <ArrowRight size={12} /></Link>
                <Link href="/dashboard/support-desk" className="hover:underline flex items-center gap-1">Support desk <ArrowRight size={12} /></Link>
            </div>

            {/* ── NEW TO-DO ──────────────────────────────────────────────── */}
            {creating && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-secondary-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-secondary-900">Add a To-Do</h3>
                            <button onClick={() => setCreating(false)} className="p-2 rounded-lg hover:bg-secondary-100 text-secondary-400"><X size={18} /></button>
                        </div>
                        <form onSubmit={createTodo} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Title</label>
                                <input
                                    required value={todoForm.title}
                                    onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })}
                                    placeholder="e.g. Call Harvard about the renewal"
                                    className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Details</label>
                                <textarea
                                    rows={3} value={todoForm.description}
                                    onChange={(e) => setTodoForm({ ...todoForm, description: e.target.value })}
                                    placeholder="Anything you need to remember about it…"
                                    className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Due Date</label>
                                    <input
                                        required type="date" value={todoForm.dueDate}
                                        onChange={(e) => setTodoForm({ ...todoForm, dueDate: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Priority</label>
                                    <select
                                        value={todoForm.priority}
                                        onChange={(e) => setTodoForm({ ...todoForm, priority: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none"
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="URGENT">Urgent</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setCreating(false)} className="flex-1 px-4 py-2 rounded-lg border border-secondary-200 text-secondary-600 font-bold hover:bg-secondary-50">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 disabled:opacity-60">
                                    {saving ? 'Saving…' : 'Add To-Do'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
