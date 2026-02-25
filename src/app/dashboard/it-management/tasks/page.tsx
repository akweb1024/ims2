'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    Plus, Search, Filter, ListTodo, DollarSign, Clock, User, AlertCircle, BookOpen,
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
    { value: 'PENDING', label: 'To Do', bg: 'bg-secondary-50', dot: 'bg-secondary-300' },
    { value: 'IN_PROGRESS', label: 'In Progress', bg: 'bg-primary-50', dot: 'bg-primary-500' },
    { value: 'UNDER_REVIEW', label: 'Review', bg: 'bg-warning-50', dot: 'bg-warning-500' },
    { value: 'COMPLETED', label: 'Done', bg: 'bg-success-50', dot: 'bg-success-500' },
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

    const getPriorityDot = (priority: string) => {
        switch (priority) {
            case 'HIGH': return 'bg-danger-500';
            case 'MEDIUM': return 'bg-warning-400';
            case 'LOW': return 'bg-success-500';
            default: return 'bg-secondary-300';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'REVENUE': return 'bg-success-100 text-success-700';
            case 'SUPPORT': return 'bg-primary-100 text-primary-700';
            case 'MAINTENANCE': return 'bg-warning-100 text-warning-700';
            case 'URGENT': return 'bg-danger-100 text-danger-700';
            case 'SERVICE_REQUEST': return 'bg-indigo-100 text-indigo-700';
            default: return 'bg-secondary-100 text-secondary-600';
        }
    };

    const TaskCard = ({ task }: { task: Task }) => (
        <div
            draggable
            onDragStart={(e) => handleDragStart(e, task.id)}
            onClick={() => { setSelectedTask(task); setShowTaskModal(true); }}
            className="bg-white rounded-xl border border-secondary-200 hover:border-primary-200 hover:shadow-md transition-all cursor-pointer p-4 active:scale-95"
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`h-2 w-2 rounded-full ${getPriorityDot(task.priority)}`}></div>
                        <p className="text-xs font-semibold text-secondary-400 uppercase tracking-wider">{task.taskCode}</p>
                    </div>
                    <h4 className="font-semibold text-secondary-900 text-sm line-clamp-2">{task.title}</h4>
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
                <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold ${getTypeColor(task.type)}`}>{task.type}</span>
                {task.isRevenueBased && (
                    <span className="inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold bg-success-50 text-success-700">
                        💰 ₹{task.itRevenueEarned.toLocaleString()}
                    </span>
                )}
            </div>

            {task.project && (
                <p className="text-xs text-secondary-500 mb-2 truncate">📁 {task.project.name}</p>
            )}

            {task.progressPercent > 0 && (
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-secondary-400">Progress</span>
                        <span className="text-xs font-semibold text-primary-600">{task.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-secondary-100 rounded-full h-1">
                        <div className="bg-primary-500 h-1 rounded-full" style={{ width: `${task.progressPercent}%` }}></div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-secondary-100">
                <div className="flex items-center gap-3 text-xs text-secondary-400">
                    {task._count.comments > 0 && <span>💬 {task._count.comments}</span>}
                    {task._count.timeEntries > 0 && (
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{task._count.timeEntries}</span>
                    )}
                </div>
                {task.assignedTo && (
                    <div className="flex items-center gap-1 text-secondary-400">
                        <User className="h-3 w-3" />
                        <span className="text-xs truncate max-w-[100px]">{task.assignedTo.name.split(' ')[0]}</span>
                    </div>
                )}
            </div>

            {task.dueDate && (
                <p className="text-xs text-secondary-400 mt-2 pt-2 border-t border-secondary-100">
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                </p>
            )}
        </div>
    );

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-secondary-900 flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                                <ListTodo className="h-5 w-5 text-purple-600" />
                            </span>
                            Task Board
                        </h1>
                        <p className="text-secondary-500 mt-1 text-sm">Manage tasks with drag-and-drop Kanban board</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/dashboard/it-management/tasks/guidelines')}
                            className="px-4 py-2.5 rounded-xl border border-secondary-200 text-secondary-600 text-sm font-medium flex items-center gap-2 hover:bg-secondary-50 transition-colors"
                        >
                            <BookOpen className="h-4 w-4" /> Guidelines
                        </button>
                        {!isEmployee && (
                            <button
                                onClick={() => router.push('/dashboard/it-management/tasks/new')}
                                className="btn btn-primary text-sm"
                            >
                                <Plus className="h-4 w-4" /> New Task
                            </button>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="card-premium">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* View Selector */}
                        <div className="flex gap-1 bg-secondary-100 p-1 rounded-xl">
                            <button onClick={() => setView('my')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'my' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                                title="Show my tasks">My Tasks</button>
                            {!isEmployee && (
                                <button onClick={() => setView('team')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'team' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                                    title="Show team tasks">Team</button>
                            )}
                            {canManage && (
                                <button onClick={() => setView('all')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'all' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                                    title="Show all tasks">All</button>
                            )}
                        </div>

                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                            <input type="text" placeholder="Search tasks..."
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-premium pl-10" />
                        </div>

                        <button onClick={() => setShowFilters(!showFilters)}
                            className={`px-4 py-2.5 rounded-xl border text-sm font-medium flex items-center gap-2 transition-all ${showFilters ? 'bg-primary-50 border-primary-200 text-primary-600' : 'border-secondary-200 text-secondary-500 hover:bg-secondary-50'}`}>
                            <Filter className="h-4 w-4" /> Filters
                        </button>
                    </div>

                    {showFilters && (
                        <div className="mt-4 pt-4 border-t border-secondary-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="label-premium">Type</label>
                                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-premium" title="Filter by Type">
                                    <option value="">All Types</option>
                                    <option value="REVENUE">Revenue</option>
                                    <option value="SUPPORT">Support</option>
                                    <option value="MAINTENANCE">Maintenance</option>
                                    <option value="URGENT">Urgent</option>
                                    <option value="SERVICE_REQUEST">Service Request</option>
                                </select>
                            </div>
                            <div>
                                <label className="label-premium">Priority</label>
                                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="input-premium" title="Filter by Priority">
                                    <option value="">All Priorities</option>
                                    <option value="HIGH">High</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="LOW">Low</option>
                                </select>
                            </div>
                            <div>
                                <label className="label-premium">Project</label>
                                <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="input-premium" title="Filter by Project">
                                    <option value="">All Projects</option>
                                    {Array.isArray(allProjects) && allProjects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label-premium">Assigned To</label>
                                <select value={assignedToFilter} onChange={(e) => setAssignedToFilter(e.target.value)} className="input-premium" title="Filter by Assignee">
                                    <option value="">All People</option>
                                    {Array.isArray(allUsers) && allUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Kanban Board */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
                            <p className="text-secondary-500 text-sm">Loading tasks...</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {STATUSES.map((status) => {
                            const statusTasks = getTasksByStatus(status.value);
                            return (
                                <div key={status.value} className={`rounded-2xl ${status.bg} p-4 min-w-[260px]`}
                                    onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, status.value)}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className={`h-2.5 w-2.5 rounded-full ${status.dot}`}></div>
                                        <h3 className="font-bold text-secondary-800 text-sm">{status.label}</h3>
                                        <span className="ml-auto bg-white text-secondary-600 text-xs font-bold px-2 py-0.5 rounded-full border border-secondary-200">
                                            {statusTasks.length}
                                        </span>
                                    </div>

                                    <div className="space-y-3 min-h-[400px]">
                                        {statusTasks.length === 0 ? (
                                            <div className="text-center py-12 border-2 border-dashed border-secondary-200 rounded-xl text-secondary-400 text-xs">
                                                Drop tasks here
                                            </div>
                                        ) : (
                                            statusTasks.map((task) => <TaskCard key={task.id} task={task} />)
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Summary */}
                {!loading && filteredTasks.length > 0 && (
                    <div className="card-premium">
                        <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wider mb-5">Task Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
                            <div>
                                <p className="text-3xl font-bold text-secondary-900">{filteredTasks.length}</p>
                                <p className="text-xs text-secondary-500 mt-1 font-medium uppercase tracking-wide">Total</p>
                            </div>
                            {STATUSES.map((status) => (
                                <div key={status.value}>
                                    <p className="text-3xl font-bold text-secondary-900">{getTasksByStatus(status.value).length}</p>
                                    <p className="text-xs text-secondary-500 mt-1 font-medium uppercase tracking-wide">{status.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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
