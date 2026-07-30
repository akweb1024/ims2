'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Filter, FolderKanban, DollarSign,
    TrendingUp, CheckCircle2, AlertCircle, Pause, LayoutGrid, PieChart,
    ArrowUpRight, Target, ShieldCheck, Zap, Globe, Clock, ChevronDown,
    X, Users, Layers, Tag, Activity,
} from 'lucide-react';
import ProjectAnalytics from '@/components/dashboard/it/ProjectAnalytics';
import FleetAuditModal from '@/components/dashboard/it/FleetAuditModal';
import {
    LifecycleTabs, LifecycleHeading, StartPill, PeopleStack,
} from '@/components/dashboard/it/LifecycleUI';
import {
    projectLifecycle, lifecycleStart, LIFECYCLE_THEME,
    PROJECT_LIFECYCLES, PROJECT_LIFECYCLE_LABELS,
    type LifecycleKey, type StartState,
} from '@/lib/it/lifecycle';

/* ─── Types ───────────────────────────────────────────────── */
interface Personnel { id: string; name: string | null; email: string | null; }
interface TeamMember extends Personnel {
    role: 'Manager' | 'Lead' | 'Contributor' | 'Member';
    openTasks: number;
    doneTasks: number;
}
interface Project {
    id: string; projectCode: string; name: string; description: string | null;
    category: string; type: string; status: string; priority: string;
    isRevenueBased: boolean; estimatedRevenue: number; actualRevenue: number;
    itRevenueEarned: number; itDepartmentCut: number;
    startDate: string | null; endDate: string | null; completedAt: string | null;
    visibility: string;
    projectManager: Personnel | null;
    teamLead: Personnel | null;
    team?: TeamMember[];
    website?: { id: string; name: string; url: string; status: string } | null;
    stats: {
        totalTasks: number; completedTasks: number; inProgressTasks: number;
        completionRate: number; teamSize?: number; activeContributors?: number;
    };
}

/** A project plus the lifecycle facts derived from it, computed once per render pass. */
interface DecoratedProject extends Project {
    lifecycle: LifecycleKey;
    start: StartState;
    progress: number;
}

