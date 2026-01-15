'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    FolderKanban,
    Edit,
    Trash2,
    Calendar,
    DollarSign,
    Users,
    CheckCircle2,
    Clock,
    TrendingUp,
    AlertCircle,
    ArrowLeft,
    Plus,
    ListTodo,
} from 'lucide-react';

interface Project {
    id: string;
    projectCode: string;
    name: string;
    description: string | null;
    category: string;
    type: string;
    status: string;
    priority: string;
    isRevenueBased: boolean;
    estimatedRevenue: number;
    actualRevenue: number;
    itRevenueEarned: number;
    itDepartmentCut: number;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
    updatedAt: string;
    projectManager: {
        id: string;
        name: string;
        email: string;
    } | null;
    teamLead: {
        id: string;
        name: string;
        email: string;
    } | null;
    milestones: Array<{
        id: string;
        title: string;
        description: string;
        dueDate: string;
        status: string;
        completedAt: string | null;
    }>;
    tasks: Array<{
        id: string;
        taskCode: string;
        title: string;
        status: string;
        priority: string;
        type: string;
        progressPercent: number;
        assignedTo: {
            id: string;
            name: string;
        } | null;
    }>;
    stats: {
        totalTasks: number;
        completedTasks: number;
        inProgressTasks: number;
        completionRate: number;
    };
}

export default function ProjectDetailPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (projectId) {
            fetchProject();
        }
    }, [projectId]);

    const fetchProject = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/it/projects/${projectId}`);
            if (response.ok) {
                const data = await response.json();
                setProject(data);
            } else {
                alert('Failed to load project');
                router.push('/dashboard/it-management/projects');
            }
        } catch (error) {
            console.error('Failed to fetch project:', error);
            alert('Failed to load project');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            return;
        }

        setDeleting(true);
        try {
            const response = await fetch(`/api/it/projects/${projectId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                alert('Project deleted successfully');
                router.push('/dashboard/it-management/projects');
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to delete project');
            }
        } catch (error) {
            console.error('Failed to delete project:', error);
            alert('Failed to delete project');
        } finally {
            setDeleting(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'IN_PROGRESS':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'ON_HOLD':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'PLANNING':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
            case 'TESTING':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'CRITICAL':
                return 'text-red-600 dark:text-red-400';
            case 'HIGH':
                return 'text-orange-600 dark:text-orange-400';
            case 'MEDIUM':
                return 'text-yellow-600 dark:text-yellow-400';
            case 'LOW':
                return 'text-green-600 dark:text-green-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!project) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Project not found</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <FolderKanban className="h-8 w-8 text-blue-600" />
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {project.name}
                                </h1>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400">{project.projectCode}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(`/dashboard/it-management/projects/${projectId}/edit`)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            <Edit className="h-4 w-4" />
                            Edit
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Trash2 className="h-4 w-4" />
                            {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Status */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Status</p>
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
                            {project.status.replace('_', ' ')}
                        </span>
                    </div>

                    {/* Priority */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Priority</p>
                        <p className={`text-2xl font-bold ${getPriorityColor(project.priority)}`}>
                            {project.priority}
                        </p>
                    </div>

                    {/* Completion Rate */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Completion</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {project.stats.completionRate}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {project.stats.completedTasks} / {project.stats.totalTasks} tasks
                        </p>
                    </div>

                    {/* IT Revenue */}
                    {project.isRevenueBased && (
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                            <p className="text-green-100 text-sm mb-2">IT Revenue</p>
                            <p className="text-2xl font-bold">₹{project.itRevenueEarned.toLocaleString()}</p>
                            <p className="text-xs text-green-100 mt-1">
                                of ₹{((project.estimatedRevenue * project.itDepartmentCut) / 100).toLocaleString()} estimated
                            </p>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Description */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                Description
                            </h2>
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {project.description || 'No description provided'}
                            </p>
                        </div>

                        {/* Milestones */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    Milestones ({project.milestones.length})
                                </h2>
                            </div>

                            {project.milestones.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                                    No milestones defined
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {project.milestones.map((milestone) => (
                                        <div
                                            key={milestone.id}
                                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                                        {milestone.title}
                                                    </h3>
                                                    {milestone.description && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                            {milestone.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(milestone.status)}`}>
                                                    {milestone.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" />
                                                    Due: {new Date(milestone.dueDate).toLocaleDateString()}
                                                </div>
                                                {milestone.completedAt && (
                                                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        Completed: {new Date(milestone.completedAt).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Tasks */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <ListTodo className="h-5 w-5" />
                                    Tasks ({project.tasks.length})
                                </h2>
                                <button
                                    onClick={() => router.push(`/dashboard/it-management/tasks/new?projectId=${projectId}`)}
                                    className="flex items-center gap-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Task
                                </button>
                            </div>

                            {project.tasks.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                                    No tasks yet. Click "Add Task" to create one.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {project.tasks.map((task) => (
                                        <div
                                            key={task.id}
                                            onClick={() => router.push(`/dashboard/it-management/tasks/${task.id}`)}
                                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                            {task.taskCode}
                                                        </span>
                                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                                                            {task.status.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-medium text-gray-900 dark:text-white">
                                                        {task.title}
                                                    </h3>
                                                </div>
                                                <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    {task.assignedTo && (
                                                        <span className="flex items-center gap-1">
                                                            <Users className="h-4 w-4" />
                                                            {task.assignedTo.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                        <div
                                                            className="bg-blue-600 h-2 rounded-full"
                                                            style={{ width: `${task.progressPercent}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        {task.progressPercent}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Project Details */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                Project Details
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Category</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{project.category}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{project.type}</p>
                                </div>

                                {project.startDate && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            Start Date
                                        </p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {new Date(project.startDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}

                                {project.endDate && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            End Date
                                        </p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {new Date(project.endDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        Created
                                    </p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {new Date(project.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Team */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Team
                            </h2>

                            <div className="space-y-4">
                                {project.projectManager && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Project Manager</p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {project.projectManager.name}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {project.projectManager.email}
                                        </p>
                                    </div>
                                )}

                                {project.teamLead && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Team Lead</p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {project.teamLead.name}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {project.teamLead.email}
                                        </p>
                                    </div>
                                )}

                                {!project.projectManager && !project.teamLead && (
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                                        No team members assigned
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Revenue Breakdown */}
                        {project.isRevenueBased && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-green-600" />
                                    Revenue
                                </h2>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Estimated</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            ₹{project.estimatedRevenue.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">IT Cut ({project.itDepartmentCut}%)</span>
                                        <span className="font-medium text-green-600 dark:text-green-400">
                                            ₹{((project.estimatedRevenue * project.itDepartmentCut) / 100).toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">IT Revenue Earned</span>
                                        <span className="font-bold text-green-600 dark:text-green-400">
                                            ₹{project.itRevenueEarned.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
