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
            <div className="min-h-screen pb-20 space-y-8 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[length:200px] bg-repeat">
                
                {/* Modern Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
                >
                    <div className="flex items-center gap-6">
                        <button onClick={() => router.back()} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-purple-600 hover:shadow-lg transition-all">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="px-3 py-1 bg-purple-600/10 text-purple-600 rounded-lg text-[10px] font-black uppercase tracking-widest leading-none">
                                    {task.taskCode}
                                </span>
                                <span className="h-1 w-1 rounded-full bg-slate-200" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{task.type.replace('_', ' ')}</span>
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{task.title}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap justify-end">
                        {task.type === 'SERVICE_REQUEST' && task.status !== 'COMPLETED' && (
                            task.status !== 'UNDER_REVIEW' ? (
                                <button onClick={() => handleUpdateStatus('UNDER_REVIEW', 'Awaiting validation.')} className="px-6 py-3.5 bg-amber-50 text-amber-600 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-amber-100 transition-all border border-amber-200 shadow-sm flex items-center gap-2">
                                    <Clock className="h-4 w-4" /> End Ops
                                </button>
                            ) : (
                                <button onClick={() => handleUpdateStatus('COMPLETED', 'Service accepted.')} className="px-6 py-3.5 bg-emerald-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 flex items-center gap-2 animate-pulse">
                                    <CheckCircle2 className="h-4 w-4" /> Execute Settlement
                                </button>
                            )
                        )}
                        <button onClick={() => router.push(`/dashboard/it-management/tasks/${taskId}/edit`)} 
                            className="px-6 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-600 text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
                            <Edit className="h-4 w-4" /> Reconfigure
                        </button>
                        <button onClick={handleDelete} disabled={deleting} 
                            className="p-3.5 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all disabled:opacity-50">
                            <Trash2 className="h-5 w-5" />
                        </button>
                    </div>
                </motion.div>

                {/* Core Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                        className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/80 shadow-sm"
                    >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Operating Status</p>
                        <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${STATUS_CONFIG[task.status]?.dot || 'bg-slate-400'}`} />
                            <span className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                {STATUS_CONFIG[task.status]?.label || task.status.replace('_', ' ')}
                            </span>
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                        className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/80 shadow-sm"
                    >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Severity Rating</p>
                        <span className={`text-lg font-black uppercase tracking-tight ${PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]?.text || 'text-slate-600'}`}>
                            {task.priority} Alpha
                        </span>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                        className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/80 shadow-sm"
                    >
                        <div className="flex justify-between items-center mb-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completion</p>
                            <span className="text-lg font-black text-purple-600">{task.progressPercent}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${task.progressPercent}%` }} className="h-full bg-purple-600 rounded-full" />
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
                        className={`bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/80 shadow-sm ${task.isRevenueBased ? 'bg-emerald-50/50 border-emerald-100' : ''}`}
                    >
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${task.isRevenueBased ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {task.isRevenueBased ? 'Asset Valuation' : 'Intelligence Original'}
                        </p>
                        <p className={`text-lg font-black uppercase tracking-tight ${task.isRevenueBased ? 'text-emerald-700' : 'text-slate-900'}`}>
                            {task.isRevenueBased ? `₹${task.itRevenueEarned.toLocaleString()}` : task.category}
                        </p>
                    </motion.div>
                </div>

                {/* Main Intel Body */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Data Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Scope Deck */}
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
                            className="bg-white/70 backdrop-blur-xl rounded-[3rem] p-10 border border-white/80 shadow-sm"
                        >
                            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 mb-8">
                                <Activity className="h-6 w-6 text-purple-600" /> Operational Context
                            </h3>
                            <div className="bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                                <p className="text-slate-600 text-sm leading-loose whitespace-pre-wrap">{task.description || 'Global mission parameters undefined.'}</p>
                            </div>
                        </motion.div>

                        {/* Chronology Deck (Time Entries) */}
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
                            className="bg-white/70 backdrop-blur-xl rounded-[3rem] p-10 border border-white/80 shadow-sm"
                        >
                            <div className="flex items-center justify-between mb-10">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest leading-none">Chronology Logs</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculated intensity: {totalHours}h Aggregate</p>
                                </div>
                                <button onClick={() => setLogTimeOpen(!logTimeOpen)}
                                    className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                                    {logTimeOpen ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                </button>
                            </div>

                            <AnimatePresence>
                                {logTimeOpen && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-10">
                                        <form onSubmit={handleLogTime} className="bg-purple-600 group p-10 rounded-[2.5rem] shadow-2xl shadow-purple-200 space-y-8 relative">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-2">Temporal Duration (HRS)</label>
                                                    <input type="number" step="0.5" value={timeFormData.hours} onChange={(e) => setTimeFormData({ ...timeFormData, hours: e.target.value })} 
                                                        className="w-full bg-white/10 border-white/20 rounded-2xl px-6 py-4 text-white placeholder:text-white/30 focus:bg-white/20 transition-all outline-none" placeholder="0.0" required />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-2">Log Date</label>
                                                    <input type="date" value={timeFormData.date} onChange={(e) => setTimeFormData({ ...timeFormData, date: e.target.value })} 
                                                        className="w-full bg-white/10 border-white/20 rounded-2xl px-6 py-4 text-white focus:bg-white/20 transition-all outline-none ml-[-5px]" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-2">Intel Narrative</label>
                                                <textarea value={timeFormData.description} onChange={(e) => setTimeFormData({ ...timeFormData, description: e.target.value })} rows={2}
                                                    className="w-full bg-white/10 border-white/20 rounded-2xl px-6 py-4 text-white placeholder:text-white/30 focus:bg-white/20 transition-all outline-none resize-none" placeholder="Mission details during this period..." />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <label className="flex items-center gap-3 cursor-pointer group/check text-white">
                                                    <input type="checkbox" checked={timeFormData.isBillable} onChange={(e) => setTimeFormData({ ...timeFormData, isBillable: e.target.checked })} 
                                                        className="w-6 h-6 rounded-lg bg-white/10 border-white/20 text-white focus:ring-0 checked:bg-white" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Revenue Impact (Billable)</span>
                                                </label>
                                                <button type="submit" disabled={submittingTime} className="px-8 py-4 bg-white text-purple-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">
                                                    {submittingTime ? 'Synchronizing...' : 'Finalize Log'}
                                                </button>
                                            </div>
                                        </form>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {task.timeEntries.length === 0 ? (
                                <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-[2rem]">
                                    <Timer className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No intensity logs found</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {task.timeEntries.map((entry, idx) => (
                                        <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                                            className="p-6 bg-white/50 border border-white hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all rounded-[2rem] group"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="space-y-0.5">
                                                    <h4 className="text-lg font-black text-slate-900 leading-none">{entry.hours} Hours</h4>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">By {entry.user.name}</p>
                                                </div>
                                                <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${entry.isBillable ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                    {entry.isBillable ? 'Billable' : 'Internal'}
                                                </div>
                                            </div>
                                            {entry.description && <p className="text-slate-500 text-xs leading-relaxed italic mb-4 line-clamp-2">&quot;{entry.description}&quot;</p>}
                                            <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest pt-4 border-t border-slate-50">
                                                <Calendar className="h-3 w-3" /> {new Date(entry.date).toLocaleDateString()}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>

                        {/* Intelligence Feed (Comments) */}
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}
                            className="bg-white/70 backdrop-blur-xl rounded-[3rem] p-10 border border-white/80 shadow-sm"
                        >
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-10 flex items-center gap-3">
                                <MessageSquare className="h-6 w-6 text-indigo-600" /> Intelligence Feed
                            </h3>
                            <form onSubmit={handleSubmitComment} className="mb-10 relative group">
                                <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Contribute intel..." rows={3}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] p-8 text-sm focus:bg-white focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 transition-all outline-none resize-none pr-32 mb-[-10px]" />
                                <button type="submit" disabled={submittingComment || !newComment.trim()} 
                                    className="absolute right-4 bottom-14 p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50">
                                    {submittingComment ? <div className="h-5 w-5 border-2 border-white/20 border-t-white animate-spin rounded-full" /> : <Send className="h-5 w-5" />}
                                </button>
                            </form>
                            <div className="space-y-4">
                                {task.comments.map((comment, idx) => (
                                    <div key={comment.id} className="flex gap-6 group">
                                        <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 uppercase shrink-0">
                                            {comment.user.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{comment.user.name}</h5>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(comment.createdAt).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="bg-white/50 border border-white group-hover:bg-white group-hover:border-slate-100 p-6 rounded-[2rem] transition-all">
                                                <p className="text-slate-600 text-xs leading-loose whitespace-pre-wrap">{comment.content}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Parameters Sidebar */}
                    <div className="space-y-8">
                        {/* Task Specs */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }}
                            className="bg-white/70 backdrop-blur-xl rounded-[3rem] p-8 border border-white/80 shadow-sm space-y-8"
                        >
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                <Info className="h-4 w-4 text-purple-600" /> Operational Specs
                            </h3>
                            <div className="space-y-8">
                                {task.project && (
                                    <div className="group cursor-pointer" onClick={() => router.push(`/dashboard/it-management/projects/${task.project?.id}`)}>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><FolderKanban className="h-3 w-3" /> Origin Project</p>
                                        <div className="p-4 bg-blue-600/5 border border-blue-600/10 rounded-2xl group-hover:bg-blue-600/10 transition-all">
                                            <p className="font-black text-blue-700 leading-tight mb-1">{task.project.name}</p>
                                            <p className="text-[9px] font-black text-blue-600/40 uppercase tracking-widest">{task.project.projectCode}</p>
                                        </div>
                                    </div>
                                )}
                                {task.assignedTo && (
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><User className="h-3 w-3" /> Active Personnel</p>
                                        <div className="flex items-center gap-3 p-2">
                                            <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-xs font-black text-white">
                                                {task.assignedTo.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 leading-none mb-1">{task.assignedTo.name}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase">{task.assignedTo.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Limit Cycle</p>
                                        <p className="font-black text-slate-900 text-[11px] uppercase tracking-tight">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Created</p>
                                        <p className="font-black text-slate-900 text-[11px] uppercase tracking-tight">{new Date(task.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                {task.tags.length > 0 && (
                                    <div className="pt-4 border-t border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Logic Tags</p>
                                        <div className="flex flex-wrap gap-2">
                                            {task.tags.map(tag => (
                                                <span key={tag} className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Revenue Map */}
                        {task.isRevenueBased && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9 }}
                                className="bg-emerald-600 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl translate-x-10 translate-y-[-10px]" />
                                <h3 className="text-white text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-emerald-300" /> Yield Protocol
                                </h3>
                                <div className="space-y-4 mb-10">
                                    <div className="flex justify-between items-center bg-black/10 p-4 rounded-2xl">
                                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Est. Flow</span>
                                        <span className="text-white font-black">₹{task.estimatedValue.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between px-2">
                                        <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Status</span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${task.isPaid ? 'bg-white text-emerald-600' : 'bg-white/10 text-white border border-white/20'}`}>
                                            {task.isPaid ? 'Settled' : 'Awaiting'}
                                        </span>
                                    </div>
                                </div>
                                <div className="pt-8 border-t border-white/10 flex flex-col items-center">
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Net Revenue Dividend</p>
                                    <p className="text-4xl font-black text-white tracking-tighter">₹{task.itRevenueEarned.toLocaleString()}</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Lifecycle Stream */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.0 }}
                            className="bg-white/70 backdrop-blur-xl rounded-[3rem] p-8 border border-white/80 shadow-sm space-y-6"
                        >
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                <History className="h-4 w-4 text-slate-400" /> State Transitions
                            </h3>
                            <div className="space-y-6 relative">
                                <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-slate-100" />
                                {task.statusHistory.map((history, idx) => (
                                    <div key={history.id} className="relative pl-10">
                                        <div className={`absolute left-0 top-0.5 w-7 h-7 rounded-lg border-4 border-white shadow-sm flex items-center justify-center transition-all ${idx === 0 ? 'bg-purple-600' : 'bg-slate-200'}`}>
                                            <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-900 leading-tight uppercase tracking-tight">
                                                {history.toStatus}
                                            </p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                                By {history.changedBy.name} • {new Date(history.changedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
