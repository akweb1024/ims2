'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ListTodo, Edit, Trash2, Calendar, DollarSign, User, Clock,
    AlertCircle, ArrowLeft, FolderKanban, Plus, X, MessageSquare, Send, TrendingUp, CheckCircle2,
} from 'lucide-react';

interface Task {
    id: string; taskCode: string; title: string; description: string | null;
    category: string; type: string; priority: string; status: string;
    isRevenueBased: boolean; estimatedValue: number; itRevenueEarned: number;
    isPaid: boolean; dueDate: string | null; progressPercent: number; tags: string[];
    createdAt: string; updatedAt: string;
    project: { id: string; name: string; projectCode: string; } | null;
    assignedTo: { id: string; name: string; email: string; } | null;
    timeEntries: Array<{ id: string; hours: number; description: string; isBillable: boolean; date: string; user: { name: string; }; }>;
    comments: Array<{ id: string; content: string; createdAt: string; user: { name: string; email: string; }; }>;
    statusHistory: Array<{ id: string; fromStatus: string | null; toStatus: string; changedAt: string; changedBy: { name: string; }; }>;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'COMPLETED': return 'bg-success-100 text-success-700';
        case 'IN_PROGRESS': return 'bg-primary-100 text-primary-700';
        case 'TESTING': return 'bg-purple-100 text-purple-700';
        case 'PENDING': return 'bg-warning-100 text-warning-700';
        case 'UNDER_REVIEW': return 'bg-amber-100 text-amber-700';
        default: return 'bg-secondary-100 text-secondary-600';
    }
};

const getPriorityColor = (priority: string) => {
    switch (priority) {
        case 'CRITICAL': return 'text-danger-600';
        case 'HIGH': return 'text-orange-600';
        case 'MEDIUM': return 'text-warning-600';
        case 'LOW': return 'text-success-600';
        default: return 'text-secondary-500';
    }
};

