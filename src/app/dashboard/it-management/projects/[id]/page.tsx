'use client';

import { useEffect, useState, useCallback } from 'react';
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
    Settings,
} from 'lucide-react';
import MilestoneModal from '@/components/dashboard/it/MilestoneModal';
import ITDocumentManager from '@/components/dashboard/it/ITDocumentManager';
import ProjectTimeline from '@/components/dashboard/it/ProjectTimeline';
import { LayoutDashboard, FileText as FileIcon, GanttChart } from 'lucide-react';

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
        name: string;
        description: string | null;
        dueDate: string;
        status: string;
        completedAt: string | null;
        paymentAmount: number | null;
        isPaid: boolean;
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

export default function ProjectDetailPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    interface Milestone {
        id: string;
        name: string;
        description: string | null;
        dueDate: string;
        status: string;
        completedAt: string | null;
        paymentAmount: number | null;
        isPaid: boolean;
    }

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [showMilestoneModal, setShowMilestoneModal] = useState(false);
    const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'documents'>('overview');

    const fetchProject = useCallback(async () => {
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
    }, [projectId, router]);

    useEffect(() => {
        if (projectId) {
            fetchProject();
        }
    }, [projectId, fetchProject]);

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

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'overview'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        Project Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('timeline')}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'timeline'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <GanttChart className="h-4 w-4" />
                        Timeline
                    </button>
                    <button
                        onClick={() => setActiveTab('documents')}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'documents'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <FileIcon className="h-4 w-4" />
                        Documents & Assets
                    </button>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {activeTab === 'overview' ? (
                            <>
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
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            <TrendingUp className="h-5 w-5 text-blue-500" />
                                            Project Milestones
                                        </h2>
                                        <button
                                            onClick={() => {
                                                setSelectedMilestone(null);
                                                setShowMilestoneModal(true);
                                            }}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-md shadow-blue-500/20"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Milestone
                                        </button>
                                    </div>

                                    {project.milestones.length === 0 ? (
                                        <div className="text-center py-10 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
                                            <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500 dark:text-gray-400">
                                                No milestones defined yet.
                                                <br />
                                                Break your project into key deliverables.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="relative space-y-6 pl-4 border-l-2 border-gray-100 dark:border-gray-700 ml-2">
                                            {project.milestones.map((milestone, index) => (
                                                <div
                                                    key={milestone.id}
                                                    className="relative group"
                                                >
                                                    {/* dot */}
                                                    <div className={`absolute -left-[25px] top-1.5 w-4 h-4 rounded-full border-4 border-white dark:border-gray-800 shadow-sm ${milestone.status === 'COMPLETED' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                                        }`} />

                                                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-5 group-hover:bg-white dark:group-hover:bg-gray-700 shadow-sm group-hover:shadow-md transition-all border border-transparent group-hover:border-gray-100 dark:group-hover:border-gray-600">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div>
                                                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                                                    {milestone.name}
                                                                </h3>
                                                                {milestone.description && (
                                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                                                        {milestone.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${getStatusColor(milestone.status)}`}>
                                                                    {milestone.status}
                                                                </span>
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedMilestone(milestone);
                                                                            setShowMilestoneModal(true);
                                                                        }}
                                                                        className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (confirm('Delete this milestone?')) {
                                                                                await fetch(`/api/it/milestones/${milestone.id}`, { method: 'DELETE' });
                                                                                fetchProject();
                                                                            }
                                                                        }}
                                                                        className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium border-t border-gray-100 dark:border-gray-700 pt-3 mt-3">
                                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                                <Calendar className="h-3.5 w-3.5" />
                                                                Deadline: {new Date(milestone.dueDate).toLocaleDateString()}
                                                            </div>

                                                            {milestone.paymentAmount && milestone.paymentAmount > 0 && (
                                                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${milestone.isPaid ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                                                    }`}>
                                                                    <DollarSign className="h-3.5 w-3.5" />
                                                                    ₹{milestone.paymentAmount.toLocaleString()}
                                                                    {milestone.isPaid ? ' - PAID' : ' - DUE'}
                                                                </div>
                                                            )}

                                                            {milestone.completedAt && (
                                                                <div className="flex items-center gap-1.5 text-green-600">
                                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                                    Released: {new Date(milestone.completedAt).toLocaleDateString()}
                                                                </div>
                                                            )}
                                                        </div>
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
                                            No tasks yet. Click &quot;Add Task&quot; to create one.
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
                            </>
                        ) : activeTab === 'timeline' ? (
                            <ProjectTimeline
                                startDate={project.startDate}
                                endDate={project.endDate}
                                milestones={project.milestones}
                                tasks={project.tasks}
                            />
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                                <ITDocumentManager projectId={projectId} />
                            </div>
                        )}
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

                {/* Modals */}
                <MilestoneModal
                    isOpen={showMilestoneModal}
                    onClose={() => setShowMilestoneModal(false)}
                    projectId={projectId}
                    milestone={selectedMilestone || undefined}
                    onSuccess={fetchProject}
                />
            </div>
        </DashboardLayout>
    );
}
