'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    Plus, Search, Filter, FolderKanban, Calendar, DollarSign, Users, Clock,
    TrendingUp, CheckCircle2, AlertCircle, Pause, LayoutGrid, PieChart, ChevronRight,
    ArrowUpRight, Target, ShieldCheck, Zap, Globe
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
    COMPLETED: { icon: CheckCircle2, bg: 'bg-emerald-50/50', dot: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-100', label: 'Completed' },
    IN_PROGRESS: { icon: TrendingUp, bg: 'bg-blue-50/50', dot: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-100', label: 'In Progress' },
    ON_HOLD: { icon: Pause, bg: 'bg-amber-50/50', dot: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-100', label: 'On Hold' },
    PLANNING: { icon: Target, bg: 'bg-purple-50/50', dot: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-100', label: 'Planning' },
    TESTING: { icon: Zap, bg: 'bg-orange-50/50', dot: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-100', label: 'Testing' },
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

    const getStatusUI = (status: string) => STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || { icon: AlertCircle, bg: 'bg-slate-50', dot: 'bg-slate-400', text: 'text-slate-600', border: 'border-slate-100', label: status };

    return (
        <DashboardLayout>
            <div className="min-h-screen pb-20 space-y-8 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[length:200px] bg-repeat">
                
                {/* Modern Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
                >
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                            <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200">
                                <FolderKanban className="h-6 w-6 text-white" />
                            </div>
                            Project Forge
                        </h1>
                        <p className="text-slate-500 font-medium ml-1">Engineering excellence through structured IT mission management.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-white/60 backdrop-blur-md p-1 rounded-2xl border border-white/80 shadow-sm">
                            <button onClick={() => setViewMode('grid')}
                                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <LayoutGrid className="h-3.5 w-3.5" /> Grid
                            </button>
                            <button onClick={() => setViewMode('analytics')}
                                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'analytics' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <PieChart className="h-3.5 w-3.5" /> Intelligence
                            </button>
                        </div>
                        <button
                            onClick={() => router.push('/dashboard/it-management/projects/new')}
                            className="px-6 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95"
                        >
                            <Plus className="h-4 w-4" /> New Mission
                        </button>
                        <button
                            onClick={() => setShowFleetAudit(true)}
                            className="px-6 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold flex items-center gap-2 hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95"
                        >
                            <ShieldCheck className="h-4 w-4 text-blue-400" /> Fleet Audit
                        </button>
                    </div>
                </motion.div>

                {/* Glass Search & Filters */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="p-1 bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 shadow-inner group"
                >
                    <div className="p-6 flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input type="text" placeholder="Trace mission ID, title or descriptor..."
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400" />
                        </div>
                        <button onClick={() => setShowFilters(!showFilters)}
                            className={`px-6 py-3.5 rounded-2xl border text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${showFilters ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            <Filter className="h-4 w-4" /> Filters
                        </button>
                    </div>
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-6 pb-6 overflow-hidden"
                            >
                                <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">Lifecycle State</label>
                                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} 
                                            className="w-full bg-white border-slate-200 rounded-xl py-2.5 text-xs font-bold" title="Status Select">
                                            <option value="">All Mission Phases</option>
                                            {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                                                <option key={val} value={val}>{cfg.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">Category Stream</label>
                                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} 
                                            className="w-full bg-white border-slate-200 rounded-xl py-2.5 text-xs font-bold" title="Type Select">
                                            <option value="">All Streams</option>
                                            <option value="REVENUE">Revenue-Linked</option>
                                            <option value="SUPPORT">Internal Support</option>
                                            <option value="MAINTENANCE">Maintenance</option>
                                            <option value="ENHANCEMENT">Enhancement</option>
                                        </select>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Content Area */}
                <AnimatePresence mode="wait">
                    {viewMode === 'analytics' ? (
                        <motion.div key="analytics" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
                            <ProjectAnalytics projects={filteredProjects} />
                        </motion.div>
                    ) : loading ? (
                        <div key="loading" className="py-32 flex flex-col items-center justify-center space-y-4">
                            <div className="h-10 w-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                            <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Synchronizing Project Matrix...</p>
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 flex flex-col items-center text-center">
                            <div className="p-10 bg-white/40 backdrop-blur-xl rounded-[3rem] border border-white/60 shadow-xl max-w-lg space-y-6">
                                <div className="h-20 w-20 rounded-[2.5rem] bg-slate-100 flex items-center justify-center mx-auto text-slate-300">
                                    <FolderKanban className="h-10 w-10" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900">No Missions Detected</h3>
                                    <p className="text-slate-500 font-medium">Clear your trajectory filters or initiate a new mission deployment.</p>
                                </div>
                                <button onClick={() => router.push('/dashboard/it-management/projects/new')}
                                    className="px-8 py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all">
                                    Deploy First Project
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredProjects.map((p, idx) => {
                                const ui = getStatusUI(p.status);
                                return (
                                    <motion.div 
                                        key={p.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        onClick={() => router.push(`/dashboard/it-management/projects/${p.id}`)}
                                        className="group relative bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-white/80 p-6 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all cursor-pointer overflow-hidden border-b-4 hover:border-b-blue-500"
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{p.projectCode}</span>
                                                    <div className={`h-1.5 w-1.5 rounded-full ${ui.dot}`} />
                                                </div>
                                                <h3 className="text-lg font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{p.name}</h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                                                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-slate-500 text-xs font-medium line-clamp-2 mb-6 min-h-[2.5rem]">{p.description || "Experimental technical initiative with undefined parameters."}</p>

                                        <div className="flex flex-wrap gap-2 mb-8">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${ui.bg} ${ui.text} ${ui.border}`}>
                                                {ui.label}
                                            </span>
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-100 bg-slate-50 text-slate-600">
                                                {p.type}
                                            </span>
                                            {p.isRevenueBased && (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                                                    <DollarSign className="h-2.5 w-2.5" /> Revenue
                                                </span>
                                            )}
                                            {p.website && (
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1 ${p.website.status === 'UP' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                                    <Globe className="h-2.5 w-2.5" /> Web: {p.website.status}
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                    <span className="text-slate-400">Mission Completion</span>
                                                    <span className="text-blue-600">{p.stats.completionRate}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${p.stats.completionRate}%` }}
                                                        className={`h-full rounded-full ${p.stats.completionRate === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                                    <span>{p.stats.completedTasks} Resolved</span>
                                                    <span>{p.stats.totalTasks} Tasks</span>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {p.projectManager && (
                                                        <>
                                                            <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-black text-white" title={p.projectManager.name}>
                                                                {p.projectManager.name.charAt(0)}
                                                            </div>
                                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{p.projectManager.name.split(' ')[0]}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <Clock className="h-3 w-3" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{p.endDate ? new Date(p.endDate).toLocaleDateString() : 'Active'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hover Overlay Visual */}
                                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ArrowUpRight className="h-6 w-6 text-blue-100" />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Aggregate Mission Intelligence */}
                {!loading && filteredProjects.length > 0 && viewMode === 'grid' && (
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                        className="p-8 bg-slate-900 rounded-[3rem] shadow-2xl space-y-8 overflow-hidden relative"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                        <div className="flex items-center gap-4 relative">
                            <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center">
                                <TrendingUp className="h-6 w-6 text-slate-900" />
                            </div>
                            <div className="space-y-0.5">
                                <h3 className="text-xl font-black text-white tracking-tight leading-none uppercase tracking-widest">Fleet Intelligence</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Aggregate Mission Performance Metrics</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative">
                            <div className="space-y-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-white">{filteredProjects.length}</span>
                                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                                </div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Missions</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-blue-400">{filteredProjects.filter(p => p.status === 'IN_PROGRESS').length}</span>
                                    <div className="h-2 w-2 rounded-full bg-blue-400" />
                                </div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Deployments</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-emerald-400">{filteredProjects.filter(p => p.status === 'COMPLETED').length}</span>
                                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                                </div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Successful Returns</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-white">₹{(filteredProjects.reduce((sum, p) => sum + p.itRevenueEarned, 0) / 1000).toFixed(1)}K</span>
                                    <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                                </div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">IT Revenue Impact</p>
                            </div>
                        </div>
                    </motion.div>
                )}
                
                <FleetAuditModal 
                    isOpen={showFleetAudit} 
                    onClose={() => setShowFleetAudit(false)} 
                    projects={projects}
                />
            </div>
        </DashboardLayout>
    );
}
