'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    FolderKanban, ListTodo, TrendingUp, Clock, DollarSign, Users, AlertCircle,
    CheckCircle2, ArrowUpRight, Briefcase, Target, Zap, ChevronRight, Activity,
    ShieldCheck, Calendar, PieChart, Sparkles, LayoutGrid, Terminal, Cpu,
    Globe, BarChart3, ArrowRight, Gauge
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

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; glow: string }> = {
    COMPLETED: { label: 'Done', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', glow: 'shadow-emerald-500/20' },
    IN_PROGRESS: { label: 'Active', bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400', glow: 'shadow-blue-500/20' },
    PENDING: { label: 'Queued', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', glow: 'shadow-amber-500/20' },
    UNDER_REVIEW: { label: 'Review', bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-400', glow: 'shadow-purple-500/20' },
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
    CRITICAL: { label: 'Critical', color: 'text-rose-400' },
    HIGH: { label: 'High', color: 'text-orange-400' },
    MEDIUM: { label: 'Medium', color: 'text-amber-400' },
    LOW: { label: 'Low', color: 'text-emerald-400' },
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
                <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-6">
                    <div className="relative">
                        <div className="h-20 w-20 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Cpu className="h-7 w-7 text-blue-500 animate-pulse" />
                        </div>
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-sm font-black text-slate-300 uppercase tracking-[0.3em]">Booting IT Console</p>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Connecting to intelligence mainframe...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!stats) {
        return (
            <DashboardLayout>
                <div className="min-h-[80vh] flex items-center justify-center">
                    <div className="p-12 bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-red-500/20 text-center max-w-md space-y-6 shadow-2xl shadow-red-500/10">
                        <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto text-red-400 border border-red-500/20">
                            <AlertCircle className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-white">Connection Failed</h3>
                            <p className="text-slate-400 text-sm">Unable to reach the analytics server.</p>
                        </div>
                        <button onClick={() => window.location.reload()} className="px-8 py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/25">
                            Reconnect
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const billablePct = stats.overview.timeTracking.totalHours > 0
        ? Math.round((stats.overview.timeTracking.billableHours / stats.overview.timeTracking.totalHours) * 100)
        : 0;

    const totalPriority = stats.tasksByPriority.high + stats.tasksByPriority.medium + stats.tasksByPriority.low;

    return (
        <DashboardLayout>
            <div className="min-h-screen pb-24 space-y-10">

                {/* ── HERO HEADER ─────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-3xl overflow-hidden"
                >
                    {/* Hero gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
                    <div className="absolute inset-0 opacity-30"
                        style={{ backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.4) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.3) 0%, transparent 50%)' }} />
                    <div className="absolute inset-0 opacity-5"
                        style={{ backgroundImage: 'linear-gradient(rgba(147,197,253,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(147,197,253,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

                    <div className="relative p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-full">
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">IT Command Center</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">v4.0 · Live</span>
                            </div>
                            <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-none">
                                IT Intelligence<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Console</span>
                            </h1>
                            <p className="text-slate-400 font-medium max-w-md">
                                Real-time mission control for your IT ecosystem. Track projects, tasks, and revenue impact at a glance.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* View switcher */}
                            <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl gap-1">
                                {(['my', 'team', 'all'] as const).map((v) => (
                                    <button key={v} onClick={() => setView(v)}
                                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'text-slate-400 hover:text-white'}`}>
                                        {v === 'my' ? 'Personal' : v === 'team' ? 'Squad' : 'Fleet'}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => router.push('/dashboard/it-management/services')}
                                className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-blue-400 hover:border-blue-500/30 transition-all">
                                <Zap className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* ── STAT CARDS ──────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                        {
                            label: 'Active Missions', val: stats.overview.projects.active,
                            sub: `${stats.overview.projects.total} total deployed`,
                            icon: FolderKanban, gradient: 'from-blue-600 to-cyan-500',
                            glow: 'shadow-blue-500/20', link: '/dashboard/it-management/projects',
                            trend: '+' + stats.overview.projects.active
                        },
                        {
                            label: 'Operational Tasks', val: stats.overview.tasks.inProgress,
                            sub: `${stats.overview.tasks.pending} in queue`,
                            icon: ListTodo, gradient: 'from-violet-600 to-purple-500',
                            glow: 'shadow-violet-500/20', link: '/dashboard/it-management/tasks',
                            trend: stats.overview.tasks.total + ' total'
                        },
                        {
                            label: 'Revenue Impact', val: `₹${(stats.revenue?.itRevenue || 0).toLocaleString()}`,
                            sub: `₹${(stats.revenue?.paidRevenue || 0).toLocaleString()} verified`,
                            icon: DollarSign, gradient: 'from-emerald-600 to-teal-500',
                            glow: 'shadow-emerald-500/20', link: '/dashboard/it-management/revenue',
                            trend: 'Fiscal'
                        },
                        {
                            label: 'Fleet Efficiency', val: `${stats.overview.tasks.completionRate}%`,
                            sub: `${stats.overview.tasks.completed} goals resolved`,
                            icon: Gauge, gradient: 'from-amber-500 to-orange-500',
                            glow: 'shadow-amber-500/20', link: '/dashboard/it-management/performance',
                            trend: 'KPI'
                        },
                    ].map((stat, idx) => (
                        <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
                            onClick={() => router.push(stat.link)}
                            className={`group relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 cursor-pointer overflow-hidden
                                hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300 hover:shadow-2xl ${stat.glow}`}
                        >
                            {/* Glow blob */}
                            <div className={`absolute -top-6 -right-6 h-24 w-24 rounded-full bg-gradient-to-br ${stat.gradient} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />

                            <div className="relative">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                                        <stat.icon className="h-5 w-5 text-white" />
                                    </div>
                                    <ArrowUpRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-3xl font-black text-white tracking-tight">{stat.val}</p>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                                </div>
                                <p className="mt-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest">{stat.sub}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* ── MAIN CONTENT GRID ───────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Recent Tasks Feed — spans 2 cols */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                        className="lg:col-span-2 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                    <Activity className="h-4 w-4 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-black text-white tracking-tight">Recent Activity</h3>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Latest task transmissions</p>
                                </div>
                            </div>
                            <button onClick={() => router.push('/dashboard/it-management/tasks')}
                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-xl text-[10px] font-black text-blue-400 uppercase tracking-widest hover:bg-blue-600/20 transition-all">
                                View All <ArrowRight className="h-3 w-3" />
                            </button>
                        </div>

                        <div className="divide-y divide-white/5">
                            {stats.recentTasks.length === 0 ? (
                                <div className="py-16 flex flex-col items-center text-slate-600 gap-3">
                                    <ListTodo className="h-8 w-8 opacity-30" />
                                    <p className="text-xs font-bold uppercase tracking-widest">No recent tasks</p>
                                </div>
                            ) : stats.recentTasks.map((task, idx) => {
                                const ui = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
                                const pri = PRIORITY_LABELS[task.priority];
                                return (
                                    <motion.div key={task.id}
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + idx * 0.05 }}
                                        onClick={() => router.push(`/dashboard/it-management/tasks/${task.id}`)}
                                        className="group flex items-center gap-5 px-6 py-4 hover:bg-white/[0.04] transition-all cursor-pointer"
                                    >
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${ui.bg} ${ui.text} border border-current/10`}>
                                            {task.taskCode.slice(-2)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-200 truncate group-hover:text-white transition-colors text-sm">{task.title}</p>
                                            <div className="flex items-center gap-3 mt-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                                                <span>{task.project || 'Global'}</span>
                                                <span>·</span>
                                                <span>{task.assignedTo}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${ui.bg} ${ui.text} border-current/10`}>
                                                {ui.label}
                                            </span>
                                            {pri && <span className={`text-[9px] font-black uppercase tracking-widest ${pri.color}`}>{pri.label}</span>}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Sidebar: Time Intelligence + Quick Actions */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
                        className="space-y-6"
                    >
                        {/* Billable Donut */}
                        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                                    <Clock className="h-4 w-4 text-cyan-400" />
                                </div>
                                <div>
                                    <p className="font-black text-white text-sm">Time Intelligence</p>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Billable ratio</p>
                                </div>
                            </div>

                            {/* SVG donut */}
                            <div className="flex flex-col items-center">
                                <div className="relative">
                                    <svg className="h-36 w-36 -rotate-90">
                                        <circle cx="72" cy="72" r="60" className="fill-none stroke-white/5" strokeWidth="12" />
                                        <motion.circle cx="72" cy="72" r="60" className="fill-none stroke-cyan-500" strokeWidth="12" strokeLinecap="round"
                                            initial={{ strokeDasharray: "0 377" }}
                                            animate={{ strokeDasharray: `${billablePct * 3.77} 377` }}
                                            transition={{ duration: 1.5, ease: "circOut" }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-white">{billablePct}%</span>
                                        <span className="text-[10px] font-black text-slate-500 uppercase">Billable</span>
                                    </div>
                                </div>
                                <div className="w-full grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                    <div className="text-center">
                                        <p className="text-xl font-black text-white">{stats.overview.timeTracking.totalHours}h</p>
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Total</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xl font-black text-cyan-400">{stats.overview.timeTracking.billableHours}h</p>
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Valued</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Priority breakdown */}
                        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
                                    <Target className="h-4 w-4 text-rose-400" />
                                </div>
                                <p className="font-black text-white text-sm">Priority Matrix</p>
                            </div>
                            {[
                                { label: 'Critical / High', count: stats.tasksByPriority.high, color: 'bg-rose-500', text: 'text-rose-400' },
                                { label: 'Standard', count: stats.tasksByPriority.medium, color: 'bg-amber-400', text: 'text-amber-400' },
                                { label: 'Low Priority', count: stats.tasksByPriority.low, color: 'bg-emerald-400', text: 'text-emerald-400' },
                            ].map((p) => (
                                <div key={p.label} className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-500">{p.label}</span>
                                        <span className={p.text}>{p.count}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }}
                                            animate={{ width: totalPriority > 0 ? `${(p.count / totalPriority) * 100}%` : '0%' }}
                                            transition={{ duration: 1 }}
                                            className={`h-full ${p.color} rounded-full`} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Quick action grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Projects', icon: FolderKanban, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', link: '/dashboard/it-management/projects' },
                                { label: 'Tasks', icon: ListTodo, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', link: '/dashboard/it-management/tasks' },
                                { label: 'Revenue', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', link: '/dashboard/it-management/revenue' },
                                { label: 'Inventory', icon: BarChart3, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', link: '/dashboard/it-management/assets' },
                            ].map((btn) => (
                                <button key={btn.label} onClick={() => router.push(btn.link)}
                                    className={`group flex flex-col gap-3 p-4 border rounded-xl ${btn.bg} transition-all hover:scale-[1.02] active:scale-95 text-left`}>
                                    <btn.icon className={`h-5 w-5 ${btn.color}`} />
                                    <span className={`text-xs font-black uppercase tracking-wide ${btn.color}`}>{btn.label}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* ── TASK TYPE DISTRIBUTION ──────────────────── */}
                {!loading && stats.overview.tasks.total > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                        className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                    <PieChart className="h-4 w-4 text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="font-black text-white">Resource Allocation</h3>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Task distribution by stream</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-3xl font-black text-white">{stats.overview.tasks.total}</span>
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Total</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {[
                                { label: 'Revenue', count: stats.tasksByType.revenue, color: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                                { label: 'Support', count: stats.tasksByType.support, color: 'bg-blue-500', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                                { label: 'Urgent', count: stats.tasksByType.urgent, color: 'bg-rose-500', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
                                { label: 'Maintenance', count: stats.tasksByType.maintenance, color: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                                { label: 'Service Req', count: stats.tasksByType.serviceRequest, color: 'bg-violet-500', badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
                            ].map((type) => (
                                <div key={type.label} className={`p-4 rounded-xl border ${type.badge} space-y-3`}>
                                    <p className="text-2xl font-black text-white">{type.count}</p>
                                    <div className="space-y-1.5">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-70">{type.label}</p>
                                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                            <motion.div initial={{ width: 0 }}
                                                animate={{ width: stats.overview.tasks.total > 0 ? `${(type.count / stats.overview.tasks.total) * 100}%` : '0%' }}
                                                className={`h-full ${type.color} rounded-full`} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>
        </DashboardLayout>
    );
}
