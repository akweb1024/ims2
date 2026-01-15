'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ListTodo,
    Edit,
    Trash2,
    Calendar,
    DollarSign,
    User,
    Clock,
    AlertCircle,
    ArrowLeft,
    FolderKanban,
    Plus,
    X,
    MessageSquare,
    Send,
    TrendingUp,
    CheckCircle2,
} from 'lucide-react';

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
    isPaid: boolean;
    dueDate: string | null;
    progressPercent: number;
    tags: string[];
    createdAt: string;
    updatedAt: string;
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
    timeEntries: Array<{
        id: string;
        hours: number;
        description: string;
        isBillable: boolean;
        date: string;
        user: {
            name: string;
        };
    }>;
    comments: Array<{
        id: string;
        content: string;
        createdAt: string;
        user: {
            name: string;
            email: string;
        };
    }>;
    statusHistory: Array<{
        id: string;
        fromStatus: string | null;
        toStatus: string;
        changedAt: string;
        changedBy: {
            name: string;
        };
    }>;
}

export default function TaskDetailPage() {
    const router = useRouter();
    const params = useParams();
    const taskId = params.id as string;

    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);

    // Time Entry state
    const [logTimeOpen, setLogTimeOpen] = useState(false);
    const [timeFormData, setTimeFormData] = useState({
        hours: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        isBillable: true,
    });
    const [submittingTime, setSubmittingTime] = useState(false);

    useEffect(() => {
        if (taskId) {
            fetchTask();
        }
    }, [taskId]);

    const fetchTask = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/it/tasks/${taskId}`);
            if (response.ok) {
                const data = await response.json();
                setTask(data);
            } else {
                alert('Failed to load task');
                router.push('/dashboard/it-management/tasks');
            }
        } catch (error) {
            console.error('Failed to fetch task:', error);
            alert('Failed to load task');
        } finally {
            setLoading(false);
        }
    };

    const handleLogTime = async (e: React.FormEvent) => {
        e.preventDefault();
        const hours = parseFloat(timeFormData.hours);
        if (isNaN(hours) || hours <= 0) return;

        setSubmittingTime(true);
        try {
            const response = await fetch(`/api/it/tasks/${taskId}/time-entries`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(timeFormData),
            });

            if (response.ok) {
                setLogTimeOpen(false);
                setTimeFormData({
                    hours: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0],
                    isBillable: true,
                });
                fetchTask();
            } else {
                alert('Failed to log time');
            }
        } catch (error) {
            console.error('Failed to log time:', error);
            alert('Failed to log time');
        } finally {
            setSubmittingTime(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
            return;
        }

        setDeleting(true);
        try {
            const response = await fetch(`/api/it/tasks/${taskId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                alert('Task deleted successfully');
                router.push('/dashboard/it-management/tasks');
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to delete task');
            }
        } catch (error) {
            console.error('Failed to delete task:', error);
            alert('Failed to delete task');
        } finally {
            setDeleting(false);
        }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmittingComment(true);
        try {
            const response = await fetch(`/api/it/tasks/${taskId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newComment }),
            });

            if (response.ok) {
                setNewComment('');
                fetchTask(); // Refresh to show new comment
            } else {
                alert('Failed to add comment');
            }
        } catch (error) {
            console.error('Failed to add comment:', error);
            alert('Failed to add comment');
        } finally {
            setSubmittingComment(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'IN_PROGRESS':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'TESTING':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!task) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Task not found</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const totalHours = task.timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const billableHours = task.timeEntries.filter(e => e.isBillable).reduce((sum, e) => sum + e.hours, 0);

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
                                <ListTodo className="h-8 w-8 text-purple-600" />
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {task.title}
                                </h1>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400">{task.taskCode}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(`/dashboard/it-management/tasks/${taskId}/edit`)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
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
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Status</p>
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ')}
                        </span>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Priority</p>
                        <p className={`text-2xl font-bold ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            Progress
                        </p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {task.progressPercent}%
                        </p>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${task.progressPercent}%` }}
                            ></div>
                        </div>
                    </div>

                    {task.isRevenueBased && (
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                            <p className="text-green-100 text-sm mb-2">IT Revenue</p>
                            <p className="text-2xl font-bold">₹{task.itRevenueEarned.toLocaleString()}</p>
                            <p className="text-xs text-green-100 mt-1">
                                {task.isPaid ? '✓ Paid' : '⏳ Unpaid'}
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
                                {task.description || 'No description provided'}
                            </p>
                        </div>

                        {/* Time Entries */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Time Entries ({task.timeEntries.length})
                                </h2>
                                <div className="flex items-center gap-4">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Total: {totalHours}h ({billableHours}h billable)
                                    </div>
                                    <button
                                        onClick={() => setLogTimeOpen(true)}
                                        className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Log Time
                                    </button>
                                </div>
                            </div>

                            {/* Log Time Form Modal-like Area */}
                            {logTimeOpen && (
                                <div className="mb-6 p-4 border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-blue-900 dark:text-blue-400">Log Hours</h3>
                                        <button onClick={() => setLogTimeOpen(false)}>
                                            <X className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                                        </button>
                                    </div>
                                    <form onSubmit={handleLogTime} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Hours *
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    value={timeFormData.hours}
                                                    onChange={(e) => setTimeFormData({ ...timeFormData, hours: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                    placeholder="0.0"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={timeFormData.date}
                                                    onChange={(e) => setTimeFormData({ ...timeFormData, date: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Description
                                            </label>
                                            <textarea
                                                value={timeFormData.description}
                                                onChange={(e) => setTimeFormData({ ...timeFormData, description: e.target.value })}
                                                rows={2}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="What did you work on?"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="isBillable"
                                                    checked={timeFormData.isBillable}
                                                    onChange={(e) => setTimeFormData({ ...timeFormData, isBillable: e.target.checked })}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                                <label htmlFor="isBillable" className="text-sm text-gray-700 dark:text-gray-300">
                                                    Billable hours
                                                </label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setLogTimeOpen(false)}
                                                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={submittingTime}
                                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {submittingTime ? 'Logging...' : 'Log Hours'}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {task.timeEntries.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                                    No time entries logged yet
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {task.timeEntries.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {entry.hours}h - {entry.user.name}
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                        {entry.description}
                                                    </p>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded ${entry.isBillable ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                                                    {entry.isBillable ? 'Billable' : 'Non-billable'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(entry.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Comments */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Comments ({task.comments.length})
                            </h2>

                            {/* Comment Form */}
                            <form onSubmit={handleSubmitComment} className="mb-6">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a comment..."
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white mb-2"
                                />
                                <button
                                    type="submit"
                                    disabled={submittingComment || !newComment.trim()}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <Send className="h-4 w-4" />
                                    {submittingComment ? 'Posting...' : 'Post Comment'}
                                </button>
                            </form>

                            {/* Comments List */}
                            {task.comments.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                                    No comments yet. Be the first to comment!
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {task.comments.map((comment) => (
                                        <div
                                            key={comment.id}
                                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {comment.user.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {new Date(comment.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                {comment.content}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Status History */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                Status History
                            </h2>

                            {task.statusHistory.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                                    No status changes yet
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {task.statusHistory.map((history, index) => (
                                        <div
                                            key={history.id}
                                            className="flex items-start gap-3"
                                        >
                                            <div className="flex flex-col items-center">
                                                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                                {index < task.statusHistory.length - 1 && (
                                                    <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-2"></div>
                                                )}
                                            </div>
                                            <div className="flex-1 pb-4">
                                                <p className="text-sm text-gray-900 dark:text-white">
                                                    {history.fromStatus ? (
                                                        <>
                                                            Changed from <span className="font-medium">{history.fromStatus}</span> to{' '}
                                                            <span className="font-medium">{history.toStatus}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            Created with status <span className="font-medium">{history.toStatus}</span>
                                                        </>
                                                    )}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    By {history.changedBy.name} on {new Date(history.changedAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Task Details */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                Task Details
                            </h2>

                            <div className="space-y-4">
                                {task.project && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                            <FolderKanban className="h-4 w-4" />
                                            Project
                                        </p>
                                        <button
                                            onClick={() => router.push(`/dashboard/it-management/projects/${task.project?.id}`)}
                                            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            {task.project.name}
                                        </button>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {task.project.projectCode}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Category</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{task.category}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{task.type}</p>
                                </div>

                                {task.assignedTo && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                            <User className="h-4 w-4" />
                                            Assigned To
                                        </p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {task.assignedTo.name}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {task.assignedTo.email}
                                        </p>
                                    </div>
                                )}

                                {task.dueDate && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            Due Date
                                        </p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {new Date(task.dueDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        Created
                                    </p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {new Date(task.createdAt).toLocaleDateString()}
                                    </p>
                                </div>

                                {task.tags.length > 0 && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Tags</p>
                                        <div className="flex flex-wrap gap-2">
                                            {task.tags.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded text-xs"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Revenue Details */}
                        {task.isRevenueBased && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-green-600" />
                                    Revenue
                                </h2>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Estimated Value</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            ₹{task.estimatedValue.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">IT Revenue Earned</span>
                                        <span className="font-bold text-green-600 dark:text-green-400">
                                            ₹{task.itRevenueEarned.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Payment Status</span>
                                        <span className={`text-sm font-medium ${task.isPaid ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                            {task.isPaid ? '✓ Paid' : '⏳ Unpaid'}
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
