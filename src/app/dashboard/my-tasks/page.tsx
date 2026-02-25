'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ListTodo, FolderKanban, Clock, CheckCircle2, CircleDot,
    AlertCircle, ArrowRight, BarChart3, RefreshCw, Eye, ChevronRight, Calendar, User, Tag,
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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING: { label: 'Pending', color: 'bg-secondary-100 text-secondary-600', icon: <Clock className="h-3.5 w-3.5" /> },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-primary-100 text-primary-700', icon: <CircleDot className="h-3.5 w-3.5" /> },
    UNDER_REVIEW: { label: 'Under Review', color: 'bg-warning-100 text-warning-700', icon: <Eye className="h-3.5 w-3.5" /> },
    COMPLETED: { label: 'Completed', color: 'bg-success-100 text-success-700', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    CANCELLED: { label: 'Cancelled', color: 'bg-danger-100 text-danger-700', icon: <AlertCircle className="h-3.5 w-3.5" /> },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    LOW: { label: 'Low', color: 'text-success-600' },
    MEDIUM: { label: 'Medium', color: 'text-warning-600' },
    HIGH: { label: 'High', color: 'text-orange-600' },
    URGENT: { label: 'Critical', color: 'text-danger-600' },
    CRITICAL: { label: 'Critical', color: 'text-danger-600' },
};

const PROJECT_STATUS_COLOR: Record<string, string> = {
    PLANNING: 'bg-purple-100 text-purple-700',
    ACTIVE: 'bg-primary-100 text-primary-700',
    IN_PROGRESS: 'bg-primary-100 text-primary-700',
    ON_HOLD: 'bg-warning-100 text-warning-700',
    COMPLETED: 'bg-success-100 text-success-700',
    CANCELLED: 'bg-danger-100 text-danger-700',
};

