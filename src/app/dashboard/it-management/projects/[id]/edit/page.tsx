'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    FolderKanban, Save, X, Calendar, DollarSign, Users, AlertCircle, Plus, Trash2, 
    ArrowLeft, Globe, Cpu, Shield, Layers, Tag, Briefcase, Zap, Eye
} from 'lucide-react';
import WebsiteQuickAddModal from '@/components/dashboard/it/WebsiteQuickAddModal';

interface User { id: string; name: string; email: string; }
interface Milestone { id: string; title: string; description: string; dueDate: string; status: string; }

export default function EditProjectPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [websites, setWebsites] = useState<any[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showQuickAddWebsite, setShowQuickAddWebsite] = useState(false);

    const [formData, setFormData] = useState({
        name: '', description: '', about: '', details: '', keywords: '', departmentId: '',
        websiteId: '', taggedEmployeeIds: [] as string[], category: 'DEVELOPMENT',
        type: 'REVENUE', priority: 'MEDIUM', status: 'PLANNING', isRevenueBased: true,
        estimatedRevenue: 0, itDepartmentCut: 30, startDate: '', endDate: '',
        projectManagerId: '', teamLeadId: '', visibility: 'PRIVATE', sharedWithIds: [] as string[],
    });

    const [milestones, setMilestones] = useState<Milestone[]>([]);

    const fetchInitialData = useCallback(async () => {
        try {
            setLoading(true);
            const [projectRes, usersRes, deptsRes, websRes] = await Promise.all([
                fetch(`/api/it/projects/${projectId}`),
                fetch('/api/users?limit=100'),
                fetch('/api/departments'),
                fetch('/api/it/monitoring/websites')
            ]);

            if (projectRes.ok && usersRes.ok) {
                const projectData = await projectRes.json();
                const usersData = await usersRes.json();
                setUsers(Array.isArray(usersData) ? usersData : (usersData.data || []));
                setDepartments(await deptsRes.json() || []);
                setWebsites(await websRes.json() || []);

                setFormData({
                    name: projectData.name || '',
                    description: projectData.description || '',
                    about: projectData.about || '',
                    details: projectData.details || '',
                    keywords: projectData.keywords ? projectData.keywords.join(', ') : '',
                    departmentId: projectData.department?.id || '',
                    websiteId: projectData.website?.id || '',
                    taggedEmployeeIds: projectData.taggedEmployees?.map((u: any) => u.id) || [],
                    category: projectData.category || 'DEVELOPMENT',
                    type: projectData.type || 'REVENUE',
                    priority: projectData.priority || 'MEDIUM',
                    status: projectData.status || 'PLANNING',
                    isRevenueBased: projectData.isRevenueBased ?? true,
                    estimatedRevenue: projectData.estimatedRevenue || 0,
                    itDepartmentCut: projectData.itDepartmentCut || 30,
                    startDate: projectData.startDate ? projectData.startDate.split('T')[0] : '',
                    endDate: projectData.endDate ? projectData.endDate.split('T')[0] : '',
                    projectManagerId: projectData.projectManagerId || '',
                    teamLeadId: projectData.teamLeadId || '',
                    visibility: projectData.visibility || 'PRIVATE',
                    sharedWithIds: projectData.sharedWithIds || [],
                });

                if (projectData.milestones) {
                    setMilestones(projectData.milestones.map((m: any) => ({
                        id: m.id,
                        title: m.name || m.title || '',
                        description: m.description || '',
                        dueDate: m.dueDate ? m.dueDate.split('T')[0] : '',
                        status: m.status || 'PENDING',
                    })));
                }
            } else {
                router.push('/dashboard/it-management/projects');
            }
        } catch (error) { console.error('Data sync failure:', error); }
        finally { setLoading(false); }
    }, [projectId, router]);

    useEffect(() => { if (projectId) fetchInitialData(); }, [projectId, fetchInitialData]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'Project moniker required';
        if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) newErrors.endDate = 'Chronology mismatch';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setSaving(true);
        try {
            const response = await fetch(`/api/it/projects/${projectId}`, {
                method: 'PATCH',
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
                    milestones: milestones.map(m => ({
                        id: m.id.startsWith('temp-') ? undefined : m.id,
                        title: m.title,
                        description: m.description,
                        dueDate: m.dueDate || null,
                        status: m.status,
                    })),
                }),
            });
            if (response.ok) {
                router.push(`/dashboard/it-management/projects/${projectId}`);
            } else {
                const errData = await response.json();
                alert(errData.error || 'Transmission failed');
            }
        } catch (error) { 
            console.error(error);
            alert('Transmission failed - Connection error');
        }
        finally { setSaving(false); }
    };

    const addMilestone = () => {
        setMilestones([...milestones, { id: `temp-${Date.now()}`, title: '', description: '', dueDate: '', status: 'PENDING' }]);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
                    <div className="h-12 w-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Acessing Project Core...</p>
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
                            <button onClick={() => router.back()} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-1">Re-architect Project</h1>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Operational Correction Protocol</p>
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
                                    <div className="p-2 bg-blue-600 rounded-lg"><Cpu className="h-4 w-4 text-white" /></div> Identity Reconfig
                                </h2>
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Moniker *</label>
                                        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                                            className={`w-full bg-slate-50 border ${errors.name ? 'border-rose-300' : 'border-slate-100'} rounded-[1.5rem] px-8 py-5 text-lg font-black text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none`}
                                        />
                                        {errors.name && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-4">{errors.name}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">About (Short Intel)</label>
                                        <input type="text" value={formData.about} onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-8 py-4 text-sm font-black text-slate-600 focus:bg-white transition-all outline-none shadow-inner" />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Scope Intel (Details)</label>
                                        <textarea value={formData.details} onChange={(e) => setFormData({ ...formData, details: e.target.value })} rows={6}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-8 py-5 text-sm leading-relaxed text-slate-600 focus:bg-white focus:ring-4 focus:ring-blue-600/5 transition-all outline-none resize-none shadow-sm"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class</label>
                                            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-6 py-4 text-xs font-black text-slate-900 uppercase focus:bg-white outline-none"
                                            >
                                                <option value="DEVELOPMENT">Development</option>
                                                <option value="INFRASTRUCTURE">Infrastructure</option>
                                                <option value="SECURITY">Security</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">State</label>
                                            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-6 py-4 text-xs font-black text-slate-900 uppercase focus:bg-white outline-none"
                                            >
                                                <option value="PLANNING">Planning</option>
                                                <option value="IN_PROGRESS">Active</option>
                                                <option value="TESTING">Testing</option>
                                                <option value="COMPLETED">Settled</option>
                                                <option value="ON_HOLD">On Hold</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                                            <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-[1.2rem] px-6 py-4 text-xs font-black text-slate-900 uppercase focus:bg-white outline-none"
                                            >
                                                <option value="SUPPORT">Support</option>
                                                <option value="DEPLOYMENT">Deployment</option>
                                                <option value="MAINTENANCE">Maintenance</option>
                                                <option value="REVENUE">Revenue</option>
                                                <option value="SERVICE_REQUEST">Service Request</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Milestone Array */}
                            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                                className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 border border-white shadow-xl shadow-slate-200/50"
                            >
                                <div className="flex items-center justify-between mb-10">
                                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                        <div className="p-2 bg-emerald-600 rounded-lg"><Zap className="h-4 w-4 text-white" /></div> Target Milestones
                                    </h2>
                                    <button type="button" onClick={addMilestone} className="p-3 bg-slate-900 text-white rounded-xl hover:scale-105 active:scale-95 transition-all">
                                        <Plus className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <AnimatePresence>
                                        {milestones.map((m, i) => (
                                            <motion.div key={m.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                                                className="p-8 bg-slate-50/50 border border-slate-100 rounded-[2rem] group"
                                            >
                                                <div className="flex items-center gap-6 mb-6">
                                                    <input type="text" value={m.title} onChange={(e) => setMilestones(milestones.map(ms => ms.id === m.id ? { ...ms, title: e.target.value } : ms))}
                                                        className="flex-1 bg-white border border-slate-100 rounded-xl px-6 py-3 text-xs font-black text-slate-900 focus:ring-4 focus:ring-emerald-600/5 outline-none" />
                                                    <input type="date" value={m.dueDate} onChange={(e) => setMilestones(milestones.map(ms => ms.id === m.id ? { ...ms, dueDate: e.target.value } : ms))}
                                                        className="w-40 bg-white border border-slate-100 rounded-xl px-6 py-3 text-[10px] font-black text-slate-900" />
                                                    <button type="button" onClick={() => setMilestones(milestones.filter(ms => ms.id !== m.id))} className="p-3 text-rose-400 hover:text-rose-600">
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </div>
                                                <textarea value={m.description} onChange={(e) => setMilestones(milestones.map(ms => ms.id === m.id ? { ...ms, description: e.target.value } : ms))}
                                                    rows={2} className="w-full bg-white border border-slate-100 rounded-xl px-6 py-4 text-xs text-slate-500 outline-none resize-none shadow-sm" />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        </div>

                        {/* Right Sidebar Assets */}
                        <div className="space-y-8">
                            
                            {/* Command Personnel */}
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                                className="bg-slate-900 rounded-[3rem] p-10 shadow-2xl text-white relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-10 flex items-center gap-3">
                                    <Users className="h-4 w-4 text-blue-400" /> Operational Team
                                </h3>
                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Prime Director</label>
                                        <select value={formData.projectManagerId} onChange={(e) => setFormData({ ...formData, projectManagerId: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white focus:bg-white/10 outline-none transition-all"
                                        >
                                            <option value="" className="bg-slate-900">Select PM</option>
                                            {users.map(u => <option key={u.id} value={u.id} className="bg-slate-900">{u.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Tactical Lead</label>
                                        <select value={formData.teamLeadId} onChange={(e) => setFormData({ ...formData, teamLeadId: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white focus:bg-white/10 outline-none transition-all"
                                        >
                                            <option value="" className="bg-slate-900">Select Lead</option>
                                            {users.map(u => <option key={u.id} value={u.id} className="bg-slate-900">{u.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Visibility Partition */}
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
                                className="bg-indigo-600 rounded-[3rem] p-10 shadow-2xl text-white relative"
                            >
                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-8 flex items-center gap-3">
                                    <Eye className="h-4 w-4 text-indigo-300" /> Visibility Matrix
                                </h3>
                                <div className="space-y-6">
                                    <select value={formData.visibility} onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                                            className="w-full bg-black/10 border border-white/20 rounded-2xl px-6 py-4 text-xs font-black text-white focus:bg-black/20 outline-none transition-all"
                                    >
                                        <option value="PRIVATE" className="bg-indigo-700">Company Only (Private)</option>
                                        <option value="PUBLIC" className="bg-indigo-700">Public Protocol</option>
                                        <option value="INDIVIDUALS" className="bg-indigo-700">Specific Agents</option>
                                    </select>
                                    {formData.visibility === 'INDIVIDUALS' && (
                                        <div className="space-y-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                            {users.map(u => (
                                                <label key={u.id} className="flex items-center gap-3 cursor-pointer group">
                                                    <input type="checkbox" checked={formData.sharedWithIds.includes(u.id)}
                                                        onChange={(e) => {
                                                            const newIds = e.target.checked ? [...formData.sharedWithIds, u.id] : formData.sharedWithIds.filter(id => id !== u.id);
                                                            setFormData({ ...formData, sharedWithIds: newIds });
                                                        }}
                                                        className="w-4 h-4 rounded-md border-white/20 bg-white/10 text-white focus:ring-0" />
                                                    <span className="text-[10px] font-black uppercase text-white/60 group-hover:text-white transition-colors">{u.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* Revenue Dividend */}
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
                                className="bg-emerald-600 rounded-[3rem] p-10 shadow-2xl text-white relative"
                            >
                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-8 flex items-center gap-3">
                                    <DollarSign className="h-4 w-4 text-emerald-300" /> Yield Partition
                                </h3>
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Revenue Goal (₹)</label>
                                        <input type="number" value={formData.estimatedRevenue} onChange={(e) => setFormData({ ...formData, estimatedRevenue: parseFloat(e.target.value) || 0 })} 
                                            className="w-full bg-black/10 border border-white/20 rounded-[1.2rem] px-6 py-5 text-2xl font-black text-white outline-none transition-all shadow-inner" />
                                    </div>
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Dept %</span>
                                        <input type="number" value={formData.itDepartmentCut} onChange={(e) => setFormData({ ...formData, itDepartmentCut: parseFloat(e.target.value) || 0 })}
                                            className="w-16 bg-transparent text-right font-black text-white outline-none" />
                                    </div>
                                    <div className="flex items-center gap-3 px-2">
                                        <input type="checkbox" id="isRevenueBased" checked={formData.isRevenueBased} onChange={(e) => setFormData({ ...formData, isRevenueBased: e.target.checked })}
                                            className="w-5 h-5 rounded-lg bg-white/10 border-white/20 text-emerald-500 focus:ring-0" />
                                        <label htmlFor="isRevenueBased" className="text-[10px] font-black uppercase tracking-widest text-white/80 cursor-pointer">Revenue Generation Active</label>
                                    </div>
                                    <div className="pt-6 border-t border-white/10 text-center">
                                        <p className="text-3xl font-black text-white">₹{((formData.estimatedRevenue * formData.itDepartmentCut) / 100).toLocaleString()}</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Digital Footprint (Website) */}
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.65 }}
                                className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 border border-white shadow-xl shadow-slate-200/50"
                            >
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 flex items-center gap-3">
                                    <Globe className="h-4 w-4 text-blue-600" /> Linked Infrastructure
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <select value={formData.websiteId} onChange={(e) => setFormData({ ...formData, websiteId: e.target.value })}
                                            className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black text-slate-900 focus:bg-white outline-none transition-all"
                                        >
                                            <option value="">No Active Monitor</option>
                                            {websites.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                        <button 
                                            type="button"
                                            onClick={() => setShowQuickAddWebsite(true)}
                                            className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center group"
                                            title="Add New Website"
                                        >
                                            <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />
                                        </button>
                                    </div>
                                    <p className="text-[9px] font-medium text-slate-400 italic px-2 leading-relaxed">Sync project status with live website uptime and performance metrics.</p>
                                </div>
                            </motion.div>



                            {/* Action Control */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                                className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-8 border border-white shadow-xl flex flex-col gap-4"
                            >
                                <button type="submit" disabled={saving}
                                    className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-300 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {saving ? 'Syncing...' : 'Update Architecture'}
                                </button>
                                <button type="button" onClick={() => router.back()}
                                    className="w-full py-4 bg-slate-50 text-slate-400 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                                >
                                    Abort protocol
                                </button>
                            </motion.div>

                        </div>
                    </form>
                    <WebsiteQuickAddModal 
                        isOpen={showQuickAddWebsite}
                        onClose={() => setShowQuickAddWebsite(false)}
                        onSuccess={(newWeb) => {
                            setWebsites(prev => [newWeb, ...prev]);
                            setFormData(prev => ({ ...prev, websiteId: newWeb.id }));
                        }}
                    />
                </div>
            </div>
        </DashboardLayout>
    );
}
