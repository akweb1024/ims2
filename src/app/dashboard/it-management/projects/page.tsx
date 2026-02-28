'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    Plus, Search, Filter, FolderKanban, Calendar, DollarSign,
    TrendingUp, CheckCircle2, AlertCircle, Pause, LayoutGrid, PieChart,
    ArrowUpRight, Target, ShieldCheck, Zap, Globe, Clock, ChevronDown
} from 'lucide-react';
import ProjectAnalytics from '@/components/dashboard/it/ProjectAnalytics';
import FleetAuditModal from '@/components/dashboard/it/FleetAuditModal';

interface Project {
    id: string; projectCode: string; name: string; description: string | null;
    category: string; type: string; status: string; priority: string;
    isRevenueBased: boolean; estimatedRevenue: number; actualRevenue: number;
    itRevenueEarned: number; itDepartmentCut: number; startDate: string | null;
    endDate: string | null;
    visibility: string;
    projectManager: { id: string; name: string; email: string; } | null;
    teamLead: { id: string; name: string; email: string; } | null;
    website?: { id: string; name: string; url: string; status: string } | null;
    stats: { totalTasks: number; completedTasks: number; inProgressTasks: number; completionRate: number; };
}

const STATUS_CONFIG = {
    COMPLETED: { icon: CheckCircle2, barColor: 'bg-emerald-400', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-300', badgeBorder: 'border-emerald-500/30', dot: 'bg-emerald-400', label: 'Completed', accent: 'from-emerald-500/10' },
    IN_PROGRESS: { icon: TrendingUp,  barColor: 'bg-blue-400',   badgeBg: 'bg-blue-500/20',   badgeText: 'text-blue-300',   badgeBorder: 'border-blue-500/30',   dot: 'bg-blue-400',   label: 'In Progress', accent: 'from-blue-500/10' },
    ON_HOLD:    { icon: Pause,        barColor: 'bg-amber-400',  badgeBg: 'bg-amber-500/20',  badgeText: 'text-amber-300',  badgeBorder: 'border-amber-500/30',  dot: 'bg-amber-400',  label: 'On Hold',     accent: 'from-amber-500/10' },
    PLANNING:   { icon: Target,       barColor: 'bg-violet-400', badgeBg: 'bg-violet-500/20', badgeText: 'text-violet-300', badgeBorder: 'border-violet-500/30', dot: 'bg-violet-400', label: 'Planning',    accent: 'from-violet-500/10' },
    TESTING:    { icon: Zap,          barColor: 'bg-orange-400', badgeBg: 'bg-orange-500/20', badgeText: 'text-orange-300', badgeBorder: 'border-orange-500/30', dot: 'bg-orange-400', label: 'Testing',     accent: 'from-orange-500/10' },
};

const PRIORITY_STYLES: Record<string, string> = {
    CRITICAL: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    HIGH:     'bg-orange-500/20 text-orange-300 border-orange-500/30',
    MEDIUM:   'bg-amber-500/20 text-amber-300 border-amber-500/30',
    LOW:      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

import { useSession } from 'next-auth/react';

export default function ProjectsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [projects, setProjects]       = useState<Project[]>([]);
    const [loading, setLoading]         = useState(true);
    const [searchTerm, setSearchTerm]   = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter]   = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode]       = useState<'grid' | 'analytics'>('grid');
    const [showFleetAudit, setShowFleetAudit] = useState(false);

    const fetchProjects = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (typeFilter)   params.append('type', typeFilter);
            const res = await fetch(`/api/it/projects?${params.toString()}`);
            if (res.ok) setProjects(await res.json());
        } catch (e) {
            console.error('Failed to fetch projects:', e);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, typeFilter]);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    const filtered = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getUI = (status: string) =>
        STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? {
            icon: AlertCircle, barColor: 'bg-slate-400',
            badgeBg: 'bg-slate-500/20', badgeText: 'text-slate-300',
            badgeBorder: 'border-slate-500/30', dot: 'bg-slate-400',
            label: status, accent: 'from-slate-500/10'
        };

    const activeCount    = projects.filter(p => p.status === 'IN_PROGRESS').length;
    const completedCount = projects.filter(p => p.status === 'COMPLETED').length;
    const totalRevenue   = projects.reduce((s, p) => s + (p.itRevenueEarned || 0), 0);

    return (
        <DashboardLayout>
            <div className="min-h-screen pb-24 space-y-6">

                {/* ── HEADER ─────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-2xl overflow-hidden border border-white/10"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-blue-900/60 to-slate-800" />
                    <div className="absolute inset-0"
                        style={{ backgroundImage: 'radial-gradient(ellipse at 10% 50%, rgba(59,130,246,0.25) 0%, transparent 60%)' }} />

                    <div className="relative px-8 py-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-500/30 border border-blue-500/40 rounded-xl">
                                    <FolderKanban className="h-5 w-5 text-blue-300" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-white tracking-tight">Project Forge</h1>
                                    <p className="text-slate-400 text-xs font-medium">IT mission control & project management</p>
                                </div>
                            </div>
                            {!loading && (
                                <div className="flex flex-wrap items-center gap-3">
                                    {[
                                        { val: projects.length,   label: 'Total',     color: 'bg-slate-700 text-slate-200' },
                                        { val: activeCount,       label: 'Active',    color: 'bg-blue-500/30 text-blue-200' },
                                        { val: completedCount,    label: 'Completed', color: 'bg-emerald-500/30 text-emerald-200' },
                                        { val: `₹${(totalRevenue / 1000).toFixed(1)}K`, label: 'Revenue', color: 'bg-amber-500/30 text-amber-200' },
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
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                                    <LayoutGrid className="h-3.5 w-3.5" /> Grid
                                </button>
                                <button onClick={() => setViewMode('analytics')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'analytics' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                                    <PieChart className="h-3.5 w-3.5" /> Analytics
                                </button>
                            </div>
                            {(session?.user as any)?.role && ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_MANAGER', 'IT_ADMIN'].includes((session?.user as any)?.role) && (
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

                {/* ── SEARCH & FILTER ─────────────────── */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                    className="bg-slate-800/70 backdrop-blur border border-white/10 rounded-2xl overflow-hidden"
                >
                    <div className="p-4 flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search by name, code or description..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-700/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 focus:bg-slate-700 transition-all"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                                showFilters
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'bg-slate-700/50 border-white/10 text-slate-300 hover:text-white hover:bg-slate-700'
                            }`}
                        >
                            <Filter className="h-4 w-4" /> Filters
                            {(statusFilter || typeFilter) && <span className="h-2 w-2 rounded-full bg-blue-300" />}
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    <AnimatePresence>
                        {showFilters && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t border-white/10"
                            >
                                <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        {
                                            label: 'Status', value: statusFilter, setter: setStatusFilter,
                                            options: [['', 'All Statuses'], ...Object.entries(STATUS_CONFIG).map(([v,c]) => [v, c.label])]
                                        },
                                        {
                                            label: 'Type', value: typeFilter, setter: setTypeFilter,
                                            options: [['', 'All Types'], ['REVENUE', 'Revenue-Linked'], ['SUPPORT', 'Internal Support'], ['MAINTENANCE', 'Maintenance'], ['ENHANCEMENT', 'Enhancement']]
                                        }
                                    ].map(f => (
                                        <div key={f.label} className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{f.label}</label>
                                            <select
                                                value={f.value}
                                                onChange={e => f.setter(e.target.value)}
                                                className="w-full bg-slate-700/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-blue-500/50"
                                                title={f.label}
                                            >
                                                {f.options.map(([val, lbl]) => (
                                                    <option key={val} value={val} className="bg-slate-800">{lbl}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* ── CONTENT ─────────────────────────── */}
                <AnimatePresence mode="wait">
                    {viewMode === 'analytics' ? (
                        <motion.div key="analytics" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                            <ProjectAnalytics projects={filtered} />
                        </motion.div>

                    ) : loading ? (
                        <div key="loading" className="py-32 flex flex-col items-center gap-4">
                            <div className="h-10 w-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading projects...</p>
                        </div>

                    ) : filtered.length === 0 ? (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="py-24 flex flex-col items-center text-center"
                        >
                            <div className="p-10 bg-slate-800/80 border border-white/10 rounded-3xl max-w-md space-y-6">
                                <div className="h-20 w-20 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto">
                                    <FolderKanban className="h-10 w-10 text-blue-400" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-white">No Projects Found</h3>
                                    <p className="text-slate-400 text-sm">Try adjusting filters or create a new project.</p>
                                </div>
                                <button
                                    onClick={() => router.push('/dashboard/it-management/projects/new')}
                                    className="px-8 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/25"
                                >
                                    Create First Project
                                </button>
                            </div>
                        </motion.div>

                    ) : (
                        <motion.div key="grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {filtered.map((p, idx) => {
                                const ui  = getUI(p.status);
                                const pri = PRIORITY_STYLES[p.priority] ?? PRIORITY_STYLES.LOW;

                                return (
                                    <motion.div
                                        key={p.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.04 }}
                                        onClick={() => router.push(`/dashboard/it-management/projects/${p.id}`)}
                                        className="group relative bg-slate-800/80 hover:bg-slate-800 border border-white/10 hover:border-white/20 rounded-2xl p-5 cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-black/30"
                                    >
                                        {/* Top colour stripe */}
                                        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${ui.accent} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                                        
                                        {/* Left accent bar */}
                                        <div className={`absolute left-0 top-4 bottom-4 w-0.5 rounded-full ${ui.dot} opacity-40 group-hover:opacity-100 transition-opacity`} />

                                        {/* ── Card Header ── */}
                                        <div className="flex justify-between items-start mb-4 pl-3">
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

                                        {/* Description */}
                                        <p className="text-slate-400 text-xs font-medium line-clamp-2 mb-4 pl-3 min-h-[2.5rem] leading-relaxed">
                                            {p.description || 'No description provided for this project.'}
                                        </p>

                                        {/* Badges */}
                                        <div className="flex flex-wrap gap-1.5 mb-4 pl-3">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${ui.badgeBg} ${ui.badgeText} ${ui.badgeBorder}`}>
                                                <ui.icon className="h-2.5 w-2.5" /> {ui.label}
                                            </span>
                                            {p.visibility === 'PUBLIC' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                    <Globe className="h-2.5 w-2.5" /> Public
                                                </span>
                                            )}
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${pri}`}>
                                                {p.priority}
                                            </span>
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

                                        {/* Progress */}
                                        <div className="space-y-1.5 mb-4 pl-3">
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span className="text-slate-500">Progress</span>
                                                <span className={ui.badgeText}>{p.stats.completionRate}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${p.stats.completionRate}%` }}
                                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                                    className={`h-full rounded-full ${p.stats.completionRate === 100 ? 'bg-emerald-400' : ui.barColor}`}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[10px] font-medium text-slate-600">
                                                <span>{p.stats.completedTasks} done</span>
                                                <span>{p.stats.totalTasks} total tasks</span>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="pt-3 border-t border-white/[0.07] flex items-center justify-between pl-3">
                                            <div className="flex items-center gap-2">
                                                {p.projectManager && (
                                                    <>
                                                        <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                                                            {p.projectManager.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[80px]">
                                                            {p.projectManager.name.split(' ')[0]}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 text-slate-600">
                                                <Clock className="h-3 w-3" />
                                                <span className="text-[10px] font-semibold">
                                                    {p.endDate ? new Date(p.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Ongoing'}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── FOOTER STATS ────────────────────── */}
                {!loading && filtered.length > 0 && viewMode === 'grid' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-800/70 border border-white/10 rounded-2xl"
                    >
                        {[
                            { val: filtered.length, label: 'Total Projects', color: 'text-white' },
                            { val: activeCount,      label: 'Active',         color: 'text-blue-400' },
                            { val: completedCount,   label: 'Completed',      color: 'text-emerald-400' },
                            { val: `₹${(totalRevenue / 1000).toFixed(1)}K`, label: 'IT Revenue', color: 'text-amber-400' },
                        ].map(s => (
                            <div key={s.label} className="text-center space-y-1">
                                <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
                            </div>
                        ))}
                    </motion.div>
                )}

                <FleetAuditModal isOpen={showFleetAudit} onClose={() => setShowFleetAudit(false)} projects={projects} />
            </div>
        </DashboardLayout>
    );
}
