'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    Plus, Search, Filter, FolderKanban, Calendar, DollarSign, Users, Clock,
    TrendingUp, CheckCircle2, AlertCircle, Pause, LayoutGrid, PieChart, ChevronRight,
    ArrowUpRight, Target, ShieldCheck, Zap, Globe, X
} from 'lucide-react';
import ProjectAnalytics from '@/components/dashboard/it/ProjectAnalytics';
import FleetAuditModal from '@/components/dashboard/it/FleetAuditModal';

interface Project {
    id: string; projectCode: string; name: string; description: string | null;
    category: string; type: string; status: string; priority: string;
    isRevenueBased: boolean; estimatedRevenue: number; actualRevenue: number;
    itRevenueEarned: number; itDepartmentCut: number; startDate: string | null;
    endDate: string | null;
    projectManager: { id: string; name: string; email: string; } | null;
    teamLead: { id: string; name: string; email: string; } | null;
    website?: { id: string; name: string; url: string; status: string } | null;
    stats: { totalTasks: number; completedTasks: number; inProgressTasks: number; completionRate: number; };
}

const STATUS_CONFIG = {
    COMPLETED: { icon: CheckCircle2, bg: 'bg-emerald-500/10', dot: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'Completed', glow: 'shadow-emerald-500/10' },
    IN_PROGRESS: { icon: TrendingUp, bg: 'bg-blue-500/10', dot: 'bg-blue-400', text: 'text-blue-400', border: 'border-blue-500/20', label: 'In Progress', glow: 'shadow-blue-500/10' },
    ON_HOLD: { icon: Pause, bg: 'bg-amber-500/10', dot: 'bg-amber-400', text: 'text-amber-400', border: 'border-amber-500/20', label: 'On Hold', glow: 'shadow-amber-500/10' },
    PLANNING: { icon: Target, bg: 'bg-violet-500/10', dot: 'bg-violet-400', text: 'text-violet-400', border: 'border-violet-500/20', label: 'Planning', glow: 'shadow-violet-500/10' },
    TESTING: { icon: Zap, bg: 'bg-orange-500/10', dot: 'bg-orange-400', text: 'text-orange-400', border: 'border-orange-500/20', label: 'Testing', glow: 'shadow-orange-500/10' },
};

