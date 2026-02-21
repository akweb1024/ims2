'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    Plus,
    Search,
    Filter,
    ListTodo,
    DollarSign,
    Clock,
    User,
    AlertCircle,
    BookOpen,
} from 'lucide-react';
import TaskDetailModal from '@/components/dashboard/it/TaskDetailModal';

interface Task {
    id: string;
    taskCode: string;
    title: string;
    description: string | null;
    category: string;
    type: string;
    priority: string;
    status: string;
    isRevenueBased: boolean;
    estimatedValue: number;
    itRevenueEarned: number;
    dueDate: string | null;
    progressPercent: number;
    estimatedHours: number | null;
    assignedToId: string | null;
    projectId: string | null;
    dependencies: string[];
    project: {
        id: string;
        name: string;
        projectCode: string;
    } | null;
    assignedTo: {
        id: string;
        name: string;
        email: string;
    } | null;
    _count: {
        comments: number;
        timeEntries: number;
    };
}

const STATUSES = [
    { value: 'PENDING', label: 'To Do', color: 'bg-gray-100 dark:bg-gray-800' },
    { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-50 dark:bg-blue-900/20' },
    { value: 'TESTING', label: 'Testing', color: 'bg-purple-50 dark:bg-purple-900/20' },
    { value: 'UNDER_REVIEW', label: 'Review', color: 'bg-amber-50 dark:bg-amber-900/20' },
    { value: 'COMPLETED', label: 'Done', color: 'bg-green-50 dark:bg-green-900/20' },
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
            if (response.ok) {
                const data = await response.json();
                setTasks(data);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    }, [view, typeFilter, priorityFilter, projectFilter, assignedToFilter]);

    const fetchMetadata = useCallback(async () => {
        try {
            const [projectsRes, usersRes] = await Promise.all([
                fetch('/api/it/projects'),
                fetch('/api/users?limit=100')
            ]);
            if (projectsRes.ok) {
                const projectsData = await projectsRes.json();
                setAllProjects(Array.isArray(projectsData) ? projectsData : (projectsData.data || []));
            }
            if (usersRes.ok) {
                const usersData = await usersRes.json();
                setAllUsers(Array.isArray(usersData) ? usersData : (usersData.data || []));
            }
        } catch (error) {
            console.error('Failed to fetch filter metadata:', error);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    useEffect(() => {
        fetchMetadata();
    }, [fetchMetadata]);

    const filteredTasks = tasks.filter((task) =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.taskCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getTasksByStatus = (status: string) => {
        return filteredTasks.filter((task) => task.status === status);
    };

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

        // Optimistic update
        const taskToUpdate = tasks.find(t => t.id === taskId);
        if (!taskToUpdate || taskToUpdate.status === newStatus) return;

        const originalTasks = [...tasks];
        setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        try {
            const response = await fetch(`/api/it/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                setTasks(originalTasks);
                alert('Failed to update status');
            }
        } catch (error) {
            console.error('Failed to update status:', error);
            setTasks(originalTasks);
            alert('Failed to update status');
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'HIGH':
                return 'border-l-4 border-red-500';
            case 'MEDIUM':
                return 'border-l-4 border-yellow-500';
            case 'LOW':
                return 'border-l-4 border-green-500';
            default:
                return 'border-l-4 border-gray-500';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'REVENUE':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'SUPPORT':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'MAINTENANCE':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'URGENT':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            case 'SERVICE_REQUEST':
                return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    const TaskCard = ({ task }: { task: Task }) => (
        <div
            draggable
            onDragStart={(e) => handleDragStart(e, task.id)}
            onClick={() => {
                setSelectedTask(task);
                setShowTaskModal(true);
            }}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer p-4 mb-3 active:scale-95 active:rotate-1 ${getPriorityColor(
                task.priority
            )}`}
        >
            {/* Task Header */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {task.taskCode}
                    </p>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">
                        {task.title}
                    </h4>
                </div>
            </div>

            {/* Task Type Badge */}
            <div className="flex flex-wrap gap-2 mb-3">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(task.type)}`}>
                    {task.type}
                </span>
                {task.isRevenueBased && (
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        💰 ₹{task.itRevenueEarned.toLocaleString()}
                    </span>
                )}
            </div>

            {/* Project */}
            {task.project && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 truncate">
                    📁 {task.project.name}
                </p>
            )}

            {/* Progress Bar */}
            {task.progressPercent > 0 && (
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Progress</span>
                        <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {task.progressPercent}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${task.progressPercent}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {task._count.comments > 0 && (
                        <span className="flex items-center gap-1">
                            💬 {task._count.comments}
                        </span>
                    )}
                    {task._count.timeEntries > 0 && (
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task._count.timeEntries}
                        </span>
                    )}
                </div>

                {task.assignedTo && (
                    <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[100px]">
                            {task.assignedTo.name.split(' ')[0]}
                        </span>
                    </div>
                )}
            </div>

            {/* Due Date */}
            {task.dueDate && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                </div>
            )}
        </div>
    );

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <ListTodo className="h-8 w-8 text-purple-600" />
                            Task Board
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Manage tasks with Kanban board
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/dashboard/it-management/tasks/guidelines')}
                            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-purple-600 dark:text-purple-400 px-6 py-3 rounded-lg font-medium flex items-center gap-2 shadow hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"
                        >
                            <BookOpen className="h-5 w-5" />
                            Guidelines
                        </button>
                        {!isEmployee && (
                            <button
                                onClick={() => router.push('/dashboard/it-management/tasks/new')}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                            >
                                <Plus className="h-5 w-5" />
                                New Task
                            </button>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* View Selector */}
                        <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                            <button
                                onClick={() => setView('my')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'my'
                                    ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400'
                                    }`}
                                title="Show my tasks"
                            >
                                My Tasks
                            </button>
                            {!isEmployee && (
                                <button
                                    onClick={() => setView('team')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'team'
                                        ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400'
                                        }`}
                                    title="Show team tasks"
                                >
                                    Team
                                </button>
                            )}
                            {canManage && (
                                <button
                                    onClick={() => setView('all')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'all'
                                        ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400'
                                        }`}
                                    title="Show all tasks"
                                >
                                    All
                                </button>
                            )}
                        </div>

                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        {/* Filter Button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                            <Filter className="h-5 w-5" />
                            Filters
                        </button>
                    </div>

                    {/* Filter Options */}
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Type
                                </label>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                                    title="Filter by Type"
                                >
                                    <option value="">All Types</option>
                                    <option value="REVENUE">Revenue</option>
                                    <option value="SUPPORT">Support</option>
                                    <option value="MAINTENANCE">Maintenance</option>
                                    <option value="URGENT">Urgent</option>
                                    <option value="SERVICE_REQUEST">Service Request</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Priority
                                </label>
                                <select
                                    value={priorityFilter}
                                    onChange={(e) => setPriorityFilter(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                                    title="Filter by Priority"
                                >
                                    <option value="">All Priorities</option>
                                    <option value="HIGH">High</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="LOW">Low</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Project
                                </label>
                                <select
                                    value={projectFilter}
                                    onChange={(e) => setProjectFilter(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                                    title="Filter by Project"
                                >
                                    <option value="">All Projects</option>
                                    {Array.isArray(allProjects) && allProjects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Assigned To
                                </label>
                                <select
                                    value={assignedToFilter}
                                    onChange={(e) => setAssignedToFilter(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                                    title="Filter by Assigned To"
                                >
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
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {STATUSES.map((status) => {
                            const statusTasks = getTasksByStatus(status.value);
                            return (
                                <div
                                    key={status.value}
                                    className={`rounded-xl ${status.color} p-4 transition-colors min-w-[280px]`}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, status.value)}
                                >
                                    {/* Column Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            {status.label}
                                            <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium px-2 py-0.5 rounded-full">
                                                {statusTasks.length}
                                            </span>
                                        </h3>
                                    </div>

                                    {/* Tasks */}
                                    <div className="space-y-3 min-h-[400px]">
                                        {statusTasks.length === 0 ? (
                                            <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-gray-400 dark:text-gray-500 text-sm">
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
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Summary
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {filteredTasks.length}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</p>
                            </div>
                            {STATUSES.map((status) => (
                                <div key={status.value} className="text-center">
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {getTasksByStatus(status.value).length}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{status.label}</p>
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
                    onSuccess={() => {
                        fetchTasks();
                    }}
                    allUsers={allUsers}
                    allProjects={allProjects}
                    otherTasks={tasks} // Pass all tasks for dependencies
                />
            </div>
        </DashboardLayout >
    );
}
