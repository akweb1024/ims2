'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ListTodo,
    FolderKanban,
    Clock,
    CheckCircle2,
    CircleDot,
    AlertCircle,
    ArrowRight,
    BarChart3,
    RefreshCw,
    Eye,
    ChevronRight,
    Calendar,
    User,
    Tag,
} from 'lucide-react';

interface Task {
    id: string;
    taskCode: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    category: string;
    progressPercent: number;
    dueDate?: string;
    project?: { id: string; name: string; projectCode: string };
    assignedTo?: { id: string; name: string; email: string };
    createdBy?: { id: string; name: string; email: string };
    tags: string[];
}

interface Project {
    id: string;
    projectCode: string;
    name: string;
    status: string;
    priority: string;
    category: string;
    stats: {
        totalTasks: number;
        completedTasks: number;
        inProgressTasks: number;
        completionRate: number;
    };
    projectManager?: { id: string; name: string; email: string };
    teamLead?: { id: string; name: string; email: string };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING: { label: 'Pending', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: <Clock className="h-3.5 w-3.5" /> },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: <CircleDot className="h-3.5 w-3.5" /> },
    UNDER_REVIEW: { label: 'Under Review', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: <Eye className="h-3.5 w-3.5" /> },
    COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: <AlertCircle className="h-3.5 w-3.5" /> },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    LOW: { label: 'Low', color: 'text-green-600 dark:text-green-400' },
    MEDIUM: { label: 'Medium', color: 'text-yellow-600 dark:text-yellow-400' },
    HIGH: { label: 'High', color: 'text-orange-600 dark:text-orange-400' },
    URGENT: { label: 'Critical', color: 'text-red-600 dark:text-red-400' },
    CRITICAL: { label: 'Critical', color: 'text-red-600 dark:text-red-400' },
};

