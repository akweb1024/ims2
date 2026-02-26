'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ListTodo, FolderKanban, Clock, CheckCircle2, CircleDot,
    AlertCircle, ArrowRight, BarChart3, RefreshCw, Eye, ChevronRight, Calendar, User, Tag, LayoutGrid, Zap, Sparkles, TrendingUp
} from 'lucide-react';

interface Task {
    id: string; taskCode: string; title: string; description?: string;
    status: string; priority: string; category: string; progressPercent: number;
    dueDate?: string;
    project?: { id: string; name: string; projectCode: string };
    assignedTo?: { id: string; name: string; email: string };
    createdBy?: { id: string; name: string; email: string };
    tags: string[];
}

interface Project {
    id: string; projectCode: string; name: string; status: string; priority: string; category: string;
    stats: { totalTasks: number; completedTasks: number; inProgressTasks: number; completionRate: number };
    projectManager?: { id: string; name: string; email: string };
    teamLead?: { id: string; name: string; email: string };
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    PENDING: { label: 'Pending', bg: 'bg-amber-50/50', text: 'text-amber-700', dot: 'bg-amber-500' },
    IN_PROGRESS: { label: 'Active', bg: 'bg-blue-50/50', text: 'text-blue-700', dot: 'bg-blue-500' },
    UNDER_REVIEW: { label: 'Review', bg: 'bg-purple-50/50', text: 'text-purple-700', dot: 'bg-purple-500' },
    COMPLETED: { label: 'Settled', bg: 'bg-emerald-50/50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    CANCELLED: { label: 'Aborted', bg: 'bg-rose-50/50', text: 'text-rose-700', dot: 'bg-rose-500' },
};

const PRIORITY_CONFIG: Record<string, { label: string; text: string; bg: string }> = {
    LOW: { label: 'Low', text: 'text-emerald-600', bg: 'bg-emerald-50' },
    MEDIUM: { label: 'Medium', text: 'text-amber-600', bg: 'bg-amber-50' },
    HIGH: { label: 'High', text: 'text-orange-600', bg: 'bg-orange-50' },
    CRITICAL: { label: 'Critical', text: 'text-rose-600', bg: 'bg-rose-50' },
};

const STAT_FILTERS = [
    { label: 'Total', filter: 'ALL', color: 'bg-slate-900', key: 'total' as const },
    { label: 'Pending', filter: 'PENDING', color: 'bg-amber-500', key: 'pending' as const },
    { label: 'Active', filter: 'IN_PROGRESS', color: 'bg-blue-600', key: 'inProgress' as const },
    { label: 'In Review', filter: 'UNDER_REVIEW', color: 'bg-purple-500', key: 'underReview' as const },
    { label: 'Settled', filter: 'COMPLETED', color: 'bg-emerald-600', key: 'completed' as const },
];

export default function MyTasksPage() {
    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<string>('ALL');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [tasksRes, projectsRes] = await Promise.all([fetch('/api/it/tasks?view=my'), fetch('/api/it/projects')]);
            if (tasksRes.ok) setTasks(await tasksRes.json());
            if (projectsRes.ok) setProjects(await projectsRes.json());
        } catch (err) { console.error('Failed to fetch workspace data:', err); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleStatusUpdate = async (taskId: string, newStatus: string) => {
        setUpdatingTaskId(taskId);
        try {
            const res = await fetch(`/api/it/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
            if (res.ok) setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        } catch (err) { console.error('Status update failed:', err); }
        finally { setUpdatingTaskId(null); }
    };

    const handleProgressUpdate = async (taskId: string, progress: number) => {
        try {
            const res = await fetch(`/api/it/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progressPercent: progress }) });
            if (res.ok) setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progressPercent: progress } : t));
        } catch (err) { console.error('Progress update failed:', err); }
    };

    const stats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'PENDING').length,
        inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        underReview: tasks.filter(t => t.status === 'UNDER_REVIEW').length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
    };

    const filteredTasks = activeFilter === 'ALL' ? tasks : tasks.filter(t => t.status === activeFilter);
    const isOverdue = (dueDate?: string) => dueDate ? new Date(dueDate) < new Date() : false;

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
                    <div className="h-12 w-12 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Synchronizing Workspace Intel...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="min-h-screen pb-20 space-y-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[length:200px] bg-repeat">
                
                {/* Modern Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
                >
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-1 bg-purple-600/10 text-purple-600 rounded-full text-[10px] font-black uppercase tracking-widest">Personal Operation</span>
                            <span className="h-1 w-1 rounded-full bg-slate-200" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Workspace</span>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                             Digital Mission Control
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={fetchData} className="p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-purple-600 hover:bg-slate-50 transition-all shadow-sm">
                            <RefreshCw className="h-5 w-5" />
                        </button>
                    </div>
                </motion.div>

                {/* Status Hub */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {STAT_FILTERS.map((s, idx) => (
                        <motion.button key={s.filter} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
                            onClick={() => setActiveFilter(s.filter)}
                            className={`group relative p-6 rounded-[2rem] border transition-all text-left overflow-hidden ${activeFilter === s.filter ? 'bg-white border-white shadow-xl ring-2 ring-purple-600/10' : 'bg-white/40 border-white/60 hover:bg-white/60 hover:border-white h-full'}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`h-2 w-2 rounded-full ${s.color}`} />
                                {activeFilter === s.filter && <Sparkles className="h-4 w-4 text-purple-600" />}
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 leading-none">{stats[s.key]}</h3>
                            <p className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{s.label}</p>
                            {activeFilter === s.filter && <div className="absolute bottom-0 left-0 h-1 bg-purple-600 transition-all w-full" />}
                        </motion.button>
                    ))}
                </div>

                {/* Mission Stream (Projects) */}
                {projects.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                           <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                               <FolderKanban className="h-6 w-6 text-blue-600" /> Active Missions
                           </h2>
                           <button onClick={() => router.push('/dashboard/it-management/projects')} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                               All Assets <ChevronRight className="h-3 w-3" />
                           </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.map((project, idx) => (
                                <motion.div key={project.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + (idx * 0.1) }}
                                    onClick={() => router.push(`/dashboard/it-management/projects/${project.id}`)}
                                    className="group bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/80 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer transition-all border-b-4 hover:border-b-blue-500 overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{project.projectCode}</p>
                                            <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">{project.name}</h3>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-blue-600 transition-all transform group-hover:translate-x-1" />
                                    </div>
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-slate-400">Tactical Progress</span>
                                            <span className="text-blue-600">{project.stats.completionRate}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${project.stats.completionRate}%` }} className="h-full bg-blue-600 rounded-full" />
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            <span className="flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> {project.stats.inProgressTasks} Active</span>
                                            <span>{project.stats.completedTasks} Resolved</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Logic Queue (Tasks) */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                            <ListTodo className="h-6 w-6 text-purple-600" /> Operational Queue
                        </h2>
                        {activeFilter !== 'ALL' && (
                            <button onClick={() => setActiveFilter('ALL')} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">Reset Stream Filter ×</button>
                        )}
                    </div>

                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {filteredTasks.length === 0 ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="h-20 w-20 rounded-[2.5rem] bg-slate-100 flex items-center justify-center text-slate-300">
                                        <Sparkles className="h-10 w-10" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-slate-900">Queue Clear</h3>
                                        <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">All selected vectors have been processed.</p>
                                    </div>
                                </motion.div>
                            ) : (
                                filteredTasks.map((task, idx) => {
                                    const ui = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
                                    const prio = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.MEDIUM;
                                    const overdue = isOverdue(task.dueDate) && task.status !== 'COMPLETED';
                                    return (
                                        <motion.div key={task.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.05 }}
                                            className={`group relative bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/80 shadow-sm hover:shadow-xl transition-all ${overdue ? 'border-rose-100 ring-4 ring-rose-500/5' : ''}`}
                                        >
                                            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                                <div className="flex-1 space-y-4">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">{task.taskCode}</span>
                                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${ui.bg} ${ui.text} border-current/10 flex items-center gap-1.5`}>
                                                            <div className={`h-1.5 w-1.5 rounded-full ${ui.dot}`} /> {ui.label}
                                                        </span>
                                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${prio.bg} ${prio.text}`}>
                                                            {prio.label} Severity
                                                        </span>
                                                        {overdue && (
                                                            <span className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse flex items-center gap-1.5 shadow-lg shadow-rose-200">
                                                                <AlertCircle className="h-3 w-3" /> Critical Delay
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="space-y-1">
                                                        <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-purple-600 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/it-management/tasks/${task.id}`)}>
                                                            {task.title}
                                                        </h3>
                                                        <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                            {task.project && <span className="flex items-center gap-1.5 text-blue-500"><LayoutGrid className="h-3.5 w-3.5" />{task.project.name}</span>}
                                                            {task.dueDate && <span className={`flex items-center gap-1.5 ${overdue ? 'text-rose-500' : ''}`}><Calendar className="h-3.5 w-3.5" />Limit: {new Date(task.dueDate).toLocaleDateString()}</span>}
                                                            {task.createdBy && <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Origin: {task.createdBy.name}</span>}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <motion.div initial={{ width: 0 }} animate={{ width: `${task.progressPercent}%` }} className={`h-full rounded-full ${task.progressPercent === 100 ? 'bg-emerald-500' : 'bg-purple-600'}`} />
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-900 w-10 text-right">{task.progressPercent}%</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-row lg:flex-col gap-3 shrink-0 pt-4 lg:pt-0 lg:border-l border-slate-100 lg:pl-6">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lifecycle</p>
                                                        <select value={task.status} onChange={(e) => handleStatusUpdate(task.id, e.target.value)} disabled={updatingTaskId === task.id}
                                                            className="w-full bg-white border-slate-200 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-purple-500/20 cursor-pointer shadow-sm disabled:opacity-50">
                                                            <option value="PENDING">Pending</option>
                                                            <option value="IN_PROGRESS">Active</option>
                                                            <option value="UNDER_REVIEW">Review</option>
                                                            <option value="COMPLETED">Settled</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Percentile</p>
                                                        <select value={Math.round(task.progressPercent / 5) * 5} onChange={(e) => handleProgressUpdate(task.id, parseInt(e.target.value))}
                                                            className="w-full bg-white border-slate-200 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-purple-500/20 cursor-pointer shadow-sm">
                                                            {Array.from({ length: 21 }, (_, i) => i * 5).map(v => <option key={v} value={v}>{v}% Done</option>)}
                                                        </select>
                                                    </div>
                                                    <button onClick={() => router.push(`/dashboard/it-management/tasks/${task.id}`)}
                                                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white rounded-xl px-4 py-3 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                                                        <Eye className="h-4 w-4" /> Intel
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