export default function TaskDetailPage() {
    const router = useRouter();
    const params = useParams();
    const taskId = params.id as string;

    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [logTimeOpen, setLogTimeOpen] = useState(false);
    const [timeFormData, setTimeFormData] = useState({ hours: '', description: '', date: new Date().toISOString().split('T')[0], isBillable: true });
    const [submittingTime, setSubmittingTime] = useState(false);

    const fetchTask = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/it/tasks/${taskId}`);
            if (response.ok) setTask(await response.json());
            else { alert('Failed to load task'); router.push('/dashboard/it-management/tasks'); }
        } catch { alert('Failed to load task'); }
        finally { setLoading(false); }
    }, [taskId, router]);

    useEffect(() => { if (taskId) fetchTask(); }, [taskId, fetchTask]);

    const handleLogTime = async (e: React.FormEvent) => {
        e.preventDefault();
        const hours = parseFloat(timeFormData.hours);
        if (isNaN(hours) || hours <= 0) return;
        setSubmittingTime(true);
        try {
            const response = await fetch(`/api/it/tasks/${taskId}/time-entries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(timeFormData) });
            if (response.ok) { setLogTimeOpen(false); setTimeFormData({ hours: '', description: '', date: new Date().toISOString().split('T')[0], isBillable: true }); fetchTask(); }
            else alert('Failed to log time');
        } catch { alert('Failed to log time'); }
        finally { setSubmittingTime(false); }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
        setDeleting(true);
        try {
            const response = await fetch(`/api/it/tasks/${taskId}`, { method: 'DELETE' });
            if (response.ok) { alert('Task deleted successfully'); router.push('/dashboard/it-management/tasks'); }
            else { const error = await response.json(); alert(error.error || 'Failed to delete task'); }
        } catch { alert('Failed to delete task'); }
        finally { setDeleting(false); }
    };

    const handleMarkForReview = async () => {
        try {
            const response = await fetch(`/api/it/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'UNDER_REVIEW', statusComment: 'Task completed by IT, awaiting requester acceptance.' }) });
            if (response.ok) fetchTask(); else alert('Failed to update status');
        } catch { console.error('Error updating status'); }
    };

    const handleAccept = async () => {
        if (!confirm('Accept this service as completed? This will credit revenue points to the IT department.')) return;
        try {
            const response = await fetch(`/api/it/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'COMPLETED', statusComment: 'Service accepted by requester' }) });
            if (response.ok) fetchTask(); else alert('Failed to accept service');
        } catch { console.error('Error accepting service'); }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setSubmittingComment(true);
        try {
            const response = await fetch(`/api/it/tasks/${taskId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: newComment }) });
            if (response.ok) { setNewComment(''); fetchTask(); } else alert('Failed to add comment');
        } catch { alert('Failed to add comment'); }
        finally { setSubmittingComment(false); }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <p className="text-secondary-500 text-sm">Loading task...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!task) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-danger-400 mx-auto mb-4" />
                        <p className="text-secondary-600">Task not found</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const totalHours = task.timeEntries.reduce((sum, e) => sum + e.hours, 0);
    const billableHours = task.timeEntries.filter(e => e.isBillable).reduce((sum, e) => sum + e.hours, 0);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-secondary-100 rounded-xl transition-colors">
                            <ArrowLeft className="h-5 w-5 text-secondary-500" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-0.5">
                                <span className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                                    <ListTodo className="h-4 w-4 text-purple-600" />
                                </span>
                                <h1 className="text-2xl font-bold text-secondary-900">{task.title}</h1>
                            </div>
                            <p className="text-secondary-400 text-sm ml-11">{task.taskCode}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        {task.type === 'SERVICE_REQUEST' && task.status !== 'COMPLETED' && (
                            task.status !== 'UNDER_REVIEW' ? (
                                <button onClick={handleMarkForReview} className="btn border border-warning-300 text-warning-700 hover:bg-warning-50 text-sm">
                                    <Clock className="h-4 w-4" /> Mark Finished
                                </button>
                            ) : (
                                <button onClick={handleAccept} className="btn bg-success-600 hover:bg-success-700 text-white text-sm animate-pulse">
                                    <CheckCircle2 className="h-4 w-4" /> Accept &amp; Complete
                                </button>
                            )
                        )}
                        <button onClick={() => router.push(`/dashboard/it-management/tasks/${taskId}/edit`)} className="btn btn-primary text-sm">
                            <Edit className="h-4 w-4" /> Edit
                        </button>
                        <button onClick={handleDelete} disabled={deleting} className="btn border border-danger-200 text-danger-600 hover:bg-danger-50 text-sm disabled:opacity-50">
                            <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="card-premium">
                        <p className="text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-2">Status</p>
                        <span className={`inline-flex px-3 py-1.5 rounded-xl text-sm font-bold ${getStatusColor(task.status)}`}>{task.status.replace('_', ' ')}</span>
                    </div>
                    <div className="card-premium">
                        <p className="text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-2">Priority</p>
                        <p className={`text-2xl font-bold ${getPriorityColor(task.priority)}`}>{task.priority}</p>
                    </div>
                    <div className="card-premium">
                        <p className="text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-2 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />Progress</p>
                        <p className="text-2xl font-bold text-primary-600">{task.progressPercent}%</p>
                        <div className="w-full bg-secondary-100 rounded-full h-1.5 mt-2">
                            <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${task.progressPercent}%` }}></div>
                        </div>
                    </div>
                    {task.isRevenueBased ? (
                        <div className="card-premium bg-success-50 border-success-200">
                            <p className="text-xs font-semibold text-success-600 uppercase tracking-wider mb-2">IT Revenue</p>
                            <p className="text-2xl font-bold text-success-700">₹{task.itRevenueEarned.toLocaleString()}</p>
                            <p className="text-xs text-success-600 mt-1">{task.isPaid ? '✓ Paid' : '⏳ Unpaid'}</p>
                        </div>
                    ) : (
                        <div className="card-premium">
                            <p className="text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-2">Type</p>
                            <p className="text-lg font-bold text-secondary-900">{task.type}</p>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-5">
                        {/* Description */}
                        <div className="card-premium">
                            <h2 className="text-sm font-bold text-secondary-900 uppercase tracking-wider mb-3">Description</h2>
                            <p className="text-secondary-700 whitespace-pre-wrap text-sm">{task.description || 'No description provided'}</p>
                        </div>

                        {/* Time Entries */}
                        <div className="card-premium">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-bold text-secondary-900 uppercase tracking-wider flex items-center gap-2">
                                    <Clock className="h-4 w-4" /> Time Entries ({task.timeEntries.length})
                                </h2>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-secondary-400 font-semibold">Total: {totalHours}h ({billableHours}h billable)</span>
                                    <button onClick={() => setLogTimeOpen(true)} className="btn btn-primary text-xs">
                                        <Plus className="h-3.5 w-3.5" /> Log Time
                                    </button>
                                </div>
                            </div>

                            {logTimeOpen && (
                                <div className="mb-5 p-4 border border-primary-200 bg-primary-50 rounded-xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-bold text-primary-900 text-sm">Log Hours</h3>
                                        <button onClick={() => setLogTimeOpen(false)} className="p-1 hover:bg-primary-100 rounded-lg transition-colors"><X className="h-4 w-4 text-secondary-500" /></button>
                                    </div>
                                    <form onSubmit={handleLogTime} className="space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="label-premium">Hours *</label>
                                                <input type="number" step="0.5" value={timeFormData.hours} onChange={(e) => setTimeFormData({ ...timeFormData, hours: e.target.value })} className="input-premium" placeholder="0.0" title="Number of hours" required />
                                            </div>
                                            <div>
                                                <label className="label-premium">Date</label>
                                                <input type="date" value={timeFormData.date} onChange={(e) => setTimeFormData({ ...timeFormData, date: e.target.value })} className="input-premium" title="Date of work" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label-premium">Description</label>
                                            <textarea value={timeFormData.description} onChange={(e) => setTimeFormData({ ...timeFormData, description: e.target.value })} rows={2} className="input-premium" placeholder="What did you work on?" title="Description of work" />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" id="isBillable" checked={timeFormData.isBillable} onChange={(e) => setTimeFormData({ ...timeFormData, isBillable: e.target.checked })} className="w-4 h-4 text-primary-600 rounded" />
                                                <span className="text-sm text-secondary-700 font-medium">Billable hours</span>
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => setLogTimeOpen(false)} className="px-3 py-1.5 text-sm text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors">Cancel</button>
                                                <button type="submit" disabled={submittingTime} className="btn btn-primary text-sm disabled:opacity-50">
                                                    {submittingTime ? 'Logging...' : 'Log Hours'}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {task.timeEntries.length === 0 ? (
                                <p className="text-secondary-400 text-center py-8 text-sm">No time entries logged yet</p>
                            ) : (
                                <div className="space-y-2">
                                    {task.timeEntries.map((entry) => (
                                        <div key={entry.id} className="border border-secondary-200 rounded-xl p-4">
                                            <div className="flex items-start justify-between mb-1">
                                                <p className="font-semibold text-secondary-900 text-sm">{entry.hours}h — {entry.user.name}</p>
                                                <span className={`text-xs px-2 py-1 rounded-lg ${entry.isBillable ? 'bg-success-100 text-success-700' : 'bg-secondary-100 text-secondary-500'}`}>
                                                    {entry.isBillable ? 'Billable' : 'Non-billable'}
                                                </span>
                                            </div>
                                            {entry.description && <p className="text-sm text-secondary-500">{entry.description}</p>}
                                            <p className="text-xs text-secondary-400 mt-1">{new Date(entry.date).toLocaleDateString()}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Comments */}
                        <div className="card-premium">
                            <h2 className="text-sm font-bold text-secondary-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" /> Comments ({task.comments.length})
                            </h2>
                            <form onSubmit={handleSubmitComment} className="mb-5">
                                <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." rows={3} className="input-premium mb-3" title="Write a comment" />
                                <button type="submit" disabled={submittingComment || !newComment.trim()} className="btn btn-primary text-sm disabled:opacity-50">
                                    <Send className="h-4 w-4" /> {submittingComment ? 'Posting...' : 'Post Comment'}
                                </button>
                            </form>
                            {task.comments.length === 0 ? (
                                <p className="text-secondary-400 text-center py-6 text-sm">No comments yet. Be the first to comment!</p>
                            ) : (
                                <div className="space-y-3">
                                    {task.comments.map((comment) => (
                                        <div key={comment.id} className="border border-secondary-200 rounded-xl p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <p className="font-bold text-secondary-900 text-sm">{comment.user.name}</p>
                                                <p className="text-xs text-secondary-400">{new Date(comment.createdAt).toLocaleString()}</p>
                                            </div>
                                            <p className="text-secondary-700 text-sm whitespace-pre-wrap">{comment.content}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Status History */}
                        <div className="card-premium">
                            <h2 className="text-sm font-bold text-secondary-900 uppercase tracking-wider mb-4">Status History</h2>
                            {task.statusHistory.length === 0 ? (
                                <p className="text-secondary-400 text-center py-6 text-sm">No status changes yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {task.statusHistory.map((history, index) => (
                                        <div key={history.id} className="flex items-start gap-3">
                                            <div className="flex flex-col items-center">
                                                <CheckCircle2 className="h-5 w-5 text-primary-500 shrink-0" />
                                                {index < task.statusHistory.length - 1 && <div className="w-0.5 h-full bg-secondary-100 mt-1"></div>}
                                            </div>
                                            <div className="flex-1 pb-3">
                                                <p className="text-sm text-secondary-900">
                                                    {history.fromStatus ? (<>Changed from <span className="font-bold">{history.fromStatus}</span> to <span className="font-bold">{history.toStatus}</span></>) : (<>Created with status <span className="font-bold">{history.toStatus}</span></>)}
                                                </p>
                                                <p className="text-xs text-secondary-400 mt-0.5">By {history.changedBy.name} on {new Date(history.changedAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-5">
                        <div className="card-premium">
                            <h2 className="text-sm font-bold text-secondary-900 uppercase tracking-wider mb-4">Task Details</h2>
                            <div className="space-y-4">
                                {task.project && (
                                    <div>
                                        <p className="text-xs text-secondary-400 font-semibold uppercase tracking-wider flex items-center gap-1.5"><FolderKanban className="h-3.5 w-3.5" />Project</p>
                                        <button onClick={() => router.push(`/dashboard/it-management/projects/${task.project?.id}`)} className="font-bold text-primary-600 hover:underline mt-0.5">{task.project.name}</button>
                                        <p className="text-xs text-secondary-400">{task.project.projectCode}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-secondary-400 font-semibold uppercase tracking-wider">Category</p>
                                    <p className="font-semibold text-secondary-900 mt-0.5">{task.category}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-secondary-400 font-semibold uppercase tracking-wider">Type</p>
                                    <p className="font-semibold text-secondary-900 mt-0.5">{task.type}</p>
                                </div>
                                {task.assignedTo && (
                                    <div>
                                        <p className="text-xs text-secondary-400 font-semibold uppercase tracking-wider flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Assigned To</p>
                                        <p className="font-bold text-secondary-900 mt-0.5">{task.assignedTo.name}</p>
                                        <p className="text-xs text-secondary-400">{task.assignedTo.email}</p>
                                    </div>
                                )}
                                {task.dueDate && (
                                    <div>
                                        <p className="text-xs text-secondary-400 font-semibold uppercase tracking-wider flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Due Date</p>
                                        <p className="font-semibold text-secondary-900 mt-0.5">{new Date(task.dueDate).toLocaleDateString()}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-secondary-400 font-semibold uppercase tracking-wider flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Created</p>
                                    <p className="font-semibold text-secondary-900 mt-0.5">{new Date(task.createdAt).toLocaleDateString()}</p>
                                </div>
                                {task.tags.length > 0 && (
                                    <div>
                                        <p className="text-xs text-secondary-400 font-semibold uppercase tracking-wider mb-2">Tags</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {task.tags.map((tag, i) => (
                                                <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {task.isRevenueBased && (
                            <div className="card-premium bg-success-50 border-success-200">
                                <h2 className="text-sm font-bold text-success-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                    <DollarSign className="h-4 w-4 text-success-600" /> Revenue
                                </h2>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-success-700">Estimated Value</span>
                                        <span className="font-semibold text-success-900">₹{task.estimatedValue.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-success-200">
                                        <span className="text-sm font-bold text-success-900">IT Revenue Earned</span>
                                        <span className="font-bold text-success-700">₹{task.itRevenueEarned.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-success-700">Payment Status</span>
                                        <span className={`text-sm font-bold ${task.isPaid ? 'text-success-700' : 'text-orange-600'}`}>{task.isPaid ? '✓ Paid' : '⏳ Unpaid'}</span>
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