const PRIORITY_BADGE: Record<string, string> = {
    CRITICAL: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

export default function ProjectsPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'analytics'>('grid');
    const [showFleetAudit, setShowFleetAudit] = useState(false);

    const fetchProjects = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (typeFilter) params.append('type', typeFilter);
            const response = await fetch(`/api/it/projects?${params.toString()}`);
            if (response.ok) setProjects(await response.json());
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, typeFilter]);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    const filteredProjects = projects.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusUI = (status: string) =>
        STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ||
        { icon: AlertCircle, bg: 'bg-slate-500/10', dot: 'bg-slate-400', text: 'text-slate-400', border: 'border-slate-500/20', label: status, glow: '' };

    const activeCount = projects.filter(p => p.status === 'IN_PROGRESS').length;
    const completedCount = projects.filter(p => p.status === 'COMPLETED').length;
    const totalRevenue = projects.reduce((s, p) => s + p.itRevenueEarned, 0);

    return (
        <DashboardLayout>
            <div className="min-h-screen pb-24 space-y-8">

                {/* ── HEADER BANNER ──────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-2xl overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
                    <div className="absolute inset-0 opacity-20"
                        style={{ backgroundImage: 'radial-gradient(ellipse at 10% 50%, rgba(59,130,246,0.5) 0%, transparent 60%)' }} />

                    <div className="relative p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-500/20 border border-blue-500/30 rounded-xl">
                                    <FolderKanban className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-white tracking-tight">Project Forge</h1>
                                    <p className="text-slate-400 text-sm font-medium">Engineering excellence through structured IT mission management.</p>
                                </div>
                            </div>
                            {/* Mini stats */}
                            {!loading && (
                                <div className="flex items-center gap-4 pt-1">
                                    {[
                                        { label: `${projects.length} Missions`, color: 'text-slate-400' },
                                        { label: `${activeCount} Active`, color: 'text-blue-400' },
                                        { label: `${completedCount} Done`, color: 'text-emerald-400' },
                                        { label: `₹${(totalRevenue / 1000).toFixed(1)}K Revenue`, color: 'text-amber-400' },
                                    ].map((s, i) => (
                                        <span key={i} className={`text-[11px] font-black uppercase tracking-widest ${s.color}`}>
                                            {s.label}{i < 3 && <span className="ml-4 text-slate-700">·</span>}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl gap-1">
                                <button onClick={() => setViewMode('grid')}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                                    <LayoutGrid className="h-3.5 w-3.5" /> Grid
                                </button>
                                <button onClick={() => setViewMode('analytics')}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${viewMode === 'analytics' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                                    <PieChart className="h-3.5 w-3.5" /> Analytics
                                </button>
                            </div>
                            <button onClick={() => router.push('/dashboard/it-management/projects/new')}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-500/25 transition-all active:scale-95">
                                <Plus className="h-4 w-4" /> New Mission
                            </button>
                            <button onClick={() => setShowFleetAudit(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all">
                                <ShieldCheck className="h-4 w-4 text-blue-400" /> Audit
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* ── SEARCH & FILTERS ───────────────────────── */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                    className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
                >
                    <div className="p-5 flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input type="text" placeholder="Search missions by name, code or description..."
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors" />
                        </div>
                        <button onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${showFilters ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                            <Filter className="h-4 w-4" /> Filters
                            {(statusFilter || typeFilter) && <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />}
                        </button>
                    </div>

                    <AnimatePresence>
                        {showFilters && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="px-5 pb-5 pt-1 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status Filter</label>
                                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50" title="Status">
                                            <option value="" className="bg-slate-900">All Phases</option>
                                            {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                                                <option key={val} value={val} className="bg-slate-900">{cfg.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Category Stream</label>
                                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50" title="Type">
                                            <option value="" className="bg-slate-900">All Streams</option>
                                            <option value="REVENUE" className="bg-slate-900">Revenue-Linked</option>
                                            <option value="SUPPORT" className="bg-slate-900">Internal Support</option>
                                            <option value="MAINTENANCE" className="bg-slate-900">Maintenance</option>
                                            <option value="ENHANCEMENT" className="bg-slate-900">Enhancement</option>
                                        </select>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* ── CONTENT AREA ───────────────────────────── */}
                <AnimatePresence mode="wait">
                    {viewMode === 'analytics' ? (
                        <motion.div key="analytics" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                            <ProjectAnalytics projects={filteredProjects} />
                        </motion.div>
                    ) : loading ? (
                        <div key="loading" className="py-32 flex flex-col items-center gap-4">
                            <div className="h-10 w-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Synchronizing Project Matrix...</p>
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="py-24 flex flex-col items-center text-center"
                        >
                            <div className="p-10 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl max-w-md space-y-6">
                                <div className="h-20 w-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
                                    <FolderKanban className="h-10 w-10 text-blue-400/50" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-white">No Missions Found</h3>
                                    <p className="text-slate-500 text-sm">Try adjusting your filters or deploy your first project.</p>
                                </div>
                                <button onClick={() => router.push('/dashboard/it-management/projects/new')}
                                    className="px-8 py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/25">
                                    Deploy First Project
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {filteredProjects.map((p, idx) => {
                                const ui = getStatusUI(p.status);
                                const priStyle = PRIORITY_BADGE[p.priority] || PRIORITY_BADGE.LOW;
                                return (
                                    <motion.div key={p.id}
                                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                                        onClick={() => router.push(`/dashboard/it-management/projects/${p.id}`)}
                                        className={`group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 rounded-2xl p-6 cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-2xl ${ui.glow}`}
                                    >
                                        {/* Subtle top accent line */}
                                        <div className={`absolute top-0 left-0 right-0 h-0.5 ${ui.bg.replace('/10', '')} opacity-0 group-hover:opacity-100 transition-opacity`} />

                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-5">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">{p.projectCode}</span>
                                                    <div className={`h-1.5 w-1.5 rounded-full ${ui.dot} animate-pulse`} />
                                                </div>
                                                <h3 className="text-base font-black text-white leading-tight group-hover:text-blue-300 transition-colors line-clamp-1">{p.name}</h3>
                                            </div>
                                            <div className="p-2 bg-white/5 rounded-xl group-hover:bg-blue-500/10 transition-colors ml-2 shrink-0">
                                                <ArrowUpRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                                            </div>
                                        </div>

                                        <p className="text-slate-500 text-xs font-medium line-clamp-2 mb-5 min-h-[2rem]">
                                            {p.description || 'No description provided for this mission.'}
                                        </p>

                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-1.5 mb-5">
                                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${ui.bg} ${ui.text} ${ui.border}`}>
                                                {ui.label}
                                            </span>
                                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${priStyle}`}>
                                                {p.priority}
                                            </span>
                                            {p.isRevenueBased && (
                                                <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                                    <DollarSign className="h-2.5 w-2.5" /> Revenue
                                                </span>
                                            )}
                                            {p.website && (
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border flex items-center gap-1 ${p.website.status === 'UP' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                                    <Globe className="h-2.5 w-2.5" /> {p.website.status}
                                                </span>
                                            )}
                                        </div>

                                        {/* Progress */}
                                        <div className="space-y-2 mb-5">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-slate-600">Completion</span>
                                                <span className={ui.text}>{p.stats.completionRate}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <motion.div initial={{ width: 0 }}
                                                    animate={{ width: `${p.stats.completionRate}%` }}
                                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                                    className={`h-full rounded-full ${p.stats.completionRate === 100 ? 'bg-emerald-400' : 'bg-blue-500'}`}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[9px] font-bold text-slate-700">
                                                <span>{p.stats.completedTasks} resolved</span>
                                                <span>{p.stats.totalTasks} tasks</span>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {p.projectManager && (
                                                    <>
                                                        <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-black text-white">
                                                            {p.projectManager.name.charAt(0)}
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{p.projectManager.name.split(' ')[0]}</span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                <Clock className="h-3 w-3" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">{p.endDate ? new Date(p.endDate).toLocaleDateString() : 'Active'}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── FOOTER INTEL ───────────────────────────── */}
                {!loading && filteredProjects.length > 0 && viewMode === 'grid' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white/[0.03] border border-white/10 rounded-2xl"
                    >
                        {[
                            { val: filteredProjects.length, label: 'Total Missions', color: 'text-white' },
                            { val: activeCount, label: 'Active', color: 'text-blue-400' },
                            { val: completedCount, label: 'Completed', color: 'text-emerald-400' },
                            { val: `₹${(totalRevenue / 1000).toFixed(1)}K`, label: 'IT Revenue', color: 'text-amber-400' },
                        ].map((s) => (
                            <div key={s.label} className="text-center space-y-1">
                                <p className={`text-3xl font-black ${s.color}`}>{s.val}</p>
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{s.label}</p>
                            </div>
                        ))}
                    </motion.div>
                )}

                <FleetAuditModal isOpen={showFleetAudit} onClose={() => setShowFleetAudit(false)} projects={projects} />
            </div>
        </DashboardLayout>
    );
}
