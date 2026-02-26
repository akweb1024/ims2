/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    FolderKanban, Edit, Trash2, Calendar, DollarSign, Users, CheckCircle2,
    Clock, TrendingUp, AlertCircle, ArrowLeft, Plus, ListTodo, BookOpen, Target,
} from 'lucide-react';
import MilestoneModal from '@/components/dashboard/it/MilestoneModal';
import ITDocumentManager from '@/components/dashboard/it/ITDocumentManager';
import ProjectTimeline from '@/components/dashboard/it/ProjectTimeline';
import ProjectComments from '@/components/dashboard/it/ProjectComments';
import ProjectSuggestions from '@/components/dashboard/it/ProjectSuggestions';
import { LayoutDashboard, FileText as FileIcon, GanttChart, Globe, Building2, Tag, MessageSquare, AlertTriangle, ChevronRight, Activity, ShieldCheck, Zap } from 'lucide-react';

interface Project {
    id: string; projectCode: string; name: string; description: string | null;
    category: string; type: string; status: string; priority: string;
    isRevenueBased: boolean; estimatedRevenue: number; actualRevenue: number;
    itRevenueEarned: number; itDepartmentCut: number;
    startDate: string | null; endDate: string | null; createdAt: string; updatedAt: string;
    about?: string | null; details?: string | null; keywords?: string[];
    department?: { id: string; name: string } | null;
    website?: { id: string; name: string; url: string } | null;
    taggedEmployees?: Array<{ id: string; name: string; email: string; employeeProfile: { profilePicture: string | null } | null }>;
    projectManager: { id: string; name: string; email: string; } | null;
    teamLead: { id: string; name: string; email: string; } | null;
    visibility: 'PRIVATE' | 'PUBLIC' | 'INDIVIDUALS';
    sharedWithIds: string[];
    milestones: Array<{ id: string; name: string; description: string | null; dueDate: string; status: string; completedAt: string | null; paymentAmount: number | null; isPaid: boolean; }>;
    tasks: Array<{ id: string; taskCode: string; title: string; status: string; priority: string; type: string; progressPercent: number; assignedTo: { id: string; name: string; } | null; }>;
    suggestions: Array<{ id: string; content: string; status: 'PENDING' | 'RESOLVED' | 'FAILED' | 'HOLD'; authorName: string | null; createdAt: string; userId: string | null; user?: { id: string; name: string; employeeProfile?: { profilePicture: string | null } } }>;
    stats: { 
        totalTasks: number; 
        completedTasks: number; 
        inProgressTasks: number; 
        pendingTasks: number;
        pendingSuggestions: number;
        holdSuggestions: number;
        completionRate: number; 
    };
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    COMPLETED: { label: 'Settled', bg: 'bg-emerald-50/50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    IN_PROGRESS: { label: 'Active', bg: 'bg-blue-50/50', text: 'text-blue-700', dot: 'bg-blue-500' },
    ON_HOLD: { label: 'On Hold', bg: 'bg-amber-50/50', text: 'text-amber-700', dot: 'bg-amber-500' },
    PLANNING: { label: 'Planning', bg: 'bg-purple-50/50', text: 'text-purple-700', dot: 'bg-purple-500' },
    TESTING: { label: 'Testing', bg: 'bg-orange-50/50', text: 'text-orange-700', dot: 'bg-orange-500' },
};

const PRIORITY_CONFIG: Record<string, { label: string; text: string }> = {
    CRITICAL: { label: 'Critical', text: 'text-rose-600' },
    HIGH: { label: 'High', text: 'text-orange-600' },
    MEDIUM: { label: 'Medium', text: 'text-amber-600' },
    LOW: { label: 'Low', text: 'text-emerald-600' },
};

export default function ProjectDetailPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [showMilestoneModal, setShowMilestoneModal] = useState(false);
    const [selectedMilestone, setSelectedMilestone] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'documents' | 'suggestions'>('overview');

