'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    FolderKanban, ListTodo, TrendingUp, Clock, DollarSign, Users, AlertCircle,
    CheckCircle2, ArrowUpRight, Briefcase, Target, Zap, ChevronRight, Activity,
    ShieldCheck, Calendar, PieChart, Sparkles, LayoutGrid
} from 'lucide-react';

interface DashboardStats {
    overview: {
        projects: { total: number; active: number; completed: number; revenue: number; };
        tasks: { total: number; pending: number; inProgress: number; completed: number; revenue: number; completionRate: number; };
        timeTracking: { totalHours: number; billableHours: number; nonBillableHours: number; period: string; };
    };
    revenue: { totalRevenue: number; itRevenue: number; paidRevenue: number; unpaidRevenue: number; projectRevenue: number; taskRevenue: number; } | null;
    tasksByPriority: { high: number; medium: number; low: number; };
    tasksByType: { revenue: number; support: number; maintenance: number; urgent: number; serviceRequest: number; };
    recentTasks: Array<{ id: string; title: string; taskCode: string; status: string; priority: string; type: string; project: string | null; assignedTo: string; updatedAt: string; }>;
    view: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    COMPLETED: { label: 'Settled', bg: 'bg-emerald-50/50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    IN_PROGRESS: { label: 'Active', bg: 'bg-blue-50/50', text: 'text-blue-700', dot: 'bg-blue-500' },
    PENDING: { label: 'Pending', bg: 'bg-amber-50/50', text: 'text-amber-700', dot: 'bg-amber-500' },
    UNDER_REVIEW: { label: 'Review', bg: 'bg-purple-50/50', text: 'text-purple-700', dot: 'bg-purple-500' },
};

export default function ITManagementDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'my' | 'team' | 'all'>('my');

