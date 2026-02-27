'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    Plus, Search, Filter, ListTodo, DollarSign, Clock, User, AlertCircle, BookOpen,
    ChevronRight, MoreVertical, LayoutGrid, Kanban, Target, CheckCircle2, AlertTriangle,
    Zap, TrendingUp, Activity
} from 'lucide-react';
import TaskDetailModal from '@/components/dashboard/it/TaskDetailModal';

interface Task {
    id: string; taskCode: string; title: string; description: string | null;
    category: string; type: string; priority: string; status: string;
    isRevenueBased: boolean; estimatedValue: number; itRevenueEarned: number;
    dueDate: string | null; progressPercent: number; estimatedHours: number | null;
    assignedToId: string | null; projectId: string | null; dependencies: string[];
    project: { id: string; name: string; projectCode: string; } | null;
    assignedTo: { id: string; name: string; email: string; } | null;
    _count: { comments: number; timeEntries: number; };
}

const STATUSES = [
    { value: 'PENDING', label: 'To Do', bg: 'bg-slate-800/60', dot: 'bg-slate-400', accent: 'border-slate-600/30', text: 'text-slate-400', headerBg: 'bg-slate-700/30', countBg: 'bg-slate-600/40' },
    { value: 'IN_PROGRESS', label: 'In Progress', bg: 'bg-blue-950/60', dot: 'bg-blue-400', accent: 'border-blue-600/30', text: 'text-blue-400', headerBg: 'bg-blue-900/30', countBg: 'bg-blue-700/30' },
    { value: 'UNDER_REVIEW', label: 'In Review', bg: 'bg-amber-950/60', dot: 'bg-amber-400', accent: 'border-amber-700/30', text: 'text-amber-400', headerBg: 'bg-amber-900/30', countBg: 'bg-amber-700/30' },
    { value: 'COMPLETED', label: 'Done', bg: 'bg-emerald-950/60', dot: 'bg-emerald-400', accent: 'border-emerald-700/30', text: 'text-emerald-400', headerBg: 'bg-emerald-900/30', countBg: 'bg-emerald-700/30' },
];

const PRIORITY_STYLE: Record<string, { bg: string; text: string; border: string }> = {
    CRITICAL: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
    HIGH: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
    MEDIUM: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    LOW: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
};

const TYPE_COLOR: Record<string, { bg: string; text: string }> = {
    REVENUE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    SUPPORT: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
    MAINTENANCE: { bg: 'bg-slate-500/10', text: 'text-slate-400' },
    URGENT: { bg: 'bg-rose-500/10', text: 'text-rose-400' },
    SERVICE_REQUEST: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
};

