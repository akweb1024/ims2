'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    FolderKanban, Save, X, Calendar, DollarSign, Users, AlertCircle, Plus, Trash2, 
    ArrowLeft, Globe, Cpu, Shield, Layers, Tag, Briefcase, Zap
} from 'lucide-react';

interface User { id: string; name: string; email: string; }
interface Milestone { id: string; title: string; description: string; dueDate: string; status: string; }

export default function NewProjectPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [departments, setDepartments] = useState<any[]>([]);
    const [websites, setWebsites] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        name: '', description: '', about: '', details: '', keywords: '', departmentId: '',
        websiteId: '', taggedEmployeeIds: [] as string[], category: 'DEVELOPMENT',
        type: 'REVENUE', priority: 'MEDIUM', status: 'PLANNING', isRevenueBased: true,
        estimatedRevenue: 0, itDepartmentCut: 30, startDate: '', endDate: '',
        projectManagerId: '', teamLeadId: '',
    });

    const [milestones, setMilestones] = useState<Milestone[]>([]);

    useEffect(() => {
        fetchUsers();
        fetchDepartments();
        fetchWebsites();
    }, []);

    const fetchDepartments = async () => {
        try {
            const res = await fetch('/api/departments');
            if (res.ok) {
                const data = await res.json();
                setDepartments(Array.isArray(data) ? data : data.data || []);
            }
        } catch (error) { console.error('Failed to fetch departments:', error); }
    };

    const fetchWebsites = async () => {
        try {
            const res = await fetch('/api/it/monitoring/websites');
            if (res.ok) {
                const data = await res.json();
                setWebsites(Array.isArray(data) ? data : data.data || []);
            }
        } catch (error) { console.error('Failed to fetch websites:', error); }
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users?limit=100');
            if (response.ok) {
                const data = await response.json();
                setUsers(Array.isArray(data) ? data : data.data || []);
            }
        } catch (error) { console.error('Failed to fetch users:', error); setUsers([]); }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'Project name is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (formData.isRevenueBased && formData.estimatedRevenue <= 0) newErrors.estimatedRevenue = 'Revenue target must be positive';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setLoading(true);
        try {
            const response = await fetch('/api/it/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    estimatedRevenue: parseFloat(formData.estimatedRevenue.toString()),
                    itDepartmentCut: parseFloat(formData.itDepartmentCut.toString()),
                    startDate: formData.startDate || null,
                    endDate: formData.endDate || null,
                    projectManagerId: formData.projectManagerId || null,
                    teamLeadId: formData.teamLeadId || null,
                    departmentId: formData.departmentId || null,
                    websiteId: formData.websiteId || null,
                    keywords: formData.keywords ? formData.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
                    taggedEmployeeIds: formData.taggedEmployeeIds,
                    milestones: milestones.map(m => ({ title: m.title, description: m.description, dueDate: m.dueDate, status: m.status })),
                }),
            });
            if (response.ok) {
                const project = await response.json();
                router.push(`/dashboard/it-management/projects/${project.id}`);
            } else {
                const error = await response.json();
                alert(error.error || 'Initiation sequence failed');
            }
        } catch (error) { alert('Data uplink lost'); }
        finally { setLoading(false); }
    };

    const addMilestone = () => {
        setMilestones([...milestones, { id: `temp-${Date.now()}`, title: '', description: '', dueDate: '', status: 'PENDING' }]);
    };

    return (
        <DashboardLayout>
            <div className="min-h-screen pb-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[length:250px] bg-repeat">
                <div className="max-w-5xl mx-auto space-y-12">
                    
                    {/* Header */}
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <button onClick={() => router.back()} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-1">Scale New Frontier</h1>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Project Initialization Protocol</p>
                            </div>
                        </div>
                        <div className="hidden lg:flex items-center gap-3">
                            <div className="px-4 py-2 bg-blue-50/50 border border-blue-100 rounded-xl">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">Status: Drafting</span>
                            </div>
                        </div>
                    </motion.div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Main Interaction Column */}
                        <div className="lg:col-span-2 space-y-8">
                            
                            {/* Identity Deck */}
                            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                                className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 border border-white shadow-xl shadow-slate-200/50"
                            >
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3">
                                    <div className="p-2 bg-blue-600 rounded-lg"><Cpu className="h-4 w-4 text-white" /></div> Identity Params
                                </h2>
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Moniker *</label>
                                        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                                            className={`w-full bg-slate-50 border ${errors.name ? 'border-rose-300' : 'border-slate-100'} rounded-[1.5rem] px-8 py-5 text-lg font-black text-slate-900 placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none`}
                                            placeholder="System Alpha Revamp"
                                        />
                                        {errors.name && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-4">{errors.name}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Intel Summary (Description) *</label>
                                        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4}
                                            className={`w-full bg-slate-50 border ${errors.description ? 'border-rose-300' : 'border-slate-100'} rounded-[1.5rem] px-8 py-5 text-sm leading-relaxed text-slate-600 focus:bg-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none resize-none`}
                                            placeholder="High-level mission objective and tactical scope..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Core Category</label>
                                            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-6 py-4 text-xs font-black text-slate-900 uppercase focus:bg-white transition-all outline-none"
                                            >
                                                <option value="DEVELOPMENT">Development</option>
                                                <option value="INFRASTRUCTURE">Infrastructure</option>
                                                <option value="SECURITY">Security</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mission Severity</label>
                                            <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-6 py-4 text-xs font-black text-slate-900 uppercase focus:bg-white transition-all outline-none"
                                            >
                                                <option value="LOW">Low</option>
                                                <option value="MEDIUM">Medium</option>
                                                <option value="HIGH">High</option>
                                                <option value="CRITICAL">Critical</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Chronology Deck (Timeline) */}
                            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                                className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 border border-white shadow-xl shadow-slate-200/50"
                            >
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3">
                                    <div className="p-2 bg-purple-600 rounded-lg"><Calendar className="h-4 w-4 text-white" /></div> Timeline Matrix
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Launch Sequence (Start)</label>
                                        <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} 
                                            className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-8 py-4 text-xs font-black text-slate-900 shadow-inner" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Final Horizon (End)</label>
                                        <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} 
                                            className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-8 py-4 text-xs font-black text-slate-900 shadow-inner" />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Milestone Array */}
                            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                                className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 border border-white shadow-xl shadow-slate-200/50"
                            >
                                <div className="flex items-center justify-between mb-10">
                                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                        <div className="p-2 bg-emerald-600 rounded-lg"><Zap className="h-4 w-4 text-white" /></div> Core Milestones
                                    </h2>
                                    <button type="button" onClick={addMilestone} className="p-3 bg-slate-900 text-white rounded-xl hover:scale-105 active:scale-95 transition-all">
                                        <Plus className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <AnimatePresence>
                                        {milestones.length === 0 ? (
                                            <div className="py-10 border-2 border-dashed border-slate-100 rounded-[2rem] text-center">
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">No target markers defined</p>
                                            </div>
                                        ) : (
                                            milestones.map((m, i) => (
                                                <motion.div key={m.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                                                    className="p-8 bg-slate-50/50 border border-slate-100 rounded-[2rem] group"
                                                >
                                                    <div className="flex items-center gap-6 mb-6">
                                                        <input type="text" value={m.title} onChange={(e) => setMilestones(milestones.map(ms => ms.id === m.id ? { ...ms, title: e.target.value } : ms))}
                                                            placeholder="Phase Title" className="flex-1 bg-white border border-slate-100 rounded-xl px-6 py-3 text-xs font-black text-slate-900 focus:ring-4 focus:ring-emerald-600/5 outline-none" />
                                                        <input type="date" value={m.dueDate} onChange={(e) => setMilestones(milestones.map(ms => ms.id === m.id ? { ...ms, dueDate: e.target.value } : ms))}
                                                            className="w-40 bg-white border border-slate-100 rounded-xl px-6 py-3 text-[10px] font-black text-slate-900" />
                                                        <button type="button" onClick={() => setMilestones(milestones.filter(ms => ms.id !== m.id))} className="p-3 text-rose-400 hover:text-rose-600">
                                                            <Trash2 className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                    <textarea value={m.description} onChange={(e) => setMilestones(milestones.map(ms => ms.id === m.id ? { ...ms, description: e.target.value } : ms))}
                                                        placeholder="Marker Intel..." rows={2} className="w-full bg-white border border-slate-100 rounded-xl px-6 py-4 text-xs text-slate-500 outline-none resize-none" />
                                                </motion.div>
                                            ))
                                        )}
                                    </AnimatePresence>
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
                                    <Users className="h-4 w-4 text-blue-400" /> Command Personnel
                                </h3>
                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Prime Director (PM)</label>
                                        <select value={formData.projectManagerId} onChange={(e) => setFormData({ ...formData, projectManagerId: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white focus:bg-white/10 outline-none transition-all"
                                        >
                                            <option value="" className="bg-slate-900">Assign Director</option>
                                            {users.map(u => <option key={u.id} value={u.id} className="bg-slate-900">{u.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Tactical Lead</label>
                                        <select value={formData.teamLeadId} onChange={(e) => setFormData({ ...formData, teamLeadId: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white focus:bg-white/10 outline-none transition-all"
                                        >
                                            <option value="" className="bg-slate-900">Assign Lead</option>
                                            {users.map(u => <option key={u.id} value={u.id} className="bg-slate-900">{u.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Revenue Dividend */}
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
                                className="bg-emerald-600 rounded-[3rem] p-10 shadow-2xl text-white relative"
                            >
                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-8 flex items-center gap-3">
                                    <DollarSign className="h-4 w-4 text-emerald-300" /> Fiscal Yield
                                </h3>
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Revenue Goal (₹)</label>
                                        <input type="number" value={formData.estimatedRevenue} onChange={(e) => setFormData({ ...formData, estimatedRevenue: parseFloat(e.target.value) || 0 })} 
                                            className="w-full bg-black/10 border border-white/20 rounded-[1.2rem] px-6 py-5 text-2xl font-black text-white focus:bg-black/20 outline-none transition-all" />
                                    </div>
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">IT Dept Cut</span>
                                        <div className="flex items-center gap-2">
                                            <input type="number" value={formData.itDepartmentCut} onChange={(e) => setFormData({ ...formData, itDepartmentCut: parseFloat(e.target.value) || 0 })}
                                                className="w-12 bg-transparent text-right font-black text-white outline-none" />
                                            <span className="text-[10px] font-black text-white/40 uppercase">%</span>
                                        </div>
                                    </div>
                                    <div className="pt-6 border-t border-white/10 flex flex-col items-center">
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Projected Dividend</p>
                                        <p className="text-3xl font-black text-white">₹{((formData.estimatedRevenue * formData.itDepartmentCut) / 100).toLocaleString()}</p>
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
                                    {loading ? 'Transmitting...' : 'Initialize Mission'}
                                </button>
                                <button type="button" onClick={() => router.back()}
                                    className="w-full py-4 bg-slate-50 text-slate-400 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                                >
                                    Abort protocol
                                </button>
                            </motion.div>

                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