const STAT_FILTERS = [
    { label: 'Total', filter: 'ALL', bgActive: 'bg-secondary-900', key: 'total' as const },
    { label: 'Pending', filter: 'PENDING', bgActive: 'bg-warning-500', key: 'pending' as const },
    { label: 'In Progress', filter: 'IN_PROGRESS', bgActive: 'bg-primary-600', key: 'inProgress' as const },
    { label: 'Under Review', filter: 'UNDER_REVIEW', bgActive: 'bg-amber-500', key: 'underReview' as const },
    { label: 'Completed', filter: 'COMPLETED', bgActive: 'bg-success-600', key: 'completed' as const },
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
            if (tasksRes.ok) { const d = await tasksRes.json(); setTasks(Array.isArray(d) ? d : []); }
            if (projectsRes.ok) { const d = await projectsRes.json(); setProjects(Array.isArray(d) ? d : []); }
        } catch (err) { console.error('Failed to fetch data:', err); }
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
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <p className="text-secondary-500 text-sm">Loading your workspace...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-secondary-900 flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                                <ListTodo className="h-5 w-5 text-purple-600" />
                            </span>
                            My Workspace
                        </h1>
                        <p className="text-secondary-500 mt-1 text-sm">Your assigned tasks and projects at a glance</p>
                    </div>
                    <button onClick={fetchData} className="px-4 py-2.5 rounded-xl border border-secondary-200 text-secondary-600 text-sm font-medium flex items-center gap-2 hover:bg-secondary-50 transition-colors">
                        <RefreshCw className="h-4 w-4" /> Refresh
                    </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {STAT_FILTERS.map((s) => (
                        <button key={s.filter} onClick={() => setActiveFilter(s.filter)}
                            className={`card-premium p-4 text-left transition-all ${activeFilter === s.filter ? 'border-primary-300 shadow-md ring-2 ring-primary-100' : ''}`}>
                            <p className="text-2xl font-bold text-secondary-900">{stats[s.key]}</p>
                            <p className="text-xs text-secondary-500 mt-1 font-medium">{s.label}</p>
                        </button>
                    ))}
                </div>

                {/* My Projects */}
                {projects.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-secondary-900 flex items-center gap-2">
                                <FolderKanban className="h-4 w-4 text-primary-600" /> My Projects
                                <span className="text-xs font-semibold text-secondary-400 bg-secondary-100 px-2 py-0.5 rounded-full">{projects.length}</span>
                            </h2>
                            <button onClick={() => router.push('/dashboard/it-management/projects')} className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                                View All <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projects.map((project) => (
                                <div key={project.id} onClick={() => router.push(`/dashboard/it-management/projects/${project.id}`)}
                                    className="card-premium cursor-pointer hover:border-primary-200 group">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-secondary-400 font-semibold mb-1">{project.projectCode}</p>
                                            <h3 className="font-bold text-secondary-900 truncate group-hover:text-primary-600 transition-colors">{project.name}</h3>
                                        </div>
                                        <span className={`ml-2 shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold ${PROJECT_STATUS_COLOR[project.status] || 'bg-secondary-100 text-secondary-600'}`}>
                                            {project.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="mb-3">
                                        <div className="flex justify-between text-xs text-secondary-400 mb-1.5">
                                            <span>{project.stats.completedTasks}/{project.stats.totalTasks} tasks done</span>
                                            <span className="font-semibold text-primary-600">{project.stats.completionRate}%</span>
                                        </div>
                                        <div className="h-1.5 bg-secondary-100 rounded-full">
                                            <div className="h-1.5 bg-primary-500 rounded-full transition-all" style={{ width: `${project.stats.completionRate}%` }} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-secondary-400">
                                        <BarChart3 className="h-3.5 w-3.5" />
                                        <span>{project.stats.inProgressTasks} in progress</span>
                                        <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-primary-500" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* My Tasks */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-secondary-900 flex items-center gap-2">
                            <ListTodo className="h-4 w-4 text-purple-600" /> My Tasks
                            {activeFilter !== 'ALL' && <span className="text-sm font-normal text-primary-600">— {STATUS_CONFIG[activeFilter]?.label}</span>}
                            <span className="text-xs font-semibold text-secondary-400 bg-secondary-100 px-2 py-0.5 rounded-full">{filteredTasks.length}</span>
                        </h2>
                        {activeFilter !== 'ALL' && (
                            <button onClick={() => setActiveFilter('ALL')} className="text-sm text-secondary-500 hover:text-secondary-700">Clear filter ×</button>
                        )}
                    </div>

                    {filteredTasks.length === 0 ? (
                        <div className="card-premium flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-secondary-100 flex items-center justify-center mb-4">
                                <ListTodo className="h-7 w-7 text-secondary-400" />
                            </div>
                            <h3 className="text-base font-semibold text-secondary-900 mb-1">No tasks found</h3>
                            <p className="text-secondary-500 text-sm">
                                {activeFilter === 'ALL' ? 'You have no tasks assigned yet.' : `No ${STATUS_CONFIG[activeFilter]?.label?.toLowerCase()} tasks at the moment.`}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredTasks.map((task) => {
                                const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
                                const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
                                const overdue = isOverdue(task.dueDate) && task.status !== 'COMPLETED';
                                return (
                                    <div key={task.id} className={`card-premium transition-all ${overdue ? 'border-danger-200' : ''}`}>
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <span className="text-xs text-secondary-400 font-mono">{task.taskCode}</span>
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${statusCfg.color}`}>
                                                        {statusCfg.icon}{statusCfg.label}
                                                    </span>
                                                    <span className={`text-xs font-bold ${priorityCfg.color}`}>● {priorityCfg.label}</span>
                                                    {overdue && (
                                                        <span className="text-xs text-danger-600 font-semibold flex items-center gap-1">
                                                            <AlertCircle className="h-3 w-3" /> Overdue
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="font-bold text-secondary-900 mb-1.5">{task.title}</h3>
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-secondary-400 mb-3">
                                                    {task.project && <span className="flex items-center gap-1"><FolderKanban className="h-3.5 w-3.5 text-primary-400" />{task.project.name}</span>}
                                                    {task.dueDate && (
                                                        <span className={`flex items-center gap-1 ${overdue ? 'text-danger-500' : ''}`}>
                                                            <Calendar className="h-3.5 w-3.5" />Due {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    )}
                                                    {task.tags.length > 0 && <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" />{task.tags.slice(0, 2).join(', ')}</span>}
                                                    {task.createdBy && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />By {task.createdBy.name}</span>}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-1.5 bg-secondary-100 rounded-full">
                                                        <div className="h-1.5 bg-primary-500 rounded-full transition-all" style={{ width: `${task.progressPercent}%` }} />
                                                    </div>
                                                    <span className="text-xs text-secondary-500 w-10 text-right font-semibold">{task.progressPercent}%</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 shrink-0">
                                                <select value={task.status} onChange={(e) => handleStatusUpdate(task.id, e.target.value)} disabled={updatingTaskId === task.id}
                                                    className="text-xs border border-secondary-200 rounded-lg px-2 py-1.5 bg-white text-secondary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none disabled:opacity-50 cursor-pointer" title="Update Status">
                                                    <option value="PENDING">Pending</option>
                                                    <option value="IN_PROGRESS">In Progress</option>
                                                    <option value="UNDER_REVIEW">Under Review</option>
                                                    <option value="COMPLETED">Completed</option>
                                                </select>
                                                <select value={Math.round(task.progressPercent / 10) * 10} onChange={(e) => handleProgressUpdate(task.id, parseInt(e.target.value))}
                                                    className="text-xs border border-secondary-200 rounded-lg px-2 py-1.5 bg-white text-secondary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none cursor-pointer" title="Update Progress">
                                                    {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(v => <option key={v} value={v}>{v}% done</option>)}
                                                </select>
                                                <button onClick={() => router.push(`/dashboard/it-management/tasks/${task.id}`)}
                                                    className="flex items-center justify-center gap-1 text-xs text-primary-600 border border-primary-200 rounded-lg px-2 py-1.5 hover:bg-primary-50 transition-colors">
                                                    <Eye className="h-3.5 w-3.5" /> View
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