const PROJECT_STATUS_COLOR: Record<string, string> = {
    PLANNING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    ACTIVE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    ON_HOLD: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

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
            const [tasksRes, projectsRes] = await Promise.all([
                fetch('/api/it/tasks?view=my'),
                fetch('/api/it/projects'),
            ]);

            if (tasksRes.ok) {
                const data = await tasksRes.json();
                setTasks(Array.isArray(data) ? data : []);
            }
            if (projectsRes.ok) {
                const data = await projectsRes.json();
                setProjects(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleStatusUpdate = async (taskId: string, newStatus: string) => {
        setUpdatingTaskId(taskId);
        try {
            const res = await fetch(`/api/it/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
            }
        } catch (err) {
            console.error('Status update failed:', err);
        } finally {
            setUpdatingTaskId(null);
        }
    };

    const handleProgressUpdate = async (taskId: string, progress: number) => {
        try {
            const res = await fetch(`/api/it/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ progressPercent: progress }),
            });
            if (res.ok) {
                setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progressPercent: progress } : t));
            }
        } catch (err) {
            console.error('Progress update failed:', err);
        }
    };

    // Stats
    const stats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'PENDING').length,
        inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        underReview: tasks.filter(t => t.status === 'UNDER_REVIEW').length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
    };

    const filteredTasks = activeFilter === 'ALL' ? tasks :
        tasks.filter(t => t.status === activeFilter);

    const isOverdue = (dueDate?: string) => {
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Loading your workspace...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <ListTodo className="h-8 w-8 text-purple-600" />
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Workspace</h1>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">Your assigned tasks and projects at a glance</p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 text-sm"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                        { label: 'Total Tasks', value: stats.total, color: 'from-purple-500 to-purple-700', filter: 'ALL' },
                        { label: 'Pending', value: stats.pending, color: 'from-gray-400 to-gray-600', filter: 'PENDING' },
                        { label: 'In Progress', value: stats.inProgress, color: 'from-blue-500 to-blue-700', filter: 'IN_PROGRESS' },
                        { label: 'Under Review', value: stats.underReview, color: 'from-amber-500 to-amber-700', filter: 'UNDER_REVIEW' },
                        { label: 'Completed', value: stats.completed, color: 'from-green-500 to-green-700', filter: 'COMPLETED' },
                    ].map((stat) => (
                        <button
                            key={stat.filter}
                            onClick={() => setActiveFilter(stat.filter)}
                            className={`bg-gradient-to-br ${stat.color} rounded-xl p-4 text-white text-left shadow-lg hover:shadow-xl transition-all hover:scale-105 ${activeFilter === stat.filter ? 'ring-4 ring-white/40' : ''}`}
                        >
                            <p className="text-3xl font-bold">{stat.value}</p>
                            <p className="text-sm opacity-90 mt-1">{stat.label}</p>
                        </button>
                    ))}
                </div>

                {/* My Projects */}
                {projects.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <FolderKanban className="h-5 w-5 text-blue-600" />
                                My Projects
                                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{projects.length}</span>
                            </h2>
                            <button
                                onClick={() => router.push('/dashboard/it-management/projects')}
                                className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1"
                            >
                                View All <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    onClick={() => router.push(`/dashboard/it-management/projects/${project.id}`)}
                                    className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 cursor-pointer hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-700 group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-1">{project.projectCode}</p>
                                            <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{project.name}</h3>
                                        </div>
                                        <span className={`ml-2 shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${PROJECT_STATUS_COLOR[project.status] || 'bg-gray-100 text-gray-600'}`}>
                                            {project.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="mb-3">
                                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                            <span>{project.stats.completedTasks}/{project.stats.totalTasks} tasks done</span>
                                            <span>{project.stats.completionRate}%</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                                            <div
                                                className="h-1.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                                                style={{ width: `${project.stats.completionRate}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <BarChart3 className="h-3.5 w-3.5" />
                                        <span>{project.stats.inProgressTasks} in progress</span>
                                        <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-purple-500" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* My Tasks */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <ListTodo className="h-5 w-5 text-purple-600" />
                            My Tasks
                            {activeFilter !== 'ALL' && (
                                <span className="text-sm font-normal text-purple-600 dark:text-purple-400">
                                    — {STATUS_CONFIG[activeFilter]?.label}
                                </span>
                            )}
                            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{filteredTasks.length}</span>
                        </h2>
                        {activeFilter !== 'ALL' && (
                            <button onClick={() => setActiveFilter('ALL')} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
                                Clear filter ×
                            </button>
                        )}
                    </div>

                    {filteredTasks.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
                            <ListTodo className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tasks found</h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                {activeFilter === 'ALL'
                                    ? 'You have no tasks assigned yet. Your manager will assign tasks to you.'
                                    : `No ${STATUS_CONFIG[activeFilter]?.label?.toLowerCase()} tasks at the moment.`}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredTasks.map((task) => {
                                const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
                                const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
                                const overdue = isOverdue(task.dueDate) && task.status !== 'COMPLETED';

                                return (
                                    <div
                                        key={task.id}
                                        className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border transition-all ${overdue ? 'border-red-200 dark:border-red-800' : 'border-gray-100 dark:border-gray-700'} hover:shadow-lg`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{task.taskCode}</span>
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>
                                                        {statusCfg.icon}{statusCfg.label}
                                                    </span>
                                                    <span className={`text-xs font-semibold ${priorityCfg.color}`}>● {priorityCfg.label}</span>
                                                    {overdue && (
                                                        <span className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                                                            <AlertCircle className="h-3 w-3" /> Overdue
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{task.title}</h3>
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                                                    {task.project && (
                                                        <span className="flex items-center gap-1"><FolderKanban className="h-3.5 w-3.5 text-blue-400" />{task.project.name}</span>
                                                    )}
                                                    {task.dueDate && (
                                                        <span className={`flex items-center gap-1 ${overdue ? 'text-red-500 dark:text-red-400' : ''}`}>
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            Due {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    )}
                                                    {task.tags.length > 0 && (
                                                        <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" />{task.tags.slice(0, 2).join(', ')}</span>
                                                    )}
                                                    {task.createdBy && (
                                                        <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />By {task.createdBy.name}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                                                        <div
                                                            className="h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                                                            style={{ width: `${task.progressPercent}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right font-medium">{task.progressPercent}%</span>
                                                </div>
                                            </div>

                                            {/* Controls */}
                                            <div className="flex flex-col gap-2 shrink-0">
                                                <select
                                                    value={task.status}
                                                    onChange={(e) => handleStatusUpdate(task.id, e.target.value)}
                                                    disabled={updatingTaskId === task.id}
                                                    className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:opacity-50 cursor-pointer"
                                                    title="Update Status"
                                                >
                                                    <option value="PENDING">Pending</option>
                                                    <option value="IN_PROGRESS">In Progress</option>
                                                    <option value="UNDER_REVIEW">Under Review</option>
                                                    <option value="COMPLETED">Completed</option>
                                                </select>

                                                <select
                                                    value={Math.round(task.progressPercent / 10) * 10}
                                                    onChange={(e) => handleProgressUpdate(task.id, parseInt(e.target.value))}
                                                    className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                                                    title="Update Progress"
                                                >
                                                    {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(v => (
                                                        <option key={v} value={v}>{v}% done</option>
                                                    ))}
                                                </select>

                                                <button
                                                    onClick={() => router.push(`/dashboard/it-management/tasks/${task.id}`)}
                                                    className="flex items-center justify-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 border border-purple-200 dark:border-purple-700 rounded-lg px-2 py-1.5 transition-colors"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />View
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
