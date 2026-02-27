'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ListTodo, Edit, Trash2, Calendar, DollarSign, User, Clock,
    AlertCircle, ArrowLeft, FolderKanban, Plus, X, MessageSquare, Send, TrendingUp, CheckCircle2,
    Activity, Zap, ShieldCheck, History, Timer, Info, MoreHorizontal
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

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    COMPLETED: { label: 'Settled', bg: 'bg-emerald-50/50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    IN_PROGRESS: { label: 'Active', bg: 'bg-blue-50/50', text: 'text-blue-700', dot: 'bg-blue-500' },
    TESTING: { label: 'Verification', bg: 'bg-purple-50/50', text: 'text-purple-700', dot: 'bg-purple-500' },
    PENDING: { label: 'In Queue', bg: 'bg-amber-50/50', text: 'text-amber-700', dot: 'bg-amber-500' },
    UNDER_REVIEW: { label: 'Audit', bg: 'bg-indigo-50/50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
};

const PRIORITY_CONFIG: Record<string, { label: string; text: string; bg: string }> = {
    CRITICAL: { label: 'Critical', text: 'text-rose-600', bg: 'bg-rose-50' },
    HIGH: { label: 'High', text: 'text-orange-600', bg: 'bg-orange-50' },
    MEDIUM: { label: 'Medium', text: 'text-amber-600', bg: 'bg-amber-50' },
    LOW: { label: 'Low', text: 'text-emerald-600', bg: 'bg-emerald-50' },
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
            else { alert('Vector location failed'); router.push('/dashboard/it-management/tasks'); }
        } catch { alert('Data uplink lost'); }
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
        } catch { alert('Chronology log failed'); }
        finally { setSubmittingTime(false); }
    };

    const handleDelete = async () => {
        if (!confirm('Purge this task data? This action is permanent.')) return;
        setDeleting(true);
        try {
            const response = await fetch(`/api/it/tasks/${taskId}`, { method: 'DELETE' });
            if (response.ok) router.push('/dashboard/it-management/tasks');
        } catch { alert('Decommissioning failed'); }
        finally { setDeleting(false); }
    };

    const handleUpdateStatus = async (status: string, reason: string) => {
        try {
            const response = await fetch(`/api/it/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, statusComment: reason }) });
            if (response.ok) fetchTask();
        } catch { console.error('Lifecycle update failed'); }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setSubmittingComment(true);
        try {
            const response = await fetch(`/api/it/tasks/${taskId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: newComment }) });
            if (response.ok) { setNewComment(''); fetchTask(); }
        } catch { alert('Intel posting failed'); }
        finally { setSubmittingComment(false); }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
                    <div className="h-12 w-12 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Synchronizing Task Payload...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!task) return null;

    const totalHours = task.timeEntries.reduce((sum, e) => sum + e.hours, 0);
    const billableHours = task.timeEntries.filter(e => e.isBillable).reduce((sum, e) => sum + e.hours, 0);

    return (
        <DashboardLayout>
            <div className="min-h-screen pb-20 space-y-8">
                
                {/* ── HEADER ──────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-2xl overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900" />
                    <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(ellipse at 10% 50%, rgba(139,92,246,0.4) 0%, transparent 60%)' }} />

                    <div className="relative p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex items-start gap-5">
                            <button onClick={() => router.back()} className="mt-1 p-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-violet-400 hover:border-violet-500/30 transition-all shrink-0">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="px-3 py-1 bg-violet-500/20 border border-violet-500/30 text-violet-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                        {task.taskCode}
                                    </span>
                                    <span className="h-1 w-1 rounded-full bg-slate-700" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{task.type.replace('_', ' ')}</span>
                                </div>
                                <h1 className="text-3xl font-black text-white tracking-tight">{task.title}</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            {task.type === 'SERVICE_REQUEST' && task.status !== 'COMPLETED' && (
                                task.status !== 'UNDER_REVIEW' ? (
                                    <button onClick={() => handleUpdateStatus('UNDER_REVIEW', 'Awaiting validation.')} className="px-5 py-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all flex items-center gap-2">
                                        <Clock className="h-4 w-4" /> End Ops
                                    </button>
                                ) : (
                                    <button onClick={() => handleUpdateStatus('COMPLETED', 'Service accepted.')} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" /> Settle Task
                                    </button>
                                )
                            )}
                            <button onClick={() => router.push(`/dashboard/it-management/tasks/${taskId}/edit`)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-slate-300 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all">
                                <Edit className="h-4 w-4" /> Edit
                            </button>
                            <button onClick={handleDelete} disabled={deleting}
                                className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500/20 transition-all disabled:opacity-50">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* ── METRICS GRID ─────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                        className="bg-white/[0.03] border border-white/10 rounded-2xl p-5"
                    >
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">Status</p>
                        <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${STATUS_CONFIG[task.status]?.dot || 'bg-slate-400'} animate-pulse`} />
                            <span className={`text-base font-black uppercase tracking-tight ${STATUS_CONFIG[task.status]?.text || 'text-slate-400'}`}>
                                {STATUS_CONFIG[task.status]?.label || task.status.replace('_', ' ')}
                            </span>
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
                        className="bg-white/[0.03] border border-white/10 rounded-2xl p-5"
                    >
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">Priority</p>
                        <span className={`text-base font-black uppercase tracking-tight ${PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]?.text || 'text-slate-400'}`}>
                            {task.priority}
                        </span>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                        className="bg-white/[0.03] border border-white/10 rounded-2xl p-5"
                    >
                        <div className="flex justify-between items-center mb-3">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Completion</p>
                            <span className="text-base font-black text-violet-400">{task.progressPercent}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${task.progressPercent}%` }} className="h-full bg-violet-500 rounded-full" />
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}
                        className={`border rounded-2xl p-5 ${task.isRevenueBased ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/[0.03] border-white/10'}`}
                    >
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${task.isRevenueBased ? 'text-emerald-500' : 'text-slate-600'}`}>
                            {task.isRevenueBased ? 'Revenue Yield' : 'Category'}
                        </p>
                        <p className={`text-base font-black uppercase tracking-tight ${task.isRevenueBased ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {task.isRevenueBased ? `₹${task.itRevenueEarned.toLocaleString()}` : task.category}
                        </p>
                    </motion.div>
                </div>

                {/* ── MAIN BODY ─────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Description */}
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                            className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-7"
                        >
                            <h3 className="text-base font-black text-white flex items-center gap-3 mb-5">
                                <Activity className="h-5 w-5 text-violet-400" /> Description
                            </h3>
                            <div className="bg-white/[0.03] rounded-xl p-5 border border-white/5">
                                <p className="text-slate-400 text-sm leading-loose whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
                            </div>
                        </motion.div>

                        {/* Time Entries */}
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
                            className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-7"
                        >
                            <div className="flex items-center justify-between mb-7">
                                <div>
                                    <h3 className="font-black text-white">Time Logs</h3>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{totalHours}h total · {billableHours}h billable</p>
                                </div>
                                <button onClick={() => setLogTimeOpen(!logTimeOpen)}
                                    className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-white/20 transition-all">
                                    {logTimeOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                </button>
                            </div>

                            <AnimatePresence>
                                {logTimeOpen && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-7">
                                        <form onSubmit={handleLogTime} className="bg-violet-600/10 border border-violet-500/20 p-6 rounded-xl space-y-5">
                                            <div className="grid grid-cols-2 gap-5">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hours</label>
                                                    <input type="number" step="0.5" value={timeFormData.hours} onChange={(e) => setTimeFormData({ ...timeFormData, hours: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50" placeholder="0.0" required />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</label>
                                                    <input type="date" value={timeFormData.date} onChange={(e) => setTimeFormData({ ...timeFormData, date: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-violet-500/50" />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
                                                <textarea value={timeFormData.description} onChange={(e) => setTimeFormData({ ...timeFormData, description: e.target.value })} rows={2}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-medium placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 resize-none" placeholder="What did you work on?" />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
                                                    <input type="checkbox" checked={timeFormData.isBillable} onChange={(e) => setTimeFormData({ ...timeFormData, isBillable: e.target.checked })} className="w-4 h-4 rounded" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Billable</span>
                                                </label>
                                                <button type="submit" disabled={submittingTime} className="px-6 py-2.5 bg-violet-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-violet-500 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-50">
                                                    {submittingTime ? 'Saving...' : 'Log Time'}
                                                </button>
                                            </div>
                                        </form>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {task.timeEntries.length === 0 ? (
                                <div className="text-center py-10 border border-dashed border-white/5 rounded-xl">
                                    <Timer className="h-7 w-7 text-slate-700 mx-auto mb-2" />
                                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">No time logs yet</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {task.timeEntries.map((entry, idx) => (
                                        <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                                            className="p-4 bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all rounded-xl group"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="text-base font-black text-white leading-none">{entry.hours}h</h4>
                                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-0.5">By {entry.user.name}</p>
                                                </div>
                                                <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${entry.isBillable ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-600 border-slate-500/20'}`}>
                                                    {entry.isBillable ? 'Billable' : 'Internal'}
                                                </div>
                                            </div>
                                            {entry.description && <p className="text-slate-600 text-xs italic mb-3 line-clamp-2">{entry.description}</p>}
                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-700 uppercase tracking-widest">
                                                <Calendar className="h-3 w-3" /> {new Date(entry.date).toLocaleDateString()}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>

                        {/* Comments */}
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
                            className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-7"
                        >
                            <h3 className="font-black text-white flex items-center gap-3 mb-6">
                                <MessageSquare className="h-5 w-5 text-indigo-400" /> Intelligence Feed
                            </h3>
                            <form onSubmit={handleSubmitComment} className="mb-6 relative">
                                <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none pr-16" />
                                <button type="submit" disabled={submittingComment || !newComment.trim()}
                                    className="absolute right-3 bottom-3 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all shadow-lg disabled:opacity-50">
                                    {submittingComment ? <div className="h-4 w-4 border-2 border-white/20 border-t-white animate-spin rounded-full" /> : <Send className="h-4 w-4" />}
                                </button>
                            </form>
                            <div className="space-y-3">
                                {task.comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-4 group">
                                        <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-black text-indigo-400 uppercase shrink-0">
                                            {comment.user.name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <h5 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{comment.user.name}</h5>
                                                <span className="text-[9px] font-bold text-slate-700">{new Date(comment.createdAt).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="bg-white/[0.03] border border-white/5 p-4 rounded-xl">
                                                <p className="text-slate-400 text-xs leading-loose whitespace-pre-wrap">{comment.content}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* ── SIDEBAR ──────────────────────────────── */}
                    <div className="space-y-5">
                        {/* Task Specs */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}
                            className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6"
                        >
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-3">
                                <Info className="h-4 w-4 text-violet-400" /> Task Details
                            </h3>
                            <div className="space-y-5">
                                {task.project && (
                                    <div className="group cursor-pointer" onClick={() => router.push(`/dashboard/it-management/projects/${task.project?.id}`)}
                                    >
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-1.5"><FolderKanban className="h-3 w-3" /> Project</p>
                                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all">
                                            <p className="font-black text-blue-400 text-xs">{task.project.name}</p>
                                            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-0.5">{task.project.projectCode}</p>
                                        </div>
                                    </div>
                                )}
                                {task.assignedTo && (
                                    <div>
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-1.5"><User className="h-3 w-3" /> Assigned</p>
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-xl bg-violet-600 flex items-center justify-center text-xs font-black text-white">
                                                {task.assignedTo.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-white text-sm">{task.assignedTo.name}</p>
                                                <p className="text-[9px] text-slate-600 uppercase tracking-widest">{task.assignedTo.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Due Date</p>
                                        <p className="font-black text-slate-300 text-xs uppercase">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Created</p>
                                        <p className="font-black text-slate-300 text-xs uppercase">{new Date(task.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                {task.tags.length > 0 && (
                                    <div className="pt-4 border-t border-white/5">
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Tags</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {task.tags.map(tag => (
                                                <span key={tag} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Revenue Card */}
                        {task.isRevenueBased && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 }}
                                className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-6 shadow-2xl shadow-emerald-500/20"
                            >
                                <h3 className="text-white text-xs font-black uppercase tracking-widest mb-5 flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-emerald-300" /> Yield Protocol
                                </h3>
                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between items-center bg-black/10 p-3.5 rounded-xl">
                                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Estimated</span>
                                        <span className="text-white font-black">₹{task.estimatedValue.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Status</span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${task.isPaid ? 'bg-white text-emerald-600' : 'bg-white/10 text-white border border-white/20'}`}>
                                            {task.isPaid ? 'Settled' : 'Pending'}
                                        </span>
                                    </div>
                                </div>
                                <div className="pt-5 border-t border-white/10 text-center">
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Net Revenue</p>
                                    <p className="text-3xl font-black text-white">₹{task.itRevenueEarned.toLocaleString()}</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Status History */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }}
                            className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4"
                        >
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-3">
                                <History className="h-4 w-4 text-slate-600" /> Status History
                            </h3>
                            {task.statusHistory.length === 0 ? (
                                <p className="text-[10px] text-slate-700 uppercase tracking-widest font-bold">No transitions yet</p>
                            ) : (
                                <div className="space-y-4 relative">
                                    <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-white/5" />
                                    {task.statusHistory.map((history, idx) => (
                                        <div key={history.id} className="relative pl-9">
                                            <div className={`absolute left-0 top-1 w-6 h-6 rounded-lg border-2 border-slate-900 flex items-center justify-center ${idx === 0 ? 'bg-violet-600 border-violet-500' : 'bg-slate-800 border-slate-700'}`}>
                                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-tight">{history.toStatus}</p>
                                                <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">{history.changedBy.name} · {new Date(history.changedAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

const Target = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
);

const Layers = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.85a.49.49 0 0 0 0 .88L11.17 12.4a2 2 0 0 0 1.66 0l8.57-4.67a.49.49 0 0 0 0-.88Z"/><path d="m2.6 11.33 8.57 4.67a2 2 0 0 0 1.66 0l8.57-4.67"/><path d="m2.6 15.81 8.57 4.67a2 2 0 0 0 1.66 0l8.57-4.67"/></svg>
);
