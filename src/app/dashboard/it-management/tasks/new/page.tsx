'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ListTodo, Save, X, Calendar, DollarSign, User, AlertCircle, FolderKanban,
    ArrowLeft, Activity, Target, Zap, Shield, Briefcase, Tag, Clock
} from 'lucide-react';

interface Project { id: string; name: string; projectCode: string; }
interface UserType { id: string; name: string; email: string; }

function NewTaskForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        title: '', description: '', projectId: '', category: 'GENERAL',
        type: 'REVENUE', priority: 'MEDIUM', status: 'PENDING', isRevenueBased: true,
        estimatedValue: 0, itRevenueEarned: 0, isPaid: false, assignedToId: '',
        dueDate: '', progressPercent: 0, tags: '',
    });

    useEffect(() => {
        const projectIdFromUrl = searchParams.get('projectId');
        if (projectIdFromUrl) {
            setFormData(prev => ({ ...prev, projectId: projectIdFromUrl }));
        }
    }, [searchParams]);

    const fetchProjects = useCallback(async () => {
        try {
            const response = await fetch('/api/it/projects');
            if (response.ok) setProjects(await response.json());
        } catch (error) { console.error('Failed to fetch projects:', error); }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await fetch('/api/users?limit=100');
            if (response.ok) {
                const data = await response.json();
                setUsers(Array.isArray(data) ? data : data.data || []);
            }
        } catch (error) { console.error('Failed to fetch users:', error); setUsers([]); }
    }, []);

    useEffect(() => {
        fetchProjects();
        fetchUsers();
    }, [fetchProjects, fetchUsers]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.title.trim()) newErrors.title = 'Mission title required';
        if (!formData.description.trim()) newErrors.description = 'Intel description required';
        if (formData.isRevenueBased && formData.estimatedValue <= 0) newErrors.estimatedValue = 'Target yield must be positive';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setLoading(true);
        try {
            const response = await fetch('/api/it/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    projectId: formData.projectId || null,
                    estimatedValue: parseFloat(formData.estimatedValue.toString()),
                    itRevenueEarned: parseFloat(formData.itRevenueEarned.toString()),
                    assignedToId: formData.assignedToId || null,
                    dueDate: formData.dueDate || null,
                    progressPercent: parseInt(formData.progressPercent.toString()),
                    tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
                }),
            });
            if (response.ok) {
                const task = await response.json();
                router.push(`/dashboard/it-management/tasks/${task.id}`);
            } else {
                const error = await response.json();
                alert(error.error || 'Uplink failed');
            }
        } catch (error) { alert('Data link severed'); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen pb-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[length:250px] bg-repeat">
            <div className="max-w-5xl mx-auto space-y-12">
                
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => router.back()} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-purple-600 transition-all shadow-sm">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-1">Create Task Node</h1>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Operational Deployment Protocol</p>
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
                                <div className="p-2 bg-purple-600 rounded-lg"><Activity className="h-4 w-4 text-white" /></div> Operational Parameters
                            </h2>
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mission Moniker *</label>
                                    <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                                        className={`w-full bg-slate-50 border ${errors.title ? 'border-rose-300' : 'border-slate-100'} rounded-[1.5rem] px-8 py-5 text-lg font-black text-slate-900 placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-purple-600/5 transition-all outline-none`}
                                        placeholder="Deploy Authentication Layer"
                                    />
                                    {errors.title && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-4">{errors.title}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Briefing (Description) *</label>
                                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4}
                                        className={`w-full bg-slate-50 border ${errors.description ? 'border-rose-300' : 'border-slate-100'} rounded-[1.5rem] px-8 py-5 text-sm leading-relaxed text-slate-600 focus:bg-white focus:ring-4 focus:ring-purple-600/5 transition-all outline-none resize-none`}
                                        placeholder="Full mission requirements and acceptance logic..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logic Class</label>
                                        <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-6 py-4 text-xs font-black text-slate-900 uppercase focus:bg-white transition-all outline-none appearance-none"
                                        >
                                            <option value="GENERAL">General</option>
                                            <option value="BUG_FIX">Bug Fix</option>
                                            <option value="FEATURE">Feature</option>
                                            <option value="SERVICE_REQUEST">Service Req</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority</label>
                                        <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-6 py-4 text-xs font-black text-slate-900 uppercase focus:bg-white transition-all outline-none"
                                        >
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High</option>
                                            <option value="URGENT">Critical</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Intensity (%)</label>
                                        <input type="number" value={formData.progressPercent} onChange={(e) => setFormData({ ...formData, progressPercent: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-6 py-4 text-xs font-black text-slate-900 outline-none" placeholder="0" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Origin Deck (Project) */}
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                            className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 border border-white shadow-xl shadow-slate-200/50"
                        >
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-lg"><FolderKanban className="h-4 w-4 text-white" /></div> Origin Architecture
                            </h2>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parent Project (Optional)</label>
                                <select value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-8 py-5 text-sm font-black text-slate-900 focus:bg-white transition-all outline-none"
                                >
                                    <option value="">Standalone Operation</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.projectCode} — {p.name}</option>)}
                                </select>
                            </div>
                        </motion.div>

                        {/* Metadata Deck */}
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                            className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 border border-white shadow-xl shadow-slate-200/50"
                        >
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3">
                                <div className="p-2 bg-slate-900 rounded-lg"><Tag className="h-4 w-4 text-white" /></div> Operational Metadata
                            </h2>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logic Tags (Comma Transmitted)</label>
                                <input type="text" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-8 py-5 text-xs font-black text-slate-900 placeholder:text-slate-300 uppercase focus:bg-white outline-none"
                                    placeholder="FRONTEND, AUTH, SECURE"
                                />
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Sidebar Assets */}
                    <div className="space-y-8">
                        
                        {/* Assignment Deck */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                            className="bg-slate-900 rounded-[3rem] p-10 shadow-2xl text-white relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-10 flex items-center gap-3">
                                <User className="h-4 w-4 text-purple-400" /> Active Personnel
                            </h3>
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Assigned Agent</label>
                                    <select value={formData.assignedToId} onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white focus:bg-white/10 outline-none transition-all"
                                    >
                                        <option value="" className="bg-slate-900">Awaiting Assignment</option>
                                        {users.map(u => <option key={u.id} value={u.id} className="bg-slate-900">{u.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Clock className="h-3 w-3" /> Due Limit</label>
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
                                <DollarSign className="h-4 w-4 text-emerald-300" /> Yield Protocol
                            </h3>
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Yield Target (₹)</label>
                                    <input type="number" value={formData.estimatedValue} onChange={(e) => setFormData({ ...formData, estimatedValue: parseFloat(e.target.value) || 0 })} 
                                        className="w-full bg-black/10 border border-white/20 rounded-[1.2rem] px-6 py-5 text-2xl font-black text-white focus:bg-black/20 outline-none transition-all" />
                                </div>
                                <div className="flex items-center gap-3 px-2">
                                    <input type="checkbox" id="isRevenueBased" checked={formData.isRevenueBased} onChange={(e) => setFormData({ ...formData, isRevenueBased: e.target.checked })}
                                        className="w-5 h-5 rounded-lg bg-white/10 border-white/20 text-emerald-500 focus:ring-0" />
                                    <label htmlFor="isRevenueBased" className="text-[10px] font-black uppercase tracking-widest text-white/80 cursor-pointer">Revenue Generation Active</label>
                                </div>
                                <div className="pt-6 border-t border-white/10 flex flex-col items-center">
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Projected Dividend</p>
                                    <p className="text-3xl font-black text-white">₹{formData.estimatedValue.toLocaleString()}</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Finalize Action */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                            className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-8 border border-white shadow-xl flex flex-col gap-4"
                        >
                            <button type="submit" disabled={loading}
                                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-300 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Transmitting...' : 'Initialize Task'}
                            </button>
                            <button type="button" onClick={() => router.back()}
                                className="w-full py-4 bg-slate-50 text-slate-400 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                            >
                                Abort Sequence
                            </button>
                        </motion.div>

                    </div>
                </form>
            </div>
        </div>
    );
}

export default function NewTaskPage() {
    return (
        <DashboardLayout>
            <Suspense fallback={
                <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
                    <div className="h-12 w-12 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Calibrating Deployer...</p>
                </div>
            }>
                <NewTaskForm />
            </Suspense>
        </DashboardLayout>
    );
}