/* ─── Constants ───────────────────────────────────────────── */
const STATUS_CONFIG = {
    COMPLETED:   { icon: CheckCircle2, barColor: 'bg-emerald-400', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-300', badgeBorder: 'border-emerald-500/30', dot: 'bg-emerald-400',  accentBar: 'bg-emerald-500',  label: 'Completed',   accent: 'from-emerald-500/10' },
    IN_PROGRESS: { icon: TrendingUp,   barColor: 'bg-blue-400',    badgeBg: 'bg-blue-500/20',    badgeText: 'text-blue-300',    badgeBorder: 'border-blue-500/30',    dot: 'bg-blue-400',    accentBar: 'bg-blue-500',    label: 'In Progress', accent: 'from-blue-500/10' },
    ON_HOLD:     { icon: Pause,        barColor: 'bg-amber-400',   badgeBg: 'bg-amber-500/20',   badgeText: 'text-amber-300',   badgeBorder: 'border-amber-500/30',   dot: 'bg-amber-400',   accentBar: 'bg-amber-500',   label: 'On Hold',     accent: 'from-amber-500/10' },
    PLANNING:    { icon: Target,       barColor: 'bg-indigo-400',  badgeBg: 'bg-indigo-500/20',  badgeText: 'text-indigo-300',  badgeBorder: 'border-indigo-500/30',  dot: 'bg-indigo-400',  accentBar: 'bg-indigo-500',  label: 'Planning',    accent: 'from-indigo-500/10' },
    TESTING:     { icon: Zap,          barColor: 'bg-orange-400',  badgeBg: 'bg-orange-500/20',  badgeText: 'text-orange-300',  badgeBorder: 'border-orange-500/30',  dot: 'bg-orange-400',  accentBar: 'bg-orange-500',  label: 'Testing',     accent: 'from-orange-500/10' },
    CANCELLED:   { icon: X,            barColor: 'bg-rose-400',    badgeBg: 'bg-rose-500/20',    badgeText: 'text-rose-300',    badgeBorder: 'border-rose-500/30',    dot: 'bg-rose-400',    accentBar: 'bg-rose-500',    label: 'Cancelled',   accent: 'from-rose-500/10' },
    ARCHIVED:    { icon: AlertCircle,  barColor: 'bg-slate-400',   badgeBg: 'bg-slate-500/20',   badgeText: 'text-slate-300',   badgeBorder: 'border-slate-500/30',   dot: 'bg-slate-400',   accentBar: 'bg-slate-500',   label: 'Archived',    accent: 'from-slate-500/10' },
};

const PRIORITY_STYLES: Record<string, string> = {
    URGENT:   'bg-rose-500/20 text-rose-300 border-rose-500/30',
    HIGH:     'bg-orange-500/20 text-orange-300 border-orange-500/30',
    MEDIUM:   'bg-amber-500/20 text-amber-300 border-amber-500/30',
    LOW:      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const CATEGORY_LABELS: Record<string, string> = {
    DEVELOPMENT:    'Development',
    INFRASTRUCTURE: 'Infrastructure',
    SECURITY:       'Security',
    SUPPORT:        'Support',
    MAINTENANCE:    'Maintenance',
    UPGRADE:        'Upgrade',
    MIGRATION:      'Migration',
    TRAINING:       'Training',
    CONSULTING:     'Consulting',
    RESEARCH:       'Research',
};

const TYPE_OPTIONS: [string, string][] = [
    ['', 'All Types'],
    ['REVENUE',      'Revenue-Linked'],
    ['SUPPORT',      'Internal Support'],
    ['MAINTENANCE',  'Maintenance'],
    ['ENHANCEMENT',  'Enhancement'],
];

/* ─── Helpers ─────────────────────────────────────────────── */
function getUI(status: string) {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? {
        icon: AlertCircle, barColor: 'bg-slate-400',
        badgeBg: 'bg-slate-500/20', badgeText: 'text-slate-300',
        badgeBorder: 'border-slate-500/30', dot: 'bg-slate-400',
        accentBar: 'bg-slate-500', label: status, accent: 'from-slate-500/10',
    };
}

/** Everyone attached to the project, falling back to command personnel on older payloads. */
function rosterOf(p: Project): TeamMember[] {
    if (p.team?.length) return p.team;
    const fallback: TeamMember[] = [];
    if (p.projectManager) fallback.push({ ...p.projectManager, role: 'Manager', openTasks: 0, doneTasks: 0 });
    if (p.teamLead && p.teamLead.id !== p.projectManager?.id)
        fallback.push({ ...p.teamLead, role: 'Lead', openTasks: 0, doneTasks: 0 });
    return fallback;
}

/* ─── Filter Chip ─────────────────────────────────────────── */
function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
    return (
        <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 text-[11px] font-bold"
        >
            {label}
            <button onClick={onClear} className="hover:text-white transition-colors">
                <X className="h-3 w-3" />
            </button>
        </motion.span>
    );
}

/* ─── Project Card ────────────────────────────────────────── */
function ProjectCard({ p, index, onOpen }: { p: DecoratedProject; index: number; onOpen: () => void }) {
    const ui  = getUI(p.status);
    const pri = PRIORITY_STYLES[p.priority] ?? PRIORITY_STYLES.LOW;
    const catLabel = CATEGORY_LABELS[p.category] ?? p.category;
    const stage = LIFECYCLE_THEME[p.lifecycle];
    const roster = rosterOf(p);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index, 12) * 0.04 }}
            onClick={onOpen}
            className="group relative bg-slate-800/80 hover:bg-slate-800 border border-white/10 hover:border-white/20 rounded-2xl p-5 cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-2xl hover:shadow-black/40"
        >
            {/* Left colour accent bar — keyed to the lifecycle stage */}
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${stage.bar} opacity-40 group-hover:opacity-100 transition-all duration-300 rounded-l-2xl`} />

            {/* Top stripe glow on hover */}
            <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${ui.accent} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />

            {/* ── Card Header ── */}
            <div className="flex justify-between items-start mb-3 pl-3">
                <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 font-mono">{p.projectCode}</span>
                        <div className={`h-1.5 w-1.5 rounded-full ${ui.dot} animate-pulse`} />
                    </div>
                    <h3 className="text-sm font-black text-slate-100 leading-tight group-hover:text-blue-300 transition-colors line-clamp-1">
                        {p.name}
                    </h3>
                </div>
                <div className="p-1.5 bg-slate-700/60 rounded-lg group-hover:bg-blue-500/20 transition-colors ml-2 shrink-0">
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                </div>
            </div>

            {/* Kick-off state — does this project actually run right now? */}
            <div className="pl-3 mb-3">
                <StartPill state={p.start} />
            </div>

            {/* Description */}
            <p className="text-slate-400 text-xs font-medium line-clamp-2 mb-3 pl-3 min-h-[2.5rem] leading-relaxed">
                {p.description || 'No description provided.'}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mb-3 pl-3">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${ui.badgeBg} ${ui.badgeText} ${ui.badgeBorder}`}>
                    <ui.icon className="h-2.5 w-2.5" /> {ui.label}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border bg-slate-700/60 text-slate-300 border-white/10">
                    <Layers className="h-2.5 w-2.5" /> {catLabel}
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${pri}`}>
                    {p.priority}
                </span>
                {p.visibility === 'PUBLIC' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border bg-blue-500/10 text-blue-400 border-blue-500/20">
                        <Globe className="h-2.5 w-2.5" /> Public
                    </span>
                )}
                {p.isRevenueBased && (
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <DollarSign className="h-2.5 w-2.5" /> Revenue
                    </span>
                )}
                {p.website && (
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1 ${p.website.status === 'UP' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
                        <Globe className="h-2.5 w-2.5" /> {p.website.status}
                    </span>
                )}
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5 mb-4 pl-3">
                <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-500">Progress</span>
                    <span className={stage.dark.text}>{p.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-700/80 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${p.progress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: Math.min(index, 12) * 0.04 + 0.2 }}
                        className={`h-full rounded-full ${p.progress === 100 ? 'bg-emerald-400' : stage.bar}`}
                    />
                </div>
                <div className="flex justify-between text-[10px] font-medium text-slate-600">
                    <span>{p.stats.completedTasks} done</span>
                    <span>{p.stats.totalTasks} total tasks</span>
                </div>
            </div>

            {/* Footer: who is on it + deadline */}
            <div className="pt-3 border-t border-white/[0.07] flex items-center justify-between gap-3 pl-3">
                <PeopleStack people={roster.map(m => ({
                    id: m.id,
                    name: m.name,
                    email: m.email,
                    role: m.role,
                    note: m.openTasks || m.doneTasks ? `${m.openTasks} open · ${m.doneTasks} done` : null,
                }))} caption="on it" />
                <div className="flex items-center gap-1 text-slate-600 shrink-0">
                    <Clock className="h-3 w-3" />
                    <span className="text-[10px] font-semibold">
                        {p.endDate
                            ? new Date(p.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                            : 'Ongoing'}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

/* ═══ Main Component ════════════════════════════════════════ */
export default function ProjectsPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [projects, setProjects]           = useState<Project[]>([]);
    const [loading, setLoading]             = useState(true);
    const [searchTerm, setSearchTerm]       = useState('');
    const [statusFilter, setStatusFilter]   = useState('');
    const [typeFilter, setTypeFilter]       = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [personnelFilter, setPersonnelFilter] = useState(''); // managerId
    const [stage, setStage]                 = useState<LifecycleKey | 'ALL'>('ALL');
    const [showFilters, setShowFilters]     = useState(false);
    const [viewMode, setViewMode]           = useState<'grid' | 'analytics'>('grid');
    const [showFleetAudit, setShowFleetAudit] = useState(false);

    /* ── Fetch ─────────────────────────────────────────────── */
    const fetchProjects = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter)    params.append('status',    statusFilter);
            if (typeFilter)      params.append('type',      typeFilter);
            if (categoryFilter)  params.append('category',  categoryFilter);
            if (personnelFilter) params.append('managerId', personnelFilter);
            const res = await fetch(`/api/it/projects?${params.toString()}`);
            if (res.ok) setProjects(await res.json());
        } catch (e) {
            console.error('Failed to fetch projects:', e);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, typeFilter, categoryFilter, personnelFilter]);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    /* ── Derived data ──────────────────────────────────────── */
    // Search + lifecycle decoration in one pass; everything below reads these.
    const searched = useMemo<DecoratedProject[]>(() => {
        const q = searchTerm.toLowerCase();
        return projects
            .filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.projectCode.toLowerCase().includes(q) ||
                (p.description ?? '').toLowerCase().includes(q)
            )
            .map(p => {
                const lifecycle = projectLifecycle(p.status);
                return {
                    ...p,
                    lifecycle,
                    start: lifecycleStart({
                        lifecycle,
                        startDate: p.startDate,
                        dueDate: p.endDate,
                        completedAt: p.completedAt,
                    }),
                    // A finished project with no task breakdown still reads as delivered.
                    progress: p.stats.totalTasks > 0
                        ? p.stats.completionRate
                        : lifecycle === 'COMPLETED' ? 100 : 0,
                };
            });
    }, [projects, searchTerm]);

    const stageCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        searched.forEach(p => { counts[p.lifecycle] = (counts[p.lifecycle] ?? 0) + 1; });
        return counts;
    }, [searched]);

    const visible = useMemo(
        () => (stage === 'ALL' ? searched : searched.filter(p => p.lifecycle === stage)),
        [searched, stage],
    );

    // When no single stage is selected, the grid becomes one section per stage.
    const grouped = useMemo(
        () => PROJECT_LIFECYCLES
            .map(key => ({ key, items: searched.filter(p => p.lifecycle === key) }))
            .filter(g => g.items.length > 0),
        [searched],
    );

    // Build unique personnel list from fetched project data
    const personnel = useMemo(() => {
        const map = new Map<string, Personnel>();
        projects.forEach(p => {
            if (p.projectManager) map.set(p.projectManager.id, p.projectManager);
            if (p.teamLead)       map.set(p.teamLead.id, p.teamLead);
        });
        return [...map.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [projects]);

    // Distinct people holding work across everything currently in view.
    const crewSize = useMemo(() => {
        const ids = new Set<string>();
        searched.forEach(p => rosterOf(p).forEach(m => ids.add(m.id)));
        return ids.size;
    }, [searched]);

    const runningCount   = stageCounts.RUNNING   ?? 0;
    const upcomingCount  = stageCounts.UPCOMING  ?? 0;
    const completedCount = stageCounts.COMPLETED ?? 0;
    const failedCount    = stageCounts.FAILED    ?? 0;
    const totalRevenue   = projects.reduce((s, p) => s + (p.itRevenueEarned || 0), 0);
    const notStarted     = searched.filter(p => !p.start.started && p.lifecycle !== 'FAILED' && p.lifecycle !== 'ARCHIVED').length;
    const lateCount      = searched.filter(p => p.start.tone === 'late').length;

    const isAdmin = (session?.user as any)?.role &&
        ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_MANAGER', 'IT_ADMIN', 'TEAM_LEADER', 'HR_MANAGER', 'FINANCE_ADMIN'].includes((session?.user as any)?.role);

    // Active filters for chip display
    const activeFilters: { key: string; label: string; clear: () => void }[] = [
        ...(statusFilter    ? [{ key: 'status',    label: STATUS_CONFIG[statusFilter as keyof typeof STATUS_CONFIG]?.label ?? statusFilter, clear: () => setStatusFilter('') }]    : []),
        ...(categoryFilter  ? [{ key: 'category',  label: CATEGORY_LABELS[categoryFilter] ?? categoryFilter,  clear: () => setCategoryFilter('') }]  : []),
        ...(typeFilter      ? [{ key: 'type',      label: TYPE_OPTIONS.find(t => t[0] === typeFilter)?.[1] ?? typeFilter, clear: () => setTypeFilter('') }]      : []),
        ...(personnelFilter ? [{ key: 'personnel', label: personnel.find(p => p.id === personnelFilter)?.name ?? 'Personnel', clear: () => setPersonnelFilter('') }] : []),
    ];

    const hasActiveFilters = activeFilters.length > 0;

    const clearAllFilters = () => {
        setStatusFilter('');
        setTypeFilter('');
        setCategoryFilter('');
        setPersonnelFilter('');
    };

    /* ── Filter dropdown config ────────────────────────────── */
    const filterGroups = [
        {
            key:     'personnel',
            label:   'Command Personnel',
            icon:    Users,
            value:   personnelFilter,
            setter:  setPersonnelFilter,
            options: [
                ['', 'All Personnel'],
                ...personnel.map(p => [p.id, p.name || p.email || 'Unknown'] as [string, string]),
            ] as [string, string][],
        },
        {
            key:     'category',
            label:   'Core Category',
            icon:    Layers,
            value:   categoryFilter,
            setter:  setCategoryFilter,
            options: [
                ['', 'All Categories'],
                ...Object.entries(CATEGORY_LABELS),
            ] as [string, string][],
        },
        {
            key:     'status',
            label:   'Exact Status',
            icon:    Activity,
            value:   statusFilter,
            setter:  setStatusFilter,
            options: [
                ['', 'All Statuses'],
                ...Object.entries(STATUS_CONFIG).map(([v, c]) => [v, c.label]),
            ] as [string, string][],
        },
        {
            key:     'type',
            label:   'Type',
            icon:    Tag,
            value:   typeFilter,
            setter:  setTypeFilter,
            options: TYPE_OPTIONS,
        },
    ];

    /* ══════════════════════════════════════════════════════ */
    return (
        <>
            <div className="min-h-screen pb-24 space-y-5">

                {/* ── HEADER ───────────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-2xl overflow-hidden border border-white/10"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-blue-900/60 to-slate-800" />
                    <div className="absolute inset-0"
                        style={{ backgroundImage: 'radial-gradient(ellipse at 10% 50%, rgba(59,130,246,0.25) 0%, transparent 60%)' }} />
                    {/* subtle grid */}
                    <div className="absolute inset-0 opacity-[0.03]"
                        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                    <div className="relative px-8 py-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-500/30 border border-blue-500/40 rounded-xl shadow-lg shadow-blue-500/20">
                                    <FolderKanban className="h-5 w-5 text-blue-300" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-white tracking-tight">Project Forge</h1>
                                    <p className="text-slate-400 text-xs font-medium">IT mission control &amp; project management</p>
                                </div>
                            </div>
                            {!loading && (
                                <div className="flex flex-wrap items-center gap-2">
                                    {[
                                        { val: projects.length,  label: 'Total',     color: 'bg-slate-700/80 text-slate-200 border border-white/10' },
                                        { val: runningCount,     label: 'Running',   color: 'bg-blue-500/20 text-blue-200 border border-blue-500/30' },
                                        { val: upcomingCount,    label: 'Upcoming',  color: 'bg-violet-500/20 text-violet-200 border border-violet-500/30' },
                                        { val: completedCount,   label: 'Completed', color: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' },
                                        { val: failedCount,      label: 'Failed',    color: 'bg-rose-500/20 text-rose-200 border border-rose-500/30' },
                                        { val: crewSize,         label: 'People',    color: 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30' },
                                        { val: `₹${(totalRevenue / 1000).toFixed(1)}K`, label: 'Revenue', color: 'bg-amber-500/20 text-amber-200 border border-amber-500/30' },
                                    ].map(s => (
                                        <span key={s.label} className={`px-3 py-1 rounded-xl text-xs font-bold ${s.color}`}>
                                            {s.val} {s.label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex bg-slate-700/60 border border-white/10 p-1 rounded-xl gap-1">
                                <button onClick={() => setViewMode('grid')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}>
                                    <LayoutGrid className="h-3.5 w-3.5" /> Grid
                                </button>
                                <button onClick={() => setViewMode('analytics')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'analytics' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}>
                                    <PieChart className="h-3.5 w-3.5" /> Analytics
                                </button>
                            </div>
                            {isAdmin && (
                                <>
                                    <button onClick={() => router.push('/dashboard/it-management/projects/new')}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                                        <Plus className="h-4 w-4" /> New Project
                                    </button>
                                    <button onClick={() => setShowFleetAudit(true)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/60 border border-white/10 text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-600/80 transition-all">
                                        <ShieldCheck className="h-4 w-4 text-blue-400" /> Audit
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* ── LIFECYCLE STAGES ─────────────────────────────── */}
                {viewMode === 'grid' && !loading && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <LifecycleTabs
                            value={stage}
                            onChange={setStage}
                            stages={PROJECT_LIFECYCLES}
                            counts={stageCounts}
                            total={searched.length}
                            labels={PROJECT_LIFECYCLE_LABELS}
                            allLabel="All Stages"
                        />
                        {(notStarted > 0 || lateCount > 0) && (
                            <div className="flex flex-wrap items-center gap-2 px-1">
                                {lateCount > 0 && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950/70 border border-rose-500/30 text-rose-300 text-[10px] font-bold uppercase tracking-widest">
                                        <AlertCircle className="h-3 w-3" /> {lateCount} behind schedule
                                    </span>
                                )}
                                {notStarted > 0 && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 border border-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-widest">
                                        <Clock className="h-3 w-3" /> {notStarted} not started yet
                                    </span>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ── SEARCH & FILTER PANEL ─────────────────────────── */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                    className="bg-slate-800/70 backdrop-blur border border-white/10 rounded-2xl overflow-hidden"
                >
                    {/* Search row */}
                    <div className="p-4 flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search by name, code or description..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-700/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 focus:bg-slate-700/80 transition-all"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-bold transition-all relative ${
                                showFilters
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                                    : 'bg-slate-700/50 border-white/10 text-slate-300 hover:text-white hover:bg-slate-700'
                            }`}
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                            {hasActiveFilters && (
                                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-blue-400 text-slate-900 rounded-full text-[9px] font-black flex items-center justify-center">
                                    {activeFilters.length}
                                </span>
                            )}
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* 4-filter expanded panel */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden border-t border-white/[0.08]"
                            >
                                <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                                    {filterGroups.map(f => (
                                        <div key={f.key} className="space-y-1.5">
                                            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                                <f.icon className="h-3 w-3" />
                                                {f.label}
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={f.value}
                                                    onChange={e => f.setter(e.target.value)}
                                                    title={f.label}
                                                    className={`w-full appearance-none bg-slate-700/60 border rounded-xl px-3 py-2.5 pr-8 text-sm font-medium text-white focus:outline-none transition-all ${
                                                        f.value
                                                            ? 'border-blue-500/50 bg-blue-500/10'
                                                            : 'border-white/10 focus:border-blue-500/50'
                                                    }`}
                                                >
                                                    {f.options.map(([val, lbl]) => (
                                                        <option key={val} value={val} className="bg-slate-800">{lbl}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Active filter chips */}
                                <AnimatePresence>
                                    {hasActiveFilters && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            className="px-4 pb-4 flex flex-wrap items-center gap-2"
                                        >
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Active:</span>
                                            {activeFilters.map(f => (
                                                <FilterChip key={f.key} label={f.label} onClear={f.clear} />
                                            ))}
                                            <button
                                                onClick={clearAllFilters}
                                                className="text-[11px] font-bold text-slate-500 hover:text-rose-400 transition-colors ml-1 underline underline-offset-2"
                                            >
                                                Clear All
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* ── CONTENT ──────────────────────────────────────── */}
                <AnimatePresence mode="wait">
                    {viewMode === 'analytics' ? (
                        <motion.div key="analytics" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                            <ProjectAnalytics projects={searched} />
                        </motion.div>

                    ) : loading ? (
                        <div key="loading" className="py-32 flex flex-col items-center gap-4">
                            <div className="relative h-12 w-12">
                                <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />
                                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading projects...</p>
                        </div>

                    ) : visible.length === 0 ? (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="py-24 flex flex-col items-center text-center"
                        >
                            <div className="p-10 bg-slate-800/80 border border-white/10 rounded-3xl max-w-md space-y-6">
                                <div className="h-20 w-20 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto">
                                    <FolderKanban className="h-10 w-10 text-blue-400" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-white">No Projects Found</h3>
                                    <p className="text-slate-400 text-sm">
                                        {stage === 'ALL'
                                            ? 'Try adjusting your filters or create a new project.'
                                            : 'Nothing sits in this stage right now.'}
                                    </p>
                                </div>
                                {stage !== 'ALL' && (
                                    <button onClick={() => setStage('ALL')}
                                        className="px-6 py-2.5 bg-slate-700 text-slate-200 font-bold text-sm rounded-xl hover:bg-slate-600 transition-all border border-white/10">
                                        Show All Stages
                                    </button>
                                )}
                                {hasActiveFilters && (
                                    <button onClick={clearAllFilters}
                                        className="px-6 py-2.5 bg-slate-700 text-slate-200 font-bold text-sm rounded-xl hover:bg-slate-600 transition-all border border-white/10">
                                        Clear Filters
                                    </button>
                                )}
                                {isAdmin && (
                                    <button
                                        onClick={() => router.push('/dashboard/it-management/projects/new')}
                                        className="px-8 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/25"
                                    >
                                        Create First Project
                                    </button>
                                )}
                            </div>
                        </motion.div>

                    ) : stage === 'ALL' ? (
                        /* Grouped: one section per lifecycle stage, active work first */
                        <motion.div key="grouped" className="space-y-8">
                            {grouped.map(group => (
                                <section key={group.key} className="space-y-4">
                                    <LifecycleHeading
                                        stage={group.key}
                                        count={group.items.length}
                                        labels={PROJECT_LIFECYCLE_LABELS}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                        {group.items.map((p, idx) => (
                                            <ProjectCard key={p.id} p={p} index={idx}
                                                onOpen={() => router.push(`/dashboard/it-management/projects/${p.id}`)} />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </motion.div>

                    ) : (
                        <motion.div key="grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {visible.map((p, idx) => (
                                <ProjectCard key={p.id} p={p} index={idx}
                                    onOpen={() => router.push(`/dashboard/it-management/projects/${p.id}`)} />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── BOTTOM STATS BAR ─────────────────────────────── */}
                {!loading && visible.length > 0 && viewMode === 'grid' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 p-6 bg-slate-800/70 border border-white/10 rounded-2xl"
                    >
                        {[
                            { val: visible.length,   label: 'Showing',    color: 'text-white',        bg: 'bg-slate-700/60' },
                            { val: runningCount,     label: 'Running',    color: 'text-blue-400',     bg: 'bg-blue-500/10' },
                            { val: upcomingCount,    label: 'Upcoming',   color: 'text-violet-400',   bg: 'bg-violet-500/10' },
                            { val: completedCount,   label: 'Completed',  color: 'text-emerald-400',  bg: 'bg-emerald-500/10' },
                            { val: failedCount,      label: 'Failed',     color: 'text-rose-400',     bg: 'bg-rose-500/10' },
                            { val: `₹${(totalRevenue / 1000).toFixed(1)}K`, label: 'IT Revenue', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                        ].map(s => (
                            <div key={s.label} className={`text-center space-y-1 py-3 rounded-xl ${s.bg}`}>
                                <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
                            </div>
                        ))}
                    </motion.div>
                )}

                <FleetAuditModal isOpen={showFleetAudit} onClose={() => setShowFleetAudit(false)} projects={projects} />
            </div>
        </>
    );
}
