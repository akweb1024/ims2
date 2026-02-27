/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    FolderKanban, Edit, Trash2, Calendar, DollarSign, Users, CheckCircle2,
    Clock, TrendingUp, AlertCircle, ArrowLeft, Plus, ListTodo, BookOpen, Target,
    LayoutDashboard, FileText as FileIcon, GanttChart, Globe, Building2, Tag, 
    MessageSquare, AlertTriangle, ChevronRight, Activity, ShieldCheck, Zap, 
    ArrowUpRight, Cpu, Percent, RefreshCcw, Layers, Terminal, Shield, Radar,
    Fingerprint, Network, Database, ShieldAlert, Binary, Settings, Share2,
    Lock, Sparkles, Command
} from 'lucide-react';
import MilestoneModal from '@/components/dashboard/it/MilestoneModal';
import ITDocumentManager from '@/components/dashboard/it/ITDocumentManager';
import ProjectTimeline from '@/components/dashboard/it/ProjectTimeline';
import ProjectComments from '@/components/dashboard/it/ProjectComments';
import ProjectSuggestions from '@/components/dashboard/it/ProjectSuggestions';
import FleetAuditModal from '@/components/dashboard/it/FleetAuditModal';

interface Project {
    id: string; projectCode: string; name: string; description: string | null;
    category: string; type: string; status: string; priority: string;
    isRevenueBased: boolean; estimatedRevenue: number; actualRevenue: number;
    itRevenueEarned: number; itDepartmentCut: number;
    startDate: string | null; endDate: string | null; createdAt: string; updatedAt: string;
    about?: string | null; details?: string | null; keywords?: string[];
    department?: { id: string; name: string } | null;
    website?: { id: string; name: string; url: string; status: string } | null;
    taggedEmployees?: Array<{ id: string; name: string; email: string; employeeProfile: { profilePicture: string | null } | null }>;
    projectManager: { id: string; name: string; email: string; employeeProfile?: { profilePicture: string | null } } | null;
    teamLead: { id: string; name: string; email: string; employeeProfile?: { profilePicture: string | null } } | null;
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

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; shadow: string; gradient: string }> = {
    COMPLETED: { 
        label: 'Settled', 
        bg: 'bg-emerald-500/10', 
        text: 'text-emerald-500', 
        dot: 'bg-emerald-500', 
        shadow: 'shadow-emerald-500/20',
        gradient: 'from-emerald-600 to-emerald-400'
    },
    IN_PROGRESS: { 
        label: 'Active', 
        bg: 'bg-blue-500/10', 
        text: 'text-blue-500', 
        dot: 'bg-blue-500', 
        shadow: 'shadow-blue-500/20',
        gradient: 'from-blue-600 to-cyan-400'
    },
    ON_HOLD: { 
        label: 'On Hold', 
        bg: 'bg-amber-500/10', 
        text: 'text-amber-500', 
        dot: 'bg-amber-500', 
        shadow: 'shadow-amber-500/20',
        gradient: 'from-amber-600 to-yellow-400'
    },
    PLANNING: { 
        label: 'Planning', 
        bg: 'bg-indigo-500/10', 
        text: 'text-indigo-500', 
        dot: 'bg-indigo-500', 
        shadow: 'shadow-indigo-500/20',
        gradient: 'from-indigo-600 to-purple-400'
    },
    TESTING: { 
        label: 'Testing', 
        bg: 'bg-rose-500/10', 
        text: 'text-rose-500', 
        dot: 'bg-rose-500', 
        shadow: 'shadow-rose-500/20',
        gradient: 'from-rose-600 to-pink-400'
    },
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
    const [showFleetAudit, setShowFleetAudit] = useState(false);
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
                <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-8">
                    <div className="relative">
                        <div className="h-24 w-24 border-8 border-blue-600/10 border-t-blue-600 rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Cpu className="h-8 w-8 text-blue-600 animate-pulse" />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <p className="font-black text-slate-900 uppercase tracking-[0.4em] text-sm">Synchronizing Project Matrix</p>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Accessing Secure Data Cluser: IMS-IT-01</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!project) {
        return (
            <DashboardLayout>
                <div className="min-h-[80vh] flex items-center justify-center">
                    <div className="p-16 bg-white rounded-[4rem] border border-slate-100 shadow-[0_32px_128px_rgba(0,0,0,0.08)] text-center max-w-xl space-y-10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-rose-500" />
                        <div className="h-24 w-24 rounded-[2.5rem] bg-rose-50 flex items-center justify-center mx-auto text-rose-500 shadow-xl shadow-rose-500/10">
                            <ShieldAlert className="h-12 w-12" />
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">Mission ID Not Found</h3>
                            <p className="text-slate-500 font-medium text-lg px-8">The specified project parameters have been purged or are currently off-grid.</p>
                        </div>
                        <button onClick={() => router.push('/dashboard/it-management/projects')} className="px-12 py-5 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-[1.5rem] hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all shadow-2xl">Return to Fleet Command</button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="min-h-screen pb-32 space-y-12 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[length:150px] bg-repeat selection:bg-blue-600 selection:text-white">
                
                {/* Visual Decorative Grid */}
                <div className="fixed inset-0 pointer-events-none opacity-[0.03] overflow-hidden">
                    <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
                </div>

                {/* Ultra-Premium Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-12 pb-12"
                >
                    <div className="flex items-start gap-10">
                        <button onClick={() => router.back()} className="mt-4 p-5 bg-white border border-slate-200 rounded-[2rem] text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-[0_20px_40px_rgba(37,99,235,0.1)] transition-all group active:scale-90">
                            <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <motion.span initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="px-5 py-2 bg-slate-900 text-white rounded-[1rem] text-[10px] font-black uppercase tracking-[0.3em] leading-none shadow-2xl">
                                    {project.projectCode || `ID-${project.id.slice(0, 4)}`}
                                </motion.span>
                                <motion.div initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                                    className={`px-5 py-2 ${STATUS_CONFIG[project.status]?.bg || 'bg-slate-100'} ${STATUS_CONFIG[project.status]?.text || 'text-slate-600'} rounded-[1rem] text-[10px] font-black uppercase tracking-[0.3em] leading-none border border-current/10 flex items-center gap-3 shadow-sm`}
                                >
                                    <div className={`h-2 w-2 rounded-full ${STATUS_CONFIG[project.status]?.dot || 'bg-slate-400'} animate-pulse`} />
                                    {STATUS_CONFIG[project.status]?.label || project.status}
                                </motion.div>
                            </div>
                            <div>
                                <h1 className="text-7xl font-black text-slate-900 tracking-tighter mb-4 leading-none bg-clip-text text-transparent bg-gradient-to-br from-slate-900 via-slate-800 to-slate-500">
                                    {project.name}
                                </h1>
                                <div className="flex flex-wrap items-center gap-6 px-1">
                                    <div className="flex items-center gap-3 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none bg-white/40 border border-slate-100 px-4 py-2.5 rounded-2xl backdrop-blur-sm">
                                        <Layers className="h-4 w-4 text-blue-600" />
                                        <span>{project.category}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none bg-white/40 border border-slate-100 px-4 py-2.5 rounded-2xl backdrop-blur-sm">
                                        <Building2 className="h-4 w-4 text-emerald-600" />
                                        <span>{project.department?.name || 'Global HQ'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none bg-white/40 border border-slate-100 px-4 py-2.5 rounded-2xl backdrop-blur-sm">
                                        <Calendar className="h-4 w-4 text-amber-600" />
                                        <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-5">
                        <div className="hidden xl:flex flex-col items-end mr-8">
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="h-3 w-3 text-blue-500 animate-spin-slow" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Quantum Registry</p>
                            </div>
                            <p className="text-sm font-black text-slate-900 tracking-tight font-mono">{project.id.toUpperCase()}</p>
                        </div>
                        <div className="flex gap-3">
                            <Link href={`/dashboard/it-management/projects/${projectId}/edit`}>
                                <button className="px-10 py-5 rounded-[1.75rem] bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-4 hover:bg-black hover:-translate-y-1 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.15)] active:scale-95">
                                    <Edit className="h-4 w-4 text-blue-400" /> Refine Parameters
                                </button>
                            </Link>
                            <button className="p-5 rounded-[1.75rem] bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-xl transition-all active:scale-95">
                                <Share2 className="h-5 w-5" />
                            </button>
                            <button onClick={handleDelete} disabled={deleting} 
                                className="p-5 rounded-[1.75rem] bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-rose-500/5">
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* High-Impact Analytics Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { label: 'Lifecycle State', val: project.status, icon: Activity, color: STATUS_CONFIG[project.status]?.text || 'text-blue-600', trend: 'STABLE' },
                        { label: 'Criticality Level', val: project.priority, icon: ShieldAlert, color: project.priority === 'CRITICAL' ? 'text-rose-600' : 'text-amber-500', trend: 'WATCH' },
                        { label: 'Efficiency Rate', val: `${project.stats.completionRate}%`, icon: Zap, color: 'text-emerald-600', trend: '+12.4%', progress: project.stats.completionRate },
                        { label: project.isRevenueBased ? 'Revenue Yield' : 'Mission Stream', val: project.isRevenueBased ? `₹${(project.itRevenueEarned / 1000).toFixed(1)}K` : project.type, icon: Binary, color: 'text-blue-500', trend: 'ACTIVE' },
                    ].map((stat, i) => (
                        <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                            className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-[0_16px_48px_rgba(0,0,0,0.04)] relative overflow-hidden group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500"
                        >
                            <div className="absolute top-0 right-0 p-8 transform rotate-12 opacity-[0.03] group-hover:rotate-0 transition-transform duration-700">
                                <stat.icon className="h-24 w-24" />
                            </div>
                            <div className="relative space-y-6">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">{stat.label}</p>
                                    <div className="px-2 py-1 bg-slate-50 rounded-lg text-[8px] font-black tracking-widest text-slate-400 border border-slate-100">{stat.trend}</div>
                                </div>
                                <div>
                                    <span className={`text-4xl font-black tracking-tighter ${stat.color} uppercase italic`}>{stat.val}</span>
                                </div>
                                {stat.progress !== undefined ? (
                                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${stat.progress}%` }} transition={{ duration: 1.5, ease: "circOut" }}
                                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex gap-1.5">
                                        {[1,2,3,4,5].map(j => <div key={j} className={`h-1 flex-1 rounded-full ${j*20 <= (i+1)*25 ? 'bg-slate-900' : 'bg-slate-100'}`} />)}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Tactical Navigation Interface */}
                <div className="flex items-center gap-3 p-2 bg-white/80 backdrop-blur-2xl rounded-[2.5rem] w-fit border border-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] mx-auto lg:mx-0">
                    {[
                        { key: 'overview', label: 'Architecture', icon: Command, color: 'text-blue-600' },
                        { key: 'timeline', label: 'Chronology', icon: GanttChart, color: 'text-amber-600' },
                        { key: 'documents', label: 'Assets', icon: Database, color: 'text-emerald-600' },
                        { key: 'suggestions', label: 'Feedback', icon: MessageSquare, color: 'text-indigo-600', count: project.stats.pendingSuggestions },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                            className={`flex items-center gap-4 px-8 py-4 rounded-[1.75rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all relative group
                            ${activeTab === tab.key ? 'bg-slate-900 text-white shadow-2xl' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}>
                            <tab.icon className={`h-4 w-4 ${activeTab === tab.key ? 'text-white' : tab.color} group-hover:scale-110 transition-transform`} /> 
                            {tab.label}
                            {tab.count ? (
                                <span className={`ml-2 px-2 py-0.5 rounded-lg text-[9px] ${activeTab === tab.key ? 'bg-white text-slate-900' : 'bg-blue-600 text-white'}`}>
                                    {tab.count}
                                </span>
                            ) : null}
                            {activeTab === tab.key && <motion.div layoutId="tab-active" className="absolute -bottom-1 left-8 right-8 h-1 bg-blue-500 rounded-full" />}
                        </button>
                    ))}
                </div>

                {/* Main Mission Control Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Primary Intelligence Core */}
                    <div className="lg:col-span-8 space-y-12">
                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.4 }}>
                                {activeTab === 'overview' ? (
                                    <div className="space-y-12">
                                        {/* Executive Brief Card */}
                                        <div className="bg-white rounded-[4rem] p-16 border border-slate-100 shadow-[0_32px_96px_rgba(0,0,0,0.04)] relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-16 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000">
                                                <Target className="h-64 w-64 text-slate-900" />
                                            </div>
                                            <div className="relative space-y-12">
                                                <div className="space-y-6">
                                                    <h3 className="text-3xl font-black text-slate-900 flex items-center gap-5 tracking-tighter">
                                                        <div className="p-4 bg-blue-50 text-blue-600 rounded-[1.5rem]"><Terminal className="h-7 w-7" /></div> 
                                                        Strategic Definition
                                                    </h3>
                                                    <div className="bg-slate-50/50 p-12 rounded-[3.5rem] border border-slate-100/50 relative">
                                                        <p className="text-xl text-slate-600 font-medium leading-[1.7] italic">
                                                            {project.about || 'Operational briefing pending master encryption...'}
                                                        </p>
                                                        <div className="absolute top-6 right-8 text-4xl text-slate-200">&quot;</div>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-8">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] mb-6 flex items-center gap-4">
                                                            <Network className="h-5 w-5 text-indigo-500" /> Architectural Scope
                                                        </h3>
                                                        <div className="h-px flex-1 mx-8 bg-slate-100" />
                                                    </div>
                                                    <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap px-2">{project.description}</p>

                                                    {project.keywords && project.keywords.length > 0 && (
                                                        <div className="flex flex-wrap gap-3 pt-6">
                                                            {project.keywords.map(kw => (
                                                                <span key={kw} className="px-5 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:border-blue-400 hover:text-blue-600 transition-all cursor-default">
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" /> {kw}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tactical Center: Linked Infrastructure Terminal */}
                                        {project.website && (
                                            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                                                className="bg-slate-900 rounded-[4rem] p-16 shadow-[0_64px_128px_-32px_rgba(0,0,0,0.5)] relative overflow-hidden group border border-slate-800"
                                            >
                                                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] -mr-[300px] -mt-[300px] animate-pulse" />
                                                <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] -ml-48 -mb-48" />
                                                
                                                {/* Scanning Line Animation */}
                                                <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                                                    className="absolute left-0 right-0 h-px bg-white/5 z-0" />

                                                <div className="relative z-10 space-y-12">
                                                    <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                                                        <div className="flex items-center gap-10">
                                                            <div className="relative">
                                                                <div className={`p-8 rounded-[3rem] ${project.website.status === 'UP' ? 'bg-emerald-500 shadow-[0_0_80px_rgba(16,185,129,0.3)]' : 'bg-rose-500 shadow-[0_0_80px_rgba(244,63,94,0.3)]'} transition-transform duration-700 group-hover:scale-110`}>
                                                                    <Globe className="h-14 w-14 text-white" />
                                                                </div>
                                                                <div className="absolute -bottom-4 -right-4 h-14 w-14 bg-slate-900 rounded-[2rem] flex items-center justify-center border-8 border-slate-800 shadow-2xl">
                                                                    <Activity className={`h-6 w-6 ${project.website.status === 'UP' ? 'text-emerald-500' : 'text-rose-500'} animate-pulse`} />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-4 text-center md:text-left">
                                                                <div className="flex items-center gap-4 justify-center md:justify-start">
                                                                    <span className="px-4 py-1.5 bg-blue-600/30 text-blue-400 rounded-full text-[9px] font-black uppercase tracking-[0.3em] border border-blue-400/20">Infrastructure Terminal</span>
                                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2">
                                                                        <Fingerprint className="h-3 w-3" /> Core v4.0.2
                                                                    </span>
                                                                </div>
                                                                <h3 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">{project.website.name}</h3>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col sm:flex-row gap-6 w-full md:w-auto">
                                                            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-2 min-w-[240px]">
                                                                <div className="flex items-center justify-between">
                                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Live Telemetry</p>
                                                                    <Radar className={`h-4 w-4 ${project.website.status === 'UP' ? 'text-emerald-500' : 'text-rose-500'}`} />
                                                                </div>
                                                                <div className="flex items-end gap-3">
                                                                    <p className={`text-4xl font-black italic tracking-tighter ${project.website.status === 'UP' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                        {project.website.status === 'UP' ? '99.9%' : 'OFFLINE'}
                                                                    </p>
                                                                    <p className="text-[10px] font-black text-white/40 mb-2 uppercase">Uptime</p>
                                                                </div>
                                                            </div>
                                                            <button onClick={() => setShowFleetAudit(true)} 
                                                                className="px-10 py-8 bg-blue-600 text-white rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-blue-500 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_32px_64px_rgba(37,99,235,0.3)] flex flex-col items-center justify-center gap-3 group/btn">
                                                                <RefreshCcw className="h-6 w-6 text-white group-hover/btn:rotate-180 transition-transform duration-700" />
                                                                Run Fleet Audit
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-1 px-4 py-8 bg-white/5 rounded-3xl border border-white/5 divide-x divide-white/5">
                                                        {[
                                                            { label: 'Network URL', value: project.website.url, icon: ArrowUpRight, color: 'text-blue-400' },
                                                            { label: 'Latency Pulse', value: '42ms', icon: Activity, color: 'text-emerald-400' },
                                                            { label: 'Secure SSL', value: 'Verified', icon: ShieldCheck, color: 'text-indigo-400' }
                                                        ].map((item, i) => (
                                                            <div key={i} className="px-8 space-y-2 first:pl-0 last:pr-0">
                                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                                                    <item.icon className={`h-3 w-3 ${item.color}`} /> {item.label}
                                                                </p>
                                                                <p className="text-sm font-black text-white truncate font-mono">{item.value}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Milestones Registry */}
                                        <div className="bg-white rounded-[4rem] p-16 border border-slate-100 shadow-[0_32px_96px_rgba(0,0,0,0.04)]">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
                                                <div className="flex items-center gap-6">
                                                    <div className="h-20 w-20 rounded-[2.5rem] bg-indigo-900 flex items-center justify-center shadow-2xl">
                                                        <GanttChart className="h-10 w-10 text-white" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-2">Milestone Log</h3>
                                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Temporal Progression Map</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => { setSelectedMilestone(null); setShowMilestoneModal(true); }} 
                                                    className="px-10 py-5 bg-slate-900 text-white rounded-[1.75rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-4">
                                                    <Plus className="h-5 w-5 text-emerald-400" /> Deploy Milestone
                                                </button>
                                            </div>

                                            {project.milestones.length === 0 ? (
                                                <div className="text-center py-32 border-4 border-dashed border-slate-50 rounded-[4rem] space-y-6">
                                                    <div className="h-24 w-24 rounded-full bg-slate-50 flex items-center justify-center mx-auto">
                                                        <Calendar className="h-10 w-10 text-slate-200" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Chronology Empty</p>
                                                        <p className="text-slate-300 font-bold italic">No strategic data points detected in timeline.</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="relative space-y-12 pl-12">
                                                    <div className="absolute left-[20px] top-4 bottom-4 w-1.5 bg-slate-100 rounded-full" />
                                                    {project.milestones.map((ms, idx) => (
                                                        <motion.div key={ms.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
                                                            className="group relative"
                                                        >
                                                            <div className={`absolute -left-[54px] top-6 z-10 w-14 h-14 rounded-full border-8 border-white shadow-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 ${ms.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-slate-900'}`}>
                                                                {ms.status === 'COMPLETED' ? <CheckCircle2 className="h-5 w-5 text-white" /> : <div className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />}
                                                            </div>
                                                            <div className="bg-slate-50/50 border border-slate-100/50 hover:bg-white hover:shadow-2xl hover:border-blue-200 p-12 rounded-[3.5rem] transition-all duration-700 group-hover:-translate-y-2">
                                                                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-8">
                                                                    <div className="space-y-4">
                                                                        <div className="flex items-center gap-4">
                                                                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] font-mono">STEP_{idx + 1}</span>
                                                                            <div className="h-px w-10 bg-blue-100" />
                                                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${ms.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-900 text-white'}`}>
                                                                                {ms.status}
                                                                            </span>
                                                                        </div>
                                                                        <h4 className="text-3xl font-black text-slate-900 leading-none group-hover:text-blue-600 transition-colors tracking-tighter">{ms.name}</h4>
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="text-right px-6 py-3 border-r border-slate-200">
                                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Due Cycle</p>
                                                                            <p className="text-sm font-black text-slate-900">{new Date(ms.dueDate).toLocaleDateString()}</p>
                                                                        </div>
                                                                        <button onClick={() => { setSelectedMilestone(ms); setShowMilestoneModal(true); }} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-xl transition-all active:scale-95">
                                                                            <Edit className="h-5 w-5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                {ms.description && <p className="text-slate-500 text-lg leading-relaxed mb-10 italic max-w-2xl">&quot;{ms.description}&quot;</p>}
                                                                {ms.paymentAmount && ms.paymentAmount > 0 ? (
                                                                    <div className={`p-8 rounded-[2.5rem] flex items-center justify-between ${ms.isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm' : 'bg-slate-900 text-white shadow-2xl shadow-slate-200'}`}>
                                                                        <div className="flex items-center gap-5">
                                                                            <div className={`p-3 rounded-2xl ${ms.isPaid ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white'}`}>
                                                                                <DollarSign className="h-6 w-6" />
                                                                            </div>
                                                                            <div>
                                                                                <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1 ${ms.isPaid ? 'text-emerald-600' : 'text-slate-400'}`}>Fiscal Allocation</p>
                                                                                <p className="text-2xl font-black tracking-tight">₹{ms.paymentAmount.toLocaleString()}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={`h-2 w-2 rounded-full ${ms.isPaid ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                                                                            <span className="text-[10px] font-black uppercase tracking-widest">{ms.isPaid ? 'VAL_SETTLED' : 'VAL_PENDING'}</span>
                                                                        </div>
                                                                    </div>
                                                                ) : null}
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
                                    <div className="bg-white rounded-[4rem] p-16 border border-slate-100 shadow-[0_32px_96px_rgba(0,0,0,0.04)]">
                                        <ITDocumentManager projectId={projectId} />
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Technical Command Sidebar */}
                    <div className="lg:col-span-4 space-y-12">
                        {/* Operational Integrity Profile */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                            className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-[0_24px_64px_rgba(0,0,0,0.04)] relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50" />
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] mb-12 flex items-center gap-4">
                                <Settings className="h-4 w-4 text-blue-600" /> System Params
                            </h3>
                            <div className="space-y-12">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-3">
                                            <Shield className="h-4 w-4 text-slate-400" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority Index</span>
                                        </div>
                                        <span className={`text-[11px] font-black uppercase tracking-widest ${project.priority === 'CRITICAL' ? 'text-rose-600' : 'text-amber-500'}`}>{project.priority}</span>
                                    </div>
                                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                                        <motion.div initial={{ width: 0 }} animate={{ width: project.priority === 'CRITICAL' ? '100%' : project.priority === 'HIGH' ? '75%' : '50%' }} className="h-full rounded-full bg-slate-900" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    {[
                                        { label: 'Deployment State', val: project.status, icon: Radar, color: 'text-blue-500' },
                                        { label: 'Initiation Date', val: project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A', icon: CheckCircle2, color: 'text-emerald-500' },
                                        { label: 'Target Finality', val: project.endDate ? new Date(project.endDate).toLocaleDateString() : 'ACTIVE', icon: Clock, color: 'text-amber-500' }
                                    ].map((spec, i) => (
                                        <div key={i} className="flex items-center gap-6 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-xl transition-all duration-500">
                                            <div className="p-4 bg-white rounded-2xl text-slate-400 shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-all">
                                                <spec.icon className="h-5 w-5" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">{spec.label}</p>
                                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{spec.val}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        {/* Personnel Deck Terminal */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                            className="bg-slate-900 rounded-[4rem] p-12 shadow-[0_32px_80px_rgba(0,0,0,0.3)] text-white relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] opacity-20 group-hover:bg-blue-600/10 transition-all duration-1000" />
                            <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.4em] mb-12 flex items-center gap-4">
                                <Users className="h-4 w-4 text-blue-400" /> Team Topology
                            </h3>
                            <div className="space-y-10">
                                {[
                                    { role: 'Mission Director', person: project.projectManager, badge: 'LEAD' },
                                    { role: 'Tactical Lead', person: project.teamLead, badge: 'CORE' }
                                ].map((node, i) => (
                                    <div key={i} className="flex items-center gap-6 group/item relative">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-blue-500 rounded-[1.75rem] blur-xl opacity-0 group-hover/item:opacity-20 transition-opacity" />
                                            {node.person?.employeeProfile?.profilePicture ? (
                                                <img src={node.person.employeeProfile.profilePicture} alt="" className="relative w-16 h-16 rounded-[1.75rem] object-cover ring-4 ring-white/5 group-hover/item:ring-blue-500 transition-all duration-500" />
                                            ) : (
                                                <div className="relative w-16 h-16 rounded-[1.75rem] bg-white/5 flex items-center justify-center text-white/60 font-black text-xl border border-white/10 group-hover/item:border-blue-500/50 transition-all">
                                                    {node.person?.name.charAt(0) || '?'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">{node.role}</p>
                                                <span className="text-[8px] font-black bg-blue-600/20 text-blue-400 px-2 rounded-full border border-blue-400/20 uppercase tracking-widest">{node.badge}</span>
                                            </div>
                                            <p className="text-lg font-black tracking-tight">{node.person?.name || 'NODE UNASSIGNED'}</p>
                                        </div>
                                    </div>
                                ))}

                                {project.taggedEmployees && project.taggedEmployees.length > 0 && (
                                    <div className="pt-10 border-t border-white/5">
                                        <div className="flex items-center justify-between mb-6 px-1">
                                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Field Agents</p>
                                            <span className="text-[10px] font-black text-blue-400 font-mono tracking-tighter">{project.taggedEmployees.length} NODES</span>
                                        </div>
                                        <div className="flex -space-x-4 overflow-hidden p-1">
                                            {project.taggedEmployees.slice(0, 5).map((emp, j) => (
                                                <motion.div key={emp.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + j*0.05 }}
                                                    className="inline-block h-12 w-12 rounded-[1rem] ring-4 ring-slate-900 bg-slate-800 flex items-center justify-center text-xs font-black text-white border border-white/10 hover:-translate-y-2 transition-transform cursor-pointer overflow-hidden shadow-xl"
                                                >
                                                    {emp.employeeProfile?.profilePicture ? (
                                                        <img src={emp.employeeProfile.profilePicture} className="h-full w-full object-cover" alt="" />
                                                    ) : (
                                                        emp.name.charAt(0)
                                                    )}
                                                </motion.div>
                                            ))}
                                            {project.taggedEmployees.length > 5 && (
                                                <div className="flex items-center justify-center h-12 w-12 rounded-[1rem] ring-4 ring-slate-900 bg-blue-600 text-[10px] font-black text-white border border-white/10 shadow-xl">
                                                    +{project.taggedEmployees.length - 5}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Fiscal Impact Map */}
                        {project.isRevenueBased && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
                                className="bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-[4rem] p-12 shadow-[0_32px_80px_rgba(16,185,129,0.3)] text-white relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-[60px] opacity-20" />
                                <Lock className="absolute bottom-12 right-12 h-24 w-24 text-white opacity-[0.05] -rotate-12" />
                                
                                <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.4em] mb-12 flex items-center gap-4">
                                    <DollarSign className="h-4 w-4 text-emerald-300" /> Fiscal Yield
                                </h3>
                                <div className="space-y-12">
                                    <div className="text-center bg-white/10 py-10 rounded-[2.5rem] border border-white/10 backdrop-blur-md">
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-4">Gross Strategic Value</p>
                                        <div className="flex items-center justify-center gap-3">
                                            <span className="text-5xl font-black tracking-tighter">₹{project.estimatedRevenue?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-slate-900/40 p-6 rounded-[1.75rem] border border-white/5">
                                            <p className="text-[9px] font-black text-white/30 uppercase mb-2 tracking-widest leading-none">Dept Allocation</p>
                                            <p className="text-2xl font-black tracking-tight">{project.itDepartmentCut}%</p>
                                        </div>
                                        <div className="bg-white/10 p-6 rounded-[1.75rem] border border-white/5 text-center">
                                            <p className="text-[9px] font-black text-white/30 uppercase mb-2 tracking-widest leading-none">Net Impact</p>
                                            <p className="text-2xl font-black text-emerald-200 tracking-tight">₹{((project.estimatedRevenue * (project.itDepartmentCut || 0)) / 100).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            <MilestoneModal 
                isOpen={showMilestoneModal} 
                onClose={() => setShowMilestoneModal(false)} 
                projectId={projectId} 
                milestone={selectedMilestone || undefined} 
                onSuccess={fetchProject} 
            />
            
            <FleetAuditModal 
                isOpen={showFleetAudit}
                onClose={() => setShowFleetAudit(false)}
                projects={[project]}
            />
        </DashboardLayout>
    );
}
