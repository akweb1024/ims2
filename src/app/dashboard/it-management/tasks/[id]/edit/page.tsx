'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ListTodo, Save, X, Calendar, DollarSign, User, AlertCircle, FolderKanban,
    ArrowLeft, Activity, Tag, Clock, Zap
} from 'lucide-react';

interface Project { id: string; name: string; projectCode: string; }
interface UserType { id: string; name: string; email: string; }

export default function EditTaskPage() {
    const router = useRouter();
    const params = useParams();
    const taskId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        title: '', description: '', projectId: '', category: 'GENERAL',
        type: 'REVENUE', priority: 'MEDIUM', status: 'PENDING', isRevenueBased: true,
        estimatedValue: 0, itRevenueEarned: 0, isPaid: false, assignedToId: '',
        dueDate: '', progressPercent: 0, tags: '',
    });

    const fetchInitialData = useCallback(async () => {
        try {
            setLoading(true);
            const [taskRes, projectsRes, usersRes] = await Promise.all([
                fetch(`/api/it/tasks/${taskId}`),
                fetch('/api/it/projects'),
                fetch('/api/users?limit=100')
            ]);

            if (taskRes.ok && projectsRes.ok && usersRes.ok) {
                const taskData = await taskRes.json();
                setProjects(await projectsRes.json());
                const usersData = await usersRes.json();
                setUsers(Array.isArray(usersData) ? usersData : (usersData.data || []));

                setFormData({
                    title: taskData.title || '',
                    description: taskData.description || '',
                    projectId: taskData.projectId || '',
                    category: taskData.category || 'GENERAL',
                    type: taskData.type || 'REVENUE',
                    priority: taskData.priority || 'MEDIUM',
                    status: taskData.status || 'PENDING',
                    isRevenueBased: taskData.isRevenueBased ?? true,
                    estimatedValue: taskData.estimatedValue || 0,
                    itRevenueEarned: taskData.itRevenueEarned || 0,
                    isPaid: taskData.isPaid || false,
                    assignedToId: taskData.assignedToId || '',
                    dueDate: taskData.dueDate ? taskData.dueDate.split('T')[0] : '',
                    progressPercent: taskData.progressPercent || 0,
                    tags: Array.isArray(taskData.tags) ? taskData.tags.join(', ') : (taskData.tags || ''),
                });
            } else {
                router.push('/dashboard/it-management/tasks');
            }
        } catch (error) { console.error('Data sync failed:', error); }
        finally { setLoading(false); }
    }, [taskId, router]);

    useEffect(() => { if (taskId) fetchInitialData(); }, [taskId, fetchInitialData]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.title.trim()) newErrors.title = 'Mission title required';
        if (formData.progressPercent < 0 || formData.progressPercent > 100) newErrors.progressPercent = 'Invalid intensity mapping';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setSaving(true);
        try {
            const response = await fetch(`/api/it/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    projectId: formData.projectId || null,
                    estimatedValue: parseFloat(formData.estimatedValue.toString()),
                    itRevenueEarned: parseFloat(formData.itRevenueEarned.toString()),
                    assignedToId: formData.assignedToId || null,
                    dueDate: formData.dueDate || null,
                    progressPercent: parseInt(formData.progressPercent.toString()),
                    tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                }),
            });
            if (response.ok) router.push(`/dashboard/it-management/tasks/${taskId}`);
        } catch (error) { console.error('Transmission failed'); }
        finally { setSaving(false); }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
                    <div className="h-12 w-12 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Recalibrating Task Data...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="min-h-screen pb-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[length:250px] bg-repeat">
                <div className="max-w-5xl mx-auto space-y-12">
                    
                    {/* Header */}
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <button onClick={() => router.back()} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-purple-600 transition-all shadow-sm">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-1">Reconfigure Node</h1>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Operational Edit Protocol</p>
                            </div>
                        </div>
                    </motion.div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Main Interaction Column */}
                        <div className="lg:col-span-2 space-y-8">
                            
                            {/* Task Payload Deck */}
                            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                                className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 border border-white shadow-xl shadow-slate-200/50"
                            >
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3">
                                    <div className="p-2 bg-purple-600 rounded-lg"><Activity className="h-4 w-4 text-white" /></div> Identity Reconfiguration
                                </h2>
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mission Moniker *</label>
                                        <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                                            className={`w-full bg-slate-50 border ${errors.title ? 'border-rose-300' : 'border-slate-100'} rounded-[1.5rem] px-8 py-5 text-lg font-black text-slate-900 focus:bg-white focus:ring-4 focus:ring-purple-600/5 transition-all outline-none`}
                                        />
                                        {errors.title && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-4">{errors.title}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Intel Briefing</label>
                                        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-8 py-5 text-sm leading-relaxed text-slate-600 focus:bg-white focus:ring-4 focus:ring-purple-600/5 transition-all outline-none resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logic Class</label>
                                            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-6 py-4 text-xs font-black text-slate-900 uppercase focus:bg-white transition-all outline-none"
                                            >
                                                <option value="GENERAL">General</option>
                                                <option value="BUG_FIX">Bug Fix</option>
                                                <option value="FEATURE">Feature</option>
                                                <option value="SERVICE_REQUEST">Service Req</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Severity</label>
                                            <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-6 py-4 text-xs font-black text-slate-900 uppercase focus:bg-white transition-all outline-none"
                                            >
                                                <option value="LOW">Low</option>
                                                <option value="MEDIUM">Medium</option>
                                                <option value="HIGH">High</option>
                                                <option value="CRITICAL">Critical</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Intel Intensity (%)</label>
                                            <input type="number" value={formData.progressPercent} onChange={(e) => setFormData({ ...formData, progressPercent: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-6 py-4 text-xs font-black text-slate-900 outline-none" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Origin Deck */}
                            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                                className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 border border-white shadow-xl shadow-slate-200/50"
                            >
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3">
                                    <div className="p-2 bg-blue-600 rounded-lg"><FolderKanban className="h-4 w-4 text-white" /></div> Linked Architecture
                                </h2>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parent Project</label>
                                    <select value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-8 py-5 text-sm font-black text-slate-900 focus:bg-white transition-all outline-none"
                                    >
                                        <option value="">Standalone Operation</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </motion.div>

                            {/* Status Deck */}
                            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                                className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 border border-white shadow-xl shadow-slate-200/50"
                            >
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3">
                                    <div className="p-2 bg-slate-900 rounded-lg"><Zap className="h-4 w-4 text-white" /></div> Operational State
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Lifecycle</label>
                                        <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-6 py-4 text-xs font-black text-slate-900 uppercase focus:bg-white transition-all outline-none"
                                        >
                                            <option value="PENDING">Pending</option>
                                            <option value="IN_PROGRESS">In Progress</option>
                                            <option value="UNDER_REVIEW">Audit / Review</option>
                                            <option value="COMPLETED">Settled</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Intel Tags</label>
                                        <input type="text" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-6 py-4 text-xs font-black text-slate-900 placeholder:text-slate-300 uppercase focus:bg-white outline-none"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Right Sidebar Assets */}
                        <div className="space-y-8">
                            
                            {/* Personnel Deck */}
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                                className="bg-slate-900 rounded-[3rem] p-10 shadow-2xl text-white relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-10 flex items-center gap-3">
                                    <User className="h-4 w-4 text-purple-400" /> Terminal Agent
                                </h3>
                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Assigned Personnel</label>
                                        <select value={formData.assignedToId} onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white focus:bg-white/10 outline-none transition-all"
                                        >
                                            <option value="" className="bg-slate-900">Awaiting Assignment</option>
                                            {users.map(u => <option key={u.id} value={u.id} className="bg-slate-900">{u.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Clock className="h-3 w-3" /> Expiry Bound</label>
                                        <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} 
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white focus:bg-white/10 outline-none" />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Revenue Map */}
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
                                className="bg-emerald-600 rounded-[3rem] p-10 shadow-2xl text-white relative"
                            >
                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-8 flex items-center gap-3">
                                    <DollarSign className="h-4 w-4 text-emerald-300" /> Yield Analysis
                                </h3>
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Est. Flow (₹)</label>
                                        <input type="number" value={formData.estimatedValue} onChange={(e) => setFormData({ ...formData, estimatedValue: parseFloat(e.target.value) || 0 })} 
                                            className="w-full bg-black/10 border border-white/20 rounded-[1.2rem] px-6 py-5 text-2xl font-black text-white focus:bg-black/20 outline-none transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Actual Gain (₹)</label>
                                        <input type="number" value={formData.itRevenueEarned} onChange={(e) => setFormData({ ...formData, itRevenueEarned: parseFloat(e.target.value) || 0 })} 
                                            className="w-full bg-black/10 border border-white/20 rounded-[1.2rem] px-6 py-4 text-base font-black text-white outline-none" />
                                    </div>
                                    <div className="flex items-center gap-3 px-2">
                                        <input type="checkbox" id="isPaid" checked={formData.isPaid} onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                                            className="w-5 h-5 rounded-lg bg-white/10 border-white/20 text-emerald-500 focus:ring-0" />
                                        <label htmlFor="isPaid" className="text-[10px] font-black uppercase tracking-widest text-white/80 cursor-pointer">Settled Partition</label>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Action Buttons */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                                className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-8 border border-white shadow-xl flex flex-col gap-4"
                            >
                                <button type="submit" disabled={saving}
                                    className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-300 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {saving ? 'Syncing...' : 'Synchronize Node'}
                                </button>
                                <button type="button" onClick={() => router.back()}
                                    className="w-full py-4 bg-slate-50 text-slate-400 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                                >
                                    Cancel Revision
                                </button>
                            </motion.div>

                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