    const fetchDashboardStats = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/it/analytics/dashboard?view=${view}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) setStats(await response.json());
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    }, [view]);

    useEffect(() => { fetchDashboardStats(); }, [fetchDashboardStats]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
                    <div className="h-12 w-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Synchronizing IT Ecosystem...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!stats) {
        return (
            <DashboardLayout>
                <div className="min-h-[80vh] flex items-center justify-center">
                    <div className="p-10 bg-white/40 backdrop-blur-xl rounded-[3rem] border border-white/60 shadow-xl text-center max-w-md space-y-6">
                        <div className="h-20 w-20 rounded-[2.5rem] bg-rose-50 flex items-center justify-center mx-auto text-rose-500">
                            <AlertCircle className="h-10 w-10" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-900 leading-tight">Data Leak Detected</h3>
                            <p className="text-slate-500 font-medium">Unable to establish connection with the analytics mainframe.</p>
                        </div>
                        <button onClick={() => window.location.reload()} className="px-8 py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all">Reinitialize</button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const billablePct = stats.overview.timeTracking.totalHours > 0
        ? Math.round((stats.overview.timeTracking.billableHours / stats.overview.timeTracking.totalHours) * 100)
        : 0;

    return (
        <DashboardLayout>
            <div className="min-h-screen pb-20 space-y-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[length:200px] bg-repeat">
                
                {/* Modern Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
                >
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-1 bg-blue-600/10 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">IT Command Center</span>
                            <span className="h-1 w-1 rounded-full bg-slate-200" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">v4.0.2 Stable</span>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4 cursor-default">
                             IT Intelligence Console
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-white/60 backdrop-blur-md p-1 rounded-2xl border border-white/80 shadow-sm">
                            {(['my', 'team', 'all'] as const).map((v) => (
                                <button key={v} onClick={() => setView(v)}
                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    {v === 'my' ? 'Personal' : v === 'team' ? 'Squad' : 'Fleet'}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => router.push('/dashboard/it-management/services')}
                            className="p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-all shadow-sm">
                            <Zap className="h-5 w-5" />
                        </button>
                    </div>
                </motion.div>

                {/* Primary Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Active Missions', val: stats.overview.projects.active, sub: `${stats.overview.projects.total} Total Deployed`, icon: FolderKanban, color: 'text-blue-600', bg: 'bg-blue-600', link: '/dashboard/it-management/projects' },
                        { label: 'Operational Tasks', val: stats.overview.tasks.inProgress, sub: `${stats.overview.tasks.pending} Pending Queue`, icon: ListTodo, color: 'text-purple-600', bg: 'bg-purple-600', link: '/dashboard/it-management/tasks' },
                        { label: 'Revenue Yield', val: `₹${(stats.revenue?.itRevenue || 0).toLocaleString()}`, sub: `₹${(stats.revenue?.paidRevenue || 0).toLocaleString()} Verified`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-600', link: '/dashboard/it-management/revenue' },
                        { label: 'Fleet Efficiency', val: `${stats.overview.tasks.completionRate}%`, sub: `${stats.overview.tasks.completed} Goal Resolved`, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-600', link: '/dashboard/it-management/performance' },
                    ].map((stat, idx) => (
                        <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                            onClick={() => router.push(stat.link)}
                            className="group relative bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/80 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer transition-all overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-4 rounded-2xl ${stat.bg} shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
                                    <stat.icon className="h-6 w-6 text-white" />
                                </div>
                                <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stat.val}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            </div>
                            <p className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-60">{stat.sub}</p>
                        </motion.div>
                    ))}
                </div>

                {/* analytics and insights */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Insights Column */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                        className="lg:col-span-2 space-y-8"
                    >
                        {/* Recent Deployments */}
                        <div className="bg-white/70 backdrop-blur-xl rounded-[3rem] p-8 border border-white/80 shadow-sm">
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center">
                                        <Activity className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest leading-none">Recent Transmissions</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trace the latest operational shifts</p>
                                    </div>
                                </div>
                                <button onClick={() => router.push('/dashboard/it-management/tasks')}
                                    className="p-3 rounded-xl bg-slate-100 text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-lg transition-all">
                                    <LayoutGrid className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {stats.recentTasks.map((task, idx) => {
                                    const ui = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
                                    return (
                                        <motion.div key={task.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + (idx * 0.05) }}
                                            onClick={() => router.push(`/dashboard/it-management/tasks/${task.id}`)}
                                            className="group flex items-center gap-6 p-5 rounded-[2rem] hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer border border-transparent hover:border-slate-100"
                                        >
                                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xs font-black ${ui.bg} ${ui.text} border border-current/10`}>
                                                {task.taskCode.slice(-2)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{task.title}</h4>
                                                <div className="flex items-center gap-3 mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {task.project || 'Global'}</span>
                                                    <span className="h-1 w-1 rounded-full bg-slate-200" />
                                                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {task.assignedTo}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${ui.bg} ${ui.text} border-current/10`}>
                                                    {ui.label}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{new Date(task.updatedAt).toLocaleDateString()}</span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Distribution Matrix */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-slate-900 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
                                <h3 className="text-white text-xs font-black uppercase tracking-widest mb-8 flex items-center gap-3">
                                    <PieChart className="h-4 w-4 text-blue-400" /> Resource Allocation
                                </h3>
                                <div className="space-y-6">
                                    {[
                                        { label: 'Revenue Yield', count: stats.tasksByType.revenue, color: 'bg-emerald-400' },
                                        { label: 'Core Support', count: stats.tasksByType.support, color: 'bg-blue-400' },
                                        { label: 'Emergency Fix', count: stats.tasksByType.urgent, color: 'bg-rose-500' },
                                        { label: 'Asset Maintenance', count: stats.tasksByType.maintenance, color: 'bg-amber-400' },
                                    ].map((type) => (
                                        <div key={type.label} className="space-y-2">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-slate-400">{type.label}</span>
                                                <span className="text-white">{type.count}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${(type.count / stats.overview.tasks.total) * 100}%` }} className={`h-full ${type.color}`} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white/70 backdrop-blur-xl rounded-[3rem] p-8 border border-white/80 shadow-sm relative overflow-hidden">
                                <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-8 flex items-center gap-3">
                                    <Activity className="h-4 w-4 text-purple-500" /> Operational Severity
                                </h3>
                                <div className="space-y-6">
                                    {[
                                        { label: 'Mission Critical', count: stats.tasksByPriority.high, color: 'bg-rose-500' },
                                        { label: 'Elevated Response', count: stats.tasksByPriority.medium, color: 'bg-amber-400' },
                                        { label: 'Standard Cycle', count: stats.tasksByPriority.low, color: 'bg-emerald-400' },
                                    ].map((prio) => (
                                        <div key={prio.label} className="flex items-center gap-6">
                                            <div className={`h-12 w-12 rounded-2xl ${prio.color}/10 flex items-center justify-center text-xl font-black ${prio.color.replace('bg-', 'text-')}`}>
                                                {prio.count}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{prio.label}</p>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <motion.div initial={{ width: 0 }} animate={{ width: `${(prio.count / (stats.tasksByPriority.high + stats.tasksByPriority.medium + stats.tasksByPriority.low)) * 100}%` }} className={`h-full ${prio.color}`} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Sidebar Actions Column */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
                        className="space-y-8"
                    >
                        {/* Time Intelligence */}
                        <div className="bg-white/70 backdrop-blur-xl rounded-[3rem] p-8 border border-white/80 shadow-sm space-y-8">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                <Clock className="h-4 w-4 text-blue-500" /> Time Intelligence
                            </h3>
                            <div className="space-y-8">
                                <div className="text-center">
                                    <div className="relative inline-flex items-center justify-center">
                                        <svg className="h-40 w-40 transform -rotate-90">
                                            <circle cx="80" cy="80" r="70" className="stroke-slate-100 fill-none" strokeWidth="12" />
                                            <motion.circle cx="80" cy="80" r="70" className="stroke-blue-600 fill-none" strokeWidth="12" strokeLinecap="round"
                                                initial={{ strokeDasharray: "0 440" }} animate={{ strokeDasharray: `${billablePct * 4.4} 440` }} transition={{ duration: 1.5 }} />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-3xl font-black text-slate-900">{billablePct}%</span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billable</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-center border-t border-slate-100 pt-8">
                                    <div className="space-y-1">
                                        <p className="text-xl font-black text-slate-900">{stats.overview.timeTracking.totalHours}h</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xl font-black text-emerald-600">{stats.overview.timeTracking.billableHours}h</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valued</p>
                                    </div>
                                </div>
                                <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">{stats.overview.timeTracking.period}</p>
                            </div>
                        </div>

                        {/* Quick Action Matrix */}
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Projects', sub: 'Deployment Archive', icon: FolderKanban, color: 'text-blue-600 bg-blue-50', link: '/dashboard/it-management/projects' },
                                { label: 'Tasks', sub: 'Logic Board', icon: ListTodo, color: 'text-purple-600 bg-purple-50', link: '/dashboard/it-management/tasks' },
                                { label: 'Revenue', sub: 'Market Impact', icon: DollarSign, color: 'text-emerald-600 bg-emerald-50', link: '/dashboard/it-management/revenue' },
                                { label: 'Squads', sub: 'Personnel Roaster', icon: Users, color: 'text-slate-900 bg-slate-50', link: '/dashboard/staff' },
                            ].map((btn) => (
                                <button key={btn.label} onClick={() => router.push(btn.link)}
                                    className="group bg-white/70 backdrop-blur-xl rounded-[2rem] p-5 border border-white/80 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all text-left space-y-4"
                                >
                                    <div className={`h-10 w-10 rounded-2xl ${btn.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <btn.icon className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{btn.label}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none opacity-60">{btn.sub}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </DashboardLayout>
    );
}