export default function TasksPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role || 'EMPLOYEE';
    const isEmployee = userRole === 'EMPLOYEE';
    const canManage = ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(userRole);

    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState<'my' | 'team' | 'all'>('my');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [priorityFilter, setPriorityFilter] = useState<string>('');
    const [projectFilter, setProjectFilter] = useState<string>('');
    const [assignedToFilter, setAssignedToFilter] = useState<string>('');
    const [showFilters, setShowFilters] = useState(false);
    const [allProjects, setAllProjects] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append('view', view);
            if (typeFilter) params.append('type', typeFilter);
            if (priorityFilter) params.append('priority', priorityFilter);
            if (projectFilter) params.append('projectId', projectFilter);
            if (assignedToFilter) params.append('assignedToId', assignedToFilter);
            const response = await fetch(`/api/it/tasks?${params.toString()}`);
            if (response.ok) setTasks(await response.json());
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    }, [view, typeFilter, priorityFilter, projectFilter, assignedToFilter]);

    const fetchMetadata = useCallback(async () => {
        try {
            const [pr, ur] = await Promise.all([fetch('/api/it/projects'), fetch('/api/users?limit=100')]);
            if (pr.ok) { const d = await pr.json(); setAllProjects(Array.isArray(d) ? d : (d.data || [])); }
            if (ur.ok) { const d = await ur.json(); setAllUsers(Array.isArray(d) ? d : (d.data || [])); }
        } catch (error) { console.error('Failed to fetch filter metadata:', error); }
    }, []);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);
    useEffect(() => { fetchMetadata(); }, [fetchMetadata]);

    const filteredTasks = tasks.filter((task) =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.taskCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getTasksByStatus = (status: string) => filteredTasks.filter((t) => t.status === status);

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.effectAllowed = 'move';
        (e.currentTarget as HTMLElement).style.opacity = '0.4';
    };
    const handleDragEnd = (e: React.DragEvent) => { (e.currentTarget as HTMLElement).style.opacity = '1'; };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (!taskId) return;
        const taskToUpdate = tasks.find(t => t.id === taskId);
        if (!taskToUpdate || taskToUpdate.status === newStatus) return;
        const originalTasks = [...tasks];
        setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        try {
            const response = await fetch(`/api/it/tasks/${taskId}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!response.ok) { setTasks(originalTasks); }
        } catch { setTasks(originalTasks); }
    };

    const TaskCard = ({ task }: { task: Task }) => {
        const pri = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.LOW;
        const typ = TYPE_COLOR[task.type] || { bg: 'bg-slate-500/10', text: 'text-slate-400' };
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';

        return (
            <div
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragEnd={handleDragEnd}
                onClick={() => { setSelectedTask(task); setShowTaskModal(true); }}
                className="cursor-grab active:cursor-grabbing"
            >
                <motion.div
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
                    className="group relative bg-slate-800/50 hover:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-white/5 hover:border-white/10 p-4 transition-all overflow-hidden"
                >
                    {/* Priority left-bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl ${task.priority === 'CRITICAL' ? 'bg-rose-500' : task.priority === 'HIGH' ? 'bg-orange-500' : task.priority === 'MEDIUM' ? 'bg-amber-400' : 'bg-emerald-400'}`} />

                    <div className="pl-1.5">
                        <div className="flex items-center justify-between mb-2.5">
                            <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${pri.bg} ${pri.text} ${pri.border}`}>
                                {task.priority}
                            </div>
                            {isOverdue && (
                                <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1">
                                    <AlertTriangle className="h-2.5 w-2.5" /> Overdue
                                </span>
                            )}
                        </div>

                        <h4 className="font-bold text-slate-200 text-sm mb-2 line-clamp-2 leading-tight group-hover:text-white transition-colors">
                            {task.title}
                        </h4>

                        <div className="flex flex-wrap gap-1.5 mb-3">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold ${typ.bg} ${typ.text}`}>
                                {task.type.replace('_', ' ')}
                            </span>
                            {task.isRevenueBased && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-500/10 text-emerald-400">
                                    <DollarSign className="h-2.5 w-2.5 mr-0.5" />₹{task.itRevenueEarned.toLocaleString()}
                                </span>
                            )}
                        </div>

                        {task.project && (
                            <div className="flex items-center gap-1 text-[9px] text-slate-600 font-medium mb-2">
                                <LayoutGrid className="h-2.5 w-2.5" />
                                <span className="truncate">{task.project.name}</span>
                            </div>
                        )}

                        {task.progressPercent > 0 && (
                            <div className="mb-3">
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${task.progressPercent}%` }}
                                        className={`h-full rounded-full ${task.progressPercent === 100 ? 'bg-emerald-400' : 'bg-blue-400'}`}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
                            <div>
                                {task.assignedTo ? (
                                    <div className="h-6 w-6 rounded-lg bg-blue-600 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold text-white" title={task.assignedTo.name}>
                                        {task.assignedTo.name.charAt(0)}
                                    </div>
                                ) : (
                                    <div className="h-6 w-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-600" title="Unassigned">
                                        <User className="h-3 w-3" />
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-600">
                                {task.dueDate && (
                                    <span className="flex items-center gap-0.5">
                                        <Clock className="h-2.5 w-2.5" />{new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                    </span>
                                )}
                                <span>💬 {task._count.comments}</span>
                                <span className="text-slate-700">#{task.taskCode}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    };

    return (
        <DashboardLayout>
            <div className="min-h-screen pb-24 space-y-8">

                {/* ── HEADER ──────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-2xl overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900" />
                    <div className="absolute inset-0 opacity-20"
                        style={{ backgroundImage: 'radial-gradient(ellipse at 80% 50%, rgba(139,92,246,0.5) 0%, transparent 60%)' }} />

                    <div className="relative p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-violet-500/20 border border-violet-500/30 rounded-xl">
                                <Kanban className="h-5 w-5 text-violet-400" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white tracking-tight">Task Engineering</h1>
                                <p className="text-slate-400 text-sm font-medium">Orchestrating IT workflows with drag-and-drop precision.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <button onClick={() => router.push('/dashboard/it-management/tasks/guidelines')}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all">
                                <BookOpen className="h-4 w-4 text-slate-400" /> Guidelines
                            </button>
                            {!isEmployee && (
                                <button onClick={() => router.push('/dashboard/it-management/tasks/new')}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-violet-500 shadow-lg shadow-violet-500/25 transition-all active:scale-95">
                                    <Plus className="h-4 w-4" /> New Task
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* ── FILTERS ─────────────────────────────────── */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                    className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
                >
                    <div className="p-5 flex flex-col md:flex-row gap-3">
                        {/* View switcher */}
                        <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl gap-1 shrink-0">
                            <button onClick={() => setView('my')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'my' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                                Personal
                            </button>
                            {!isEmployee && (
                                <button onClick={() => setView('team')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'team' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                                    Squad
                                </button>
                            )}
                            {canManage && (
                                <button onClick={() => setView('all')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'all' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                                    Global
                                </button>
                            )}
                        </div>

                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input type="text" placeholder="Search by task code, title or keyword..."
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors" />
                        </div>

                        <button onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all shrink-0 ${showFilters ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                            <Filter className="h-4 w-4" /> Filters
                        </button>
                    </div>

                    <AnimatePresence>
                        {showFilters && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 border-t border-white/10 grid grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
                                    {[
                                        { label: 'Category', value: typeFilter, onChange: setTypeFilter, options: [['', 'All Streams'], ['REVENUE', 'Revenue'], ['SUPPORT', 'Support'], ['MAINTENANCE', 'Maintenance'], ['URGENT', 'Emergency'], ['SERVICE_REQUEST', 'Service Req']] },
                                        { label: 'Priority', value: priorityFilter, onChange: setPriorityFilter, options: [['', 'All Severity'], ['CRITICAL', 'Critical'], ['HIGH', 'High'], ['MEDIUM', 'Standard'], ['LOW', 'Low']] },
                                        { label: 'Project', value: projectFilter, onChange: setProjectFilter, options: [['', 'All Projects'], ...allProjects.map(p => [p.id, p.name])] },
                                        { label: 'Assigned To', value: assignedToFilter, onChange: setAssignedToFilter, options: [['', 'All Members'], ...allUsers.map(u => [u.id, u.name])] },
                                    ].map((f) => (
                                        <div key={f.label} className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">{f.label}</label>
                                            <select value={f.value} onChange={(e) => f.onChange(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-violet-500/50" title={f.label}>
                                                {f.options.map(([val, lbl]) => (
                                                    <option key={val} value={val} className="bg-slate-900">{lbl}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* ── KANBAN BOARD ────────────────────────────── */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <div className="h-10 w-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Loading board...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
                        {STATUSES.map((status, statusIndex) => {
                            const statusTasks = getTasksByStatus(status.value);
                            return (
                                <motion.div key={status.value}
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * statusIndex }}
                                    className={`relative rounded-2xl ${status.bg} border ${status.accent} backdrop-blur-sm min-h-[500px] flex flex-col overflow-hidden`}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, status.value)}
                                >
                                    {/* Column header */}
                                    <div className={`${status.headerBg} border-b ${status.accent} p-4 flex items-center justify-between`}>
                                        <div className="flex items-center gap-2.5">
                                            <div className={`h-2 w-2 rounded-full ${status.dot} shadow-[0_0_8px_currentColor]`} />
                                            <h3 className={`font-black uppercase tracking-widest text-xs ${status.text}`}>{status.label}</h3>
                                        </div>
                                        <span className={`${status.countBg} ${status.text} text-[10px] font-black px-2.5 py-1 rounded-lg border ${status.accent}`}>
                                            {statusTasks.length}
                                        </span>
                                    </div>

                                    {/* Cards */}
                                    <div className="flex-1 p-3 space-y-3 min-h-[400px]">
                                        <AnimatePresence mode="popLayout">
                                            {statusTasks.length === 0 ? (
                                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                    className="flex flex-col items-center justify-center py-16 border border-dashed border-white/5 rounded-xl mt-2"
                                                >
                                                    <Kanban className="h-6 w-6 text-slate-700 mb-2" />
                                                    <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest text-center leading-relaxed">
                                                        Drop tasks here
                                                    </p>
                                                </motion.div>
                                            ) : (
                                                statusTasks.map((task) => <TaskCard key={task.id} task={task} />)
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* ── BOARD ANALYTICS FOOTER ──────────────────── */}
                <AnimatePresence>
                    {!loading && filteredTasks.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20">
                                    <Activity className="h-4 w-4 text-violet-400" />
                                </div>
                                <h3 className="font-black text-white">Board Analytics</h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                                <div className="space-y-1 text-center">
                                    <p className="text-3xl font-black text-white">{filteredTasks.length}</p>
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Total Tasks</p>
                                </div>
                                {STATUSES.map((status) => (
                                    <div key={status.value} className="space-y-1 text-center">
                                        <p className={`text-3xl font-black ${status.text}`}>{getTasksByStatus(status.value).length}</p>
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{status.label}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <TaskDetailModal
                    isOpen={showTaskModal}
                    onClose={() => setShowTaskModal(false)}
                    taskId={selectedTask?.id}
                    task={selectedTask || undefined}
                    onSuccess={() => { fetchTasks(); }}
                    allUsers={allUsers}
                    allProjects={allProjects}
                    otherTasks={tasks}
                />
            </div>
        </DashboardLayout>
    );
}