    const fetchProject = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/it/projects/${projectId}`);
            if (response.ok) setProject(await response.json());
            else { alert('Failed to load project'); router.push('/dashboard/it-management/projects'); }
        } catch { alert('Failed to load project'); }
        finally { setLoading(false); }
    }, [projectId, router]);

    useEffect(() => { if (projectId) fetchProject(); }, [projectId, fetchProject]);

    const handleDelete = async () => {
        if (!confirm('Abort this mission? This action is irreversible.')) return;
        setDeleting(true);
        try {
            const response = await fetch(`/api/it/projects/${projectId}`, { method: 'DELETE' });
            if (response.ok) { alert('Mission aborted'); router.push('/dashboard/it-management/projects'); }
            else { const error = await response.json(); alert(error.error || 'Failed to abort mission'); }
        } catch { alert('Failed to abort mission'); }
        finally { setDeleting(false); }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
                    <div className="h-12 w-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Synchronizing Project Matrix...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!project) {
        return (
            <DashboardLayout>
                <div className="min-h-[80vh] flex items-center justify-center">
                    <div className="p-10 bg-white/40 backdrop-blur-xl rounded-[3rem] border border-white/60 shadow-xl text-center max-w-md space-y-6">
                        <div className="h-20 w-20 rounded-[2.5rem] bg-rose-50 flex items-center justify-center mx-auto text-rose-500">
                            <AlertTriangle className="h-10 w-10" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-900 leading-tight">Project Off-Grid</h3>
                            <p className="text-slate-500 font-medium">Unable to locate the specified mission parameters in our data core.</p>
                        </div>
                        <button onClick={() => router.push('/dashboard/it-management/projects')} className="px-8 py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all">Back to Fleet</button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="min-h-screen pb-20 space-y-8 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[length:200px] bg-repeat">
                
                {/* Modern Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
                >
                    <div className="flex items-center gap-6">
                        <button onClick={() => router.back()} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:shadow-lg transition-all">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="px-3 py-1 bg-blue-600/10 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest leading-none">
                                    {project.projectCode}
                                </span>
                                <span className="h-1 w-1 rounded-full bg-slate-200" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{project.category}</span>
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{project.name}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push(`/dashboard/it-management/projects/${projectId}/edit`)} 
                            className="px-6 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-600 text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
                            <Edit className="h-4 w-4" /> Refine parameters
                        </button>
                        <button onClick={handleDelete} disabled={deleting} 
                            className="p-3.5 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all disabled:opacity-50">
                            <Trash2 className="h-5 w-5" />
                        </button>
                    </div>
                </motion.div>

                {/* Primary Intelligence Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/80 shadow-sm"
                    >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Lifecycle State</p>
                        <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${STATUS_CONFIG[project.status]?.dot || 'bg-slate-400'}`} />
                            <span className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                {STATUS_CONFIG[project.status]?.label || project.status.replace('_', ' ')}
                            </span>
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/80 shadow-sm"
                    >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Criticality Level</p>
                        <span className={`text-lg font-black uppercase tracking-tight ${PRIORITY_CONFIG[project.priority]?.text || 'text-slate-600'}`}>
                            {project.priority} Severity
                        </span>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/80 shadow-sm"
                    >
                        <div className="flex justify-between items-center mb-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency Rate</p>
                            <span className="text-lg font-black text-blue-600">{project.stats.completionRate}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${project.stats.completionRate}%` }} className="h-full bg-blue-600 rounded-full" />
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        className={`bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/80 shadow-sm ${project.isRevenueBased ? 'bg-emerald-50/50 border-emerald-100' : ''}`}
                    >
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${project.isRevenueBased ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {project.isRevenueBased ? 'Financial Impact' : 'Mission Stream'}
                        </p>
                        <p className={`text-lg font-black uppercase tracking-tight ${project.isRevenueBased ? 'text-emerald-700' : 'text-slate-900'}`}>
                            {project.isRevenueBased ? `₹${project.itRevenueEarned.toLocaleString()}` : project.type}
                        </p>
                    </motion.div>
                </div>

                {/* Tabs Hub */}
                <div className="flex flex-wrap gap-2 p-1.5 bg-white/60 backdrop-blur-md rounded-[2rem] border border-white/80 shadow-sm w-fit">
                    {[
                        { key: 'overview', label: 'Architecture', icon: LayoutDashboard },
                        { key: 'timeline', label: 'Chronology', icon: GanttChart },
                        { key: 'documents', label: 'Assets', icon: FileIcon },
                        { key: 'suggestions', label: 'Logic Feedback', icon: MessageSquare, count: project.stats.pendingSuggestions },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                            className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <tab.icon className="h-4 w-4" /> 
                            {tab.label}
                            {tab.count ? <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white rounded-full text-[9px]">{tab.count}</span> : null}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Intelligence Column */}
                    <div className="lg:col-span-2 space-y-8">
                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
                                {activeTab === 'overview' ? (
                                    <div className="space-y-8">
                                        {/* About Deck */}
                                        <div className="bg-white/70 backdrop-blur-xl rounded-[3rem] p-10 border border-white/80 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-8 transform rotate-12 opacity-5">
                                                <ShieldCheck className="h-32 w-32 text-blue-600" />
                                            </div>
                                            <div className="relative space-y-6">
                                                <div className="space-y-4">
                                                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                                        <Activity className="h-6 w-6 text-blue-600" /> Executive Digest
                                                    </h3>
                                                    <p className="text-slate-600 font-medium leading-relaxed bg-white/50 p-6 rounded-[2rem] border border-white/80 italic">{project.about || 'Operational summary currently undergoing encryption...'}</p>
                                                </div>
                                                <div className="space-y-3">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1"><FileIcon className="h-3 w-3" /> Technical Scope</h4>
                                                    <div className="bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                                                        <p className="text-slate-600 text-sm whitespace-pre-wrap leading-loose">{project.description || 'Global mission parameters undefined.'}</p>
                                                    </div>
                                                </div>
                                                {project.keywords && project.keywords.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 pt-4">
                                                        {project.keywords.map(kw => (
                                                            <span key={kw} className="px-3 py-1.5 bg-white border border-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                                <Tag className="h-3 w-3" /> {kw}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Deployment Milestones */}
                                        <div className="bg-white/70 backdrop-blur-xl rounded-[3rem] p-10 border border-white/80 shadow-sm">
                                            <div className="flex items-center justify-between mb-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center">
                                                        <Target className="h-6 w-6 text-white" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest leading-none">Strategic Points</h3>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phase delivery and fiscal synchronization</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => { setSelectedMilestone(null); setShowMilestoneModal(true); }} 
                                                    className="p-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xl shadow-blue-200">
                                                    <Plus className="h-5 w-5" />
                                                </button>
                                            </div>

                                            {project.milestones.length === 0 ? (
                                                <div className="text-center py-20 border-4 border-dashed border-slate-100 rounded-[3rem] space-y-4">
                                                    <Calendar className="h-12 w-12 text-slate-200 mx-auto" />
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No strategic points established</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {project.milestones.map((ms, idx) => (
                                                        <motion.div key={ms.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
                                                            className="group relative flex gap-8 pl-10 border-l border-slate-100 last:border-transparent pb-10 last:pb-0"
                                                        >
                                                            <div className={`absolute left-0 -translate-x-1/2 top-0 w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center transition-all ${ms.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-slate-200 group-hover:bg-blue-500'}`}>
                                                                {ms.status === 'COMPLETED' ? <CheckCircle2 className="h-4 w-4 text-white" /> : <div className="h-2 w-2 rounded-full bg-slate-400 group-hover:bg-white" />}
                                                            </div>
                                                            <div className="flex-1 bg-white/50 border border-white hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 hover:border-slate-100 p-8 rounded-[2.5rem] transition-all relative">
                                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                                                    <div>
                                                                        <h4 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-none mb-2">{ms.name}</h4>
                                                                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                                            <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Due {new Date(ms.dueDate).toLocaleDateString()}</span>
                                                                            {ms.completedAt && <span className="text-emerald-500">Resolved: {new Date(ms.completedAt).toLocaleDateString()}</span>}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest ${ms.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                                                            {ms.status}
                                                                        </span>
                                                                        <button onClick={() => { setSelectedMilestone(ms); setShowMilestoneModal(true); }} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-lg transition-all">
                                                                            <Edit className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                {ms.description && <p className="text-slate-500 text-sm leading-relaxed mb-6 italic">{ms.description}</p>}
                                                                {ms.paymentAmount && ms.paymentAmount > 0 && (
                                                                    <div className={`p-4 rounded-2xl flex items-center justify-between ${ms.isPaid ? 'bg-emerald-50/50 text-emerald-700 border border-emerald-100' : 'bg-amber-50/50 text-amber-700 border border-amber-100'}`}>
                                                                        <div className="flex items-center gap-3">
                                                                            <DollarSign className="h-5 w-5" />
                                                                            <span className="text-xs font-black uppercase tracking-widest leading-none">Phase Valuation</span>
                                                                        </div>
                                                                        <span className="text-lg font-black leading-none">₹{ms.paymentAmount.toLocaleString()} {ms.isPaid && '✓'}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <ProjectComments projectId={projectId} />
                                    </div>
                                ) : activeTab === 'timeline' ? (
                                    <ProjectTimeline startDate={project.startDate} endDate={project.endDate} milestones={project.milestones} tasks={project.tasks} />
                                ) : activeTab === 'suggestions' ? (
                                    <ProjectSuggestions projectId={projectId} suggestions={project.suggestions} onUpdate={fetchProject} canManage={true} />
                                ) : (
                                    <div className="bg-white/70 backdrop-blur-xl rounded-[3rem] p-10 border border-white/80 shadow-sm">
                                        <ITDocumentManager projectId={projectId} />
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Right Tactical Sidebar */}
                    <div className="space-y-8">
                        {/* Meta Intel */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
                            className="bg-white/70 backdrop-blur-xl rounded-[3rem] p-8 border border-white/80 shadow-sm space-y-8"
                        >
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                <Activity className="h-4 w-4 text-blue-500" /> Tactical Parameters
                            </h3>
                            <div className="space-y-6">
                                {[
                                    { label: 'Deployment Stream', val: project.type, icon: Zap },
                                    { label: 'Category Focus', val: project.category, icon: Layers },
                                    { label: 'Mission Start', val: project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A', icon: Calendar },
                                    { label: 'Limit Cycle', val: project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Active', icon: Clock },
                                ].map(item => (
                                    <div key={item.label} className="flex items-start gap-4">
                                        <div className="p-3 bg-slate-50 rounded-xl text-slate-400">
                                            <item.icon className="h-4 w-4" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{item.label}</p>
                                            <p className="font-black text-slate-900 leading-tight uppercase tracking-tight">{item.val}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Personnel Deck */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
                            className="bg-white/70 backdrop-blur-xl rounded-[3rem] p-8 border border-white/80 shadow-sm space-y-8"
                        >
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                <Users className="h-4 w-4 text-purple-600" /> Assigned Personnel
                            </h3>
                            <div className="space-y-6">
                                {project.projectManager && (
                                    <div className="p-5 bg-blue-600/5 border border-blue-600/10 rounded-2xl space-y-3">
                                        <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest leading-none">Mission Director</p>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-xs font-black text-white">
                                                {project.projectManager.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 leading-none mb-1">{project.projectManager.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 lowercase">{project.projectManager.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {project.teamLead && (
                                    <div className="p-5 bg-purple-600/5 border border-purple-600/10 rounded-2xl space-y-3">
                                        <p className="text-[10px] font-black text-purple-600/60 uppercase tracking-widest leading-none">Tactical Lead</p>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-purple-600 flex items-center justify-center text-xs font-black text-white">
                                                {project.teamLead.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 leading-none mb-1">{project.teamLead.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 lowercase">{project.teamLead.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {project.taggedEmployees && project.taggedEmployees.length > 0 && (
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tactical Subs</p>
                                        <div className="flex flex-wrap gap-2">
                                            {project.taggedEmployees.map(emp => (
                                                <div key={emp.id} className="flex items-center gap-2 bg-white border border-slate-100 px-3 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all cursor-default">
                                                    {emp.employeeProfile?.profilePicture ? (
                                                        <img src={emp.employeeProfile.profilePicture} className="w-5 h-5 rounded-full" alt="" />
                                                    ) : (
                                                        <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500 uppercase">{emp.name.charAt(0)}</div>
                                                    )}
                                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{emp.name.split(' ')[0]}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Revenue Yield Map */}
                        {project.isRevenueBased && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 }}
                                className="bg-slate-900 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
                                <h3 className="text-white text-xs font-black uppercase tracking-widest mb-8 flex items-center gap-3">
                                    <DollarSign className="h-4 w-4 text-emerald-400" /> Yield Breakdown
                                </h3>
                                <div className="space-y-6 mb-10">
                                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Value</span>
                                        <span className="text-white font-black">₹{project.estimatedRevenue.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IT Node Cut ({project.itDepartmentCut}%)</span>
                                        <span className="text-emerald-400 font-black">₹{((project.estimatedRevenue * project.itDepartmentCut) / 100).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="pt-8 border-t border-white/10 flex flex-col items-center">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Net IT Dividend Earned</p>
                                    <p className="text-4xl font-black text-white tracking-tighter shadow-sm">₹{project.itRevenueEarned.toLocaleString()}</p>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>

                <MilestoneModal isOpen={showMilestoneModal} onClose={() => setShowMilestoneModal(false)} projectId={projectId} milestone={selectedMilestone || undefined} onSuccess={fetchProject} />
            </div>
        </DashboardLayout>
    );
}

// Simple internal icons for components not available in lucide
const Layers = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.85a.49.49 0 0 0 0 .88L11.17 12.4a2 2 0 0 0 1.66 0l8.57-4.67a.49.49 0 0 0 0-.88Z"/><path d="m2.6 11.33 8.57 4.67a2 2 0 0 0 1.66 0l8.57-4.67"/><path d="m2.6 15.81 8.57 4.67a2 2 0 0 0 1.66 0l8.57-4.67"/></svg>
);
