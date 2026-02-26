'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    Plus, Search, Filter, ListTodo, DollarSign, Clock, User, AlertCircle, BookOpen,
    ChevronRight, MoreVertical, LayoutGrid, Kanban, Target, CheckCircle2, AlertTriangle
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
    { value: 'PENDING', label: 'To Do', bg: 'bg-slate-50/50', dot: 'bg-slate-400', accent: 'border-slate-200', text: 'text-slate-700' },
    { value: 'IN_PROGRESS', label: 'In Progress', bg: 'bg-blue-50/50', dot: 'bg-blue-500', accent: 'border-blue-200', text: 'text-blue-700' },
    { value: 'UNDER_REVIEW', label: 'In Review', bg: 'bg-amber-50/50', dot: 'bg-amber-500', accent: 'border-amber-200', text: 'text-amber-700' },
    { value: 'COMPLETED', label: 'Completed', bg: 'bg-emerald-50/50', dot: 'bg-emerald-500', accent: 'border-emerald-200', text: 'text-emerald-700' },
];

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
        // Add visual feedback to the dragged element
        const element = e.currentTarget as HTMLElement;
        element.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        const element = e.currentTarget as HTMLElement;
        element.style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

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
            if (!response.ok) { setTasks(originalTasks); alert('Failed to update status'); }
        } catch {
            setTasks(originalTasks); alert('Failed to update status');
        }
    };

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'CRITICAL': return 'bg-rose-50 text-rose-700 border-rose-100';
            case 'HIGH': return 'bg-orange-50 text-orange-700 border-orange-100';
            case 'MEDIUM': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'LOW': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'REVENUE': return 'bg-blue-100 text-blue-800';
            case 'SUPPORT': return 'bg-purple-100 text-purple-800';
            case 'MAINTENANCE': return 'bg-slate-200 text-slate-800';
            case 'URGENT': return 'bg-rose-100 text-rose-800';
            case 'SERVICE_REQUEST': return 'bg-cyan-100 text-cyan-800';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const TaskCard = ({ task }: { task: Task }) => (
        <div
            draggable
            onDragStart={(e) => handleDragStart(e, task.id)}
            onDragEnd={handleDragEnd}
            onClick={() => { setSelectedTask(task); setShowTaskModal(true); }}
            className="cursor-grab active:cursor-grabbing"
        >
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -4, boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)' }}
            className="group relative bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-4 transition-all overflow-hidden"
        >
            {/* Top Bar with Priority Indicator */}
            <div className="flex items-center justify-between mb-3">
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight border ${getPriorityStyle(task.priority)}`}>
                    {task.priority}
                </div>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                        <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            <h4 className="font-bold text-slate-900 text-sm mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                {task.title}
            </h4>

            {/* Tags & Metadata */}
            <div className="flex flex-wrap gap-1.5 mb-4">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-[10px] font-bold ${getTypeColor(task.type)}`}>
                    {task.type}
                </span>
                {task.isRevenueBased && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800">
                        <DollarSign className="h-2.5 w-2.5 mr-0.5" /> ₹{task.itRevenueEarned.toLocaleString()}
                    </span>
                )}
            </div>

            {/* Context Info */}
            <div className="space-y-2 mb-4">
                {task.project && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                        <LayoutGrid className="h-3 w-3" />
                        <span className="truncate">{task.project.name}</span>
                    </div>
                )}
                {task.dueDate && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                        <Clock className="h-3 w-3" />
                        <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                )}
            </div>

            {/* Progress Bar (Visual Only if > 0) */}
            {task.progressPercent > 0 && (
                <div className="mb-4">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${task.progressPercent}%` }}
                            className={`h-full rounded-full ${task.progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        />
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex -space-x-1.5">
                    {task.assignedTo ? (
                         <div className="h-6 w-6 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm" title={task.assignedTo.name}>
                            {task.assignedTo.name.charAt(0)}
                         </div>
                    ) : (
                        <div className="h-6 w-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-400" title="Unassigned">
                            <User className="h-3 w-3" />
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-2.5 text-[10px] font-bold text-slate-400">
                    <span className="flex items-center gap-1">💬 {task._count.comments}</span>
                    <span className="text-slate-300 font-light">|</span>
                    <span className="text-slate-600">#{task.taskCode}</span>
                </div>
            </div>
        </motion.div>
        </div>
    );

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
                                <Kanban className="h-6 w-6 text-white" />
                            </div>
                            Task Engineering
                        </h1>
                        <p className="text-slate-500 font-medium ml-1">Orchestrating IT workflows and revenue-driven engineering.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/dashboard/it-management/tasks/guidelines')}
                            className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 text-sm font-bold flex items-center gap-2 hover:bg-slate-50 hover:shadow-lg transition-all"
                        >
                            <BookOpen className="h-4 w-4" /> Guidelines
                        </button>
                        {!isEmployee && (
                            <button
                                onClick={() => router.push('/dashboard/it-management/tasks/new')}
                                className="px-6 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95"
                            >
                                <Plus className="h-4 w-4" /> New Task
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* Glass Search & Filters */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="p-1 bg-white/40 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-inner group"
                >
                    <div className="p-6 space-y-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* View Switcher */}
                            <div className="flex bg-slate-200/50 p-1 rounded-2xl">
                                <button onClick={() => setView('my')}
                                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'my' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    Personal
                                </button>
                                {!isEmployee && (
                                    <button onClick={() => setView('team')}
                                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'team' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                        Squad
                                    </button>
                                )}
                                {canManage && (
                                    <button onClick={() => setView('all')}
                                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                        Global
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input type="text" placeholder="Trace task ID, title or keyword..."
                                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white/50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400" />
                            </div>

                            <button onClick={() => setShowFilters(!showFilters)}
                                className={`px-5 py-3 rounded-2xl border text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${showFilters ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                <Filter className="h-4 w-4" /> Filters
                            </button>
                        </div>

                        <AnimatePresence>
                            {showFilters && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                <Target className="h-3 w-3" /> Category
                                            </label>
                                            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full bg-white border-slate-200 rounded-xl py-2 text-xs font-bold" title="Category Filter">
                                                <option value="">All Streams</option>
                                                <option value="REVENUE">Revenue-Linked</option>
                                                <option value="SUPPORT">Internal Support</option>
                                                <option value="MAINTENANCE">Maintenance</option>
                                                <option value="URGENT">Emergency Fix</option>
                                                <option value="SERVICE_REQUEST">Service Request</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                <AlertTriangle className="h-3 w-3" /> Priority
                                            </label>
                                            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="w-full bg-white border-slate-200 rounded-xl py-2 text-xs font-bold" title="Priority Filter">
                                                <option value="">All Severity</option>
                                                <option value="HIGH">High Priority</option>
                                                <option value="MEDIUM">Standard</option>
                                                <option value="LOW">Low</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                <LayoutGrid className="h-3 w-3" /> Project
                                            </label>
                                            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="w-full bg-white border-slate-200 rounded-xl py-2 text-xs font-bold" title="Project Filter">
                                                <option value="">All Missions</option>
                                                {Array.isArray(allProjects) && allProjects.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                <User className="h-3 w-3" /> Assigned To
                                            </label>
                                            <select value={assignedToFilter} onChange={(e) => setAssignedToFilter(e.target.value)} className="w-full bg-white border-slate-200 rounded-xl py-2 text-xs font-bold" title="Assignee Filter">
                                                <option value="">Full Roster</option>
                                                {Array.isArray(allUsers) && allUsers.map(u => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Kanban Board with Layout Animations */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="h-10 w-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Synchronizing Task Data...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                        {STATUSES.map((status, statusIndex) => {
                            const statusTasks = getTasksByStatus(status.value);
                            return (
                                <motion.div 
                                    key={status.value}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 * statusIndex }}
                                    className={`relative rounded-[2.5rem] ${status.bg} border border-white/50 p-5 shadow-sm group/col min-h-[600px] flex flex-col`}
                                    onDragOver={handleDragOver} 
                                    onDrop={(e) => handleDrop(e, status.value)}
                                >
                                    <div className="flex items-center justify-between mb-6 px-1">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-2.5 w-2.5 rounded-full ${status.dot} shadow-[0_0_12px_rgba(0,0,0,0.1)]`} />
                                            <h3 className={`font-black uppercase tracking-widest text-xs ${status.text}`}>{status.label}</h3>
                                        </div>
                                        <span className="bg-white/80 backdrop-blur shadow-sm text-slate-600 text-[10px] font-black px-2.5 py-1 rounded-full border border-slate-100">
                                            {statusTasks.length}
                                        </span>
                                    </div>

                                    <div className="flex-1 space-y-4 min-h-[400px]">
                                        <AnimatePresence mode="popLayout">
                                            {statusTasks.length === 0 ? (
                                                <motion.div 
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed border-slate-200/50 rounded-3xl"
                                                >
                                                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-300">
                                                        <Kanban className="h-6 w-6" />
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center leading-relaxed">
                                                        Drag tasks here to change status
                                                    </p>
                                                </motion.div>
                                            ) : (
                                                statusTasks.map((task) => <TaskCard key={task.id} task={task} />)
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    
                                    {/* Column Decorative Bottom Brush */}
                                    <div className={`mt-4 h-1.5 w-12 self-center rounded-full opacity-20 ${status.dot}`} />
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Visual Summary Footer */}
                <AnimatePresence>
                    {!loading && filteredTasks.length > 0 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white/80 p-8 shadow-2xl"
                        >
                            <div className="flex items-center gap-4 mb-8">
                                <div className="h-10 w-10 rounded-2xl bg-slate-900 flex items-center justify-center">
                                    <ListTodo className="h-5 w-5 text-white" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Board Analytics</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                                <div className="space-y-2">
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-4xl font-black text-slate-900">{filteredTasks.length}</p>
                                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Aggregate Tasks</p>
                                </div>
                                {STATUSES.map((status) => (
                                    <div key={status.value} className="space-y-2">
                                        <div className="flex items-baseline gap-2">
                                            <p className="text-4xl font-black text-slate-900">{getTasksByStatus(status.value).length}</p>
                                            <div className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{status.label}</p>
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
