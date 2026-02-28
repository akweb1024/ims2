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

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; shadow: string; border: string }> = {
    COMPLETED: { label: 'Settled', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', shadow: 'shadow-emerald-500/20', border: 'border-emerald-500/20' },
    IN_PROGRESS: { label: 'Active', bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400', shadow: 'shadow-blue-500/20', border: 'border-blue-500/20' },
    ON_HOLD: { label: 'On Hold', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', shadow: 'shadow-amber-500/20', border: 'border-amber-500/20' },
    PLANNING: { label: 'Planning', bg: 'bg-indigo-500/10', text: 'text-indigo-400', dot: 'bg-indigo-400', shadow: 'shadow-indigo-500/20', border: 'border-indigo-500/20' },
    TESTING: { label: 'Testing', bg: 'bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-400', shadow: 'shadow-rose-500/20', border: 'border-rose-500/20' },
};

import { useSession } from 'next-auth/react';

export default function ProjectDetailPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [showMilestoneModal, setShowMilestoneModal] = useState(false);
    const [selectedMilestone, setSelectedMilestone] = useState<any | null>(null);
    const [showFleetAudit, setShowFleetAudit] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'tasks' | 'documents' | 'suggestions'>('overview');

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
                        <div className="h-24 w-24 border-8 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Cpu className="h-8 w-8 text-blue-400 animate-pulse" />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <p className="font-black text-white uppercase tracking-[0.4em] text-sm">Synchronizing Project Matrix</p>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Accessing Secure Data Cluster: IMS-IT-01</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!project) {
        return (
            <DashboardLayout>
                <div className="min-h-[80vh] flex items-center justify-center">
                    <div className="p-16 bg-slate-800/80 backdrop-blur-xl rounded-[4rem] border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.5)] text-center max-w-xl space-y-10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-rose-500" />
                        <div className="h-24 w-24 rounded-[2.5rem] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400 shadow-xl shadow-rose-500/10">
                            <ShieldAlert className="h-12 w-12" />
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-4xl font-black text-white tracking-tighter leading-none">Mission Not Found</h3>
                            <p className="text-slate-400 font-medium text-lg px-8">The specified project parameters have been purged or are currently off-grid.</p>
                        </div>
                        <button onClick={() => router.push('/dashboard/it-management/projects')} className="px-12 py-5 bg-slate-700/50 border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:bg-slate-600/80 hover:scale-105 active:scale-95 transition-all shadow-2xl">Return to Fleet Command</button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const stConf = STATUS_CONFIG[project.status] || { label: project.status, bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-400', shadow: '', border: 'border-slate-500/20' };
    const userRole = (session?.user as any)?.role;
    const isAuthorized = userRole && ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_MANAGER', 'IT_ADMIN'].includes(userRole);
    const isProjectManager = project.projectManager?.id === (session?.user as any)?.id;
    const isTeamLead = project.teamLead?.id === (session?.user as any)?.id;
    const canManageProject = isAuthorized || isProjectManager || isTeamLead;

    return (
        <DashboardLayout>
            <div className="min-h-screen pb-32 space-y-8">
                
                {/* Visual Decorative Grid */}
                <div className="fixed inset-0 pointer-events-none opacity-[0.02] overflow-hidden">
                    <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
                </div>

                {/* ── HEADER ──────────────────────────────────── */}
                 <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-[2.5rem] overflow-hidden border border-white/10"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(ellipse at 10% 50%, rgba(59,130,246,0.5) 0%, transparent 60%)' }} />

                    <div className="relative p-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-12">
                        <div className="flex items-start gap-8">
                            <button onClick={() => router.back()} className="mt-2 p-4 bg-slate-700/50 border border-white/10 rounded-2xl text-slate-400 hover:text-blue-400 hover:border-blue-500/30 transition-all shrink-0">
                                <ArrowLeft className="h-6 w-6" />
                            </button>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <span className="px-4 py-1.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                                        {project.projectCode || `ID-${project.id.slice(0, 4)}`}
                                    </span>
                                    <div className={`px-4 py-1.5 ${stConf.bg} ${stConf.text} rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border ${stConf.border} flex items-center gap-2.5`}>
                                        <div className={`h-2 w-2 rounded-full ${stConf.dot} animate-pulse`} />
                                        {stConf.label}
                                    </div>
                                    {project.visibility === 'PUBLIC' && (
                                        <div className="px-4 py-1.5 bg-blue-500/10 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-blue-500/20 flex items-center gap-2.5">
                                            <Globe className="h-3.5 w-3.5" />
                                            Public Insight
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h1 className="text-5xl lg:text-6xl font-black text-white tracking-tighter mb-4 leading-tight">
                                        {project.name}
                                    </h1>
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-800/80 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                                            <Layers className="h-3.5 w-3.5 text-blue-400" />
                                            <span>{project.category}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-800/80 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                                            <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                                            <span>{project.department?.name || 'Global HQ'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-800/80 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                                            <Calendar className="h-3.5 w-3.5 text-amber-400" />
                                            <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col lg:items-end gap-5">
                            <div className="hidden lg:flex flex-col items-end mr-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <Sparkles className="h-3 w-3 text-blue-400 animate-pulse" />
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Quantum Registry</p>
                                </div>
                                <p className="text-xs font-black text-slate-400 tracking-wider font-mono">{project.id.toUpperCase()}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                {canManageProject && (
                                    <>
                                        <Link href={`/dashboard/it-management/projects/${projectId}/edit`}>
                                            <button className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/25">
                                                <Edit className="h-4 w-4" /> Refine Setup
                                            </button>
                                        </Link>
                                        {userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || isProjectManager ? (
                                            <button onClick={handleDelete} disabled={deleting} 
                                                className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-50">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        ) : null}
                                    </>
                                )}
                                <button className="p-3 bg-slate-700/50 border border-white/10 rounded-xl text-slate-300 hover:text-white hover:bg-slate-600/80 transition-all">
                                    <Share2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ── METRICS GRID ─────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Lifecycle State', val: project.status, icon: Activity, color: stConf.text, trend: 'STABLE' },
                        { label: 'Criticality Level', val: project.priority, icon: ShieldAlert, color: project.priority === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400', trend: 'WATCH' },
                        { label: 'Efficiency Rate', val: `${project.stats.completionRate}%`, icon: Zap, color: 'text-emerald-400', trend: '+12.4%', progress: project.stats.completionRate },
                        { label: project.isRevenueBased ? 'Revenue Yield' : 'Mission Stream', val: project.isRevenueBased ? `₹${(project.itRevenueEarned / 1000).toFixed(1)}K` : project.type, icon: Binary, color: 'text-blue-400', trend: 'ACTIVE' },
                    ].map((stat, i) => (
                        <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                            className="bg-slate-800/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl relative overflow-hidden group hover:bg-slate-800 hover:border-white/20 transition-all duration-300"
                        >
                            <div className="absolute top-0 right-0 p-6 transform rotate-12 opacity-[0.05] group-hover:rotate-0 transition-transform duration-700 pointer-events-none">
                                <stat.icon className={`h-16 w-16 ${stat.color}`} />
                            </div>
                            <div className="relative space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{stat.label}</p>
                                    <div className="px-2 py-0.5 bg-slate-700/50 rounded text-[8px] font-black tracking-widest text-slate-400 border border-white/10">{stat.trend}</div>
                                </div>
                                <div className="py-1">
                                    <span className={`text-2xl font-black tracking-tight ${stat.color} uppercase italic`}>{stat.val}</span>
                                </div>
                                {stat.progress !== undefined ? (
                                    <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden border border-white/10">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${stat.progress}%` }} transition={{ duration: 1.5, ease: "circOut" }}
                                            className="h-full bg-emerald-500"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex gap-1">
                                        {[1,2,3,4,5].map(j => <div key={j} className={`h-1 flex-1 rounded-full ${j*20 <= (i+1)*25 ? 'bg-slate-500' : 'bg-slate-700/50'}`} />)}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* ── TABS ───────────────────────────────────── */}
                <div className="flex items-center gap-2 p-1.5 bg-slate-800/80 backdrop-blur-xl rounded-2xl w-fit border border-white/10 mx-auto lg:mx-0 overflow-x-auto">
                    {[
                        { key: 'overview', label: 'Architecture', icon: Command, color: 'text-blue-400' },
                        { key: 'tasks', label: 'Tasks', icon: ListTodo, color: 'text-violet-400', count: project.stats.inProgressTasks },
                        { key: 'timeline', label: 'Chronology', icon: GanttChart, color: 'text-amber-400' },
                        { key: 'documents', label: 'Assets', icon: Database, color: 'text-emerald-400' },
                        { key: 'suggestions', label: 'Feedback', icon: MessageSquare, color: 'text-indigo-400', count: project.stats.pendingSuggestions },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key as 'overview')}
                            className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all relative group whitespace-nowrap
                            ${activeTab === tab.key ? 'bg-slate-800 text-white shadow-lg border border-white/10' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
                            <tab.icon className={`h-4 w-4 ${activeTab === tab.key ? 'text-white' : tab.color}`} /> 
                            {tab.label}
                            {tab.count ? (
                                <span className={`ml-1 px-1.5 py-0.5 rounded-lg text-[9px] ${activeTab === tab.key ? 'bg-white text-slate-900' : 'bg-blue-500/20 text-blue-400'}`}>
                                    {tab.count}
                                </span>
                            ) : null}
                            {activeTab === tab.key && <motion.div layoutId="tab-underline" className="absolute -bottom-1.5 left-6 right-6 h-0.5 bg-blue-500 rounded-full" />}
                        </button>
                    ))}
                </div>

                {/* ── MAIN CONTENT ───────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Data Column */}
                    <div className="lg:col-span-8 space-y-8">
                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                                {activeTab === 'overview' ? (
                                    <div className="space-y-8">
                                        {/* Briefing Card */}
                                        <div className="bg-slate-800 backdrop-blur-xl rounded-[2rem] p-8 lg:p-10 border border-white/10 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
                                                <Target className="h-64 w-64 text-white" />
                                            </div>
                                            <div className="relative space-y-8">
                                                {/* Strategic Definition */}
                                                <div className="space-y-4">
                                                    <h3 className="text-base font-black text-white flex items-center gap-3">
                                                        <div className="p-2 bg-blue-500/20 text-blue-300 rounded-xl"><Terminal className="h-4 w-4" /></div>
                                                        Strategic Definition
                                                    </h3>
                                                    <div className="bg-slate-800/80 p-6 rounded-2xl border border-white/10 relative">
                                                        <div className="absolute top-3 right-5 text-3xl text-slate-600 font-serif leading-none">&quot;</div>
                                                        <p className="text-sm text-slate-200 font-medium leading-loose pr-6">
                                                            {project.description || project.about || 'Operational briefing pending master encryption...'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Architectural Scope */}
                                                {(project.details || project.about) && (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-3">
                                                            <Network className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Architectural Scope</span>
                                                            <div className="h-px flex-1 bg-white/10" />
                                                        </div>
                                                        <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap pl-1">
                                                            {project.details || project.about}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Keywords */}
                                                {project.keywords && project.keywords.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 pt-2">
                                                        {project.keywords.map(kw => (
                                                            <span key={kw} className="px-3 py-1.5 bg-slate-700/50 border border-white/10 text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:border-blue-500/50 hover:text-blue-300 transition-all">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />{kw}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Linked Web Terminal */}
                                        {project.website && (
                                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                                className="bg-slate-900 rounded-[2.5rem] p-8 lg:p-10 border border-slate-800 relative overflow-hidden group shadow-2xl"
                                            >
                                                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -mr-[200px] -mt-[200px] animate-pulse pointer-events-none" />
                                                
                                                <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                                                    className="absolute left-0 right-0 h-px bg-white/10 z-0 pointer-events-none" />

                                                <div className="relative z-10 space-y-8">
                                                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                                        <div className="flex items-center gap-6">
                                                            <div className="relative">
                                                                <div className={`p-6 rounded-[2rem] ${project.website.status === 'UP' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'} transition-transform duration-700 group-hover:scale-110`}>
                                                                    <Globe className="h-10 w-10" />
                                                                </div>
                                                                <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center border-4 border-slate-800">
                                                                    <Activity className={`h-4 w-4 ${project.website.status === 'UP' ? 'text-emerald-500' : 'text-rose-500'} animate-pulse`} />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2 text-center md:text-left">
                                                                <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                                                                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-500/20">Infra Node</span>
                                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                                        <Fingerprint className="h-3 w-3" /> Core v4.0.2
                                                                    </span>
                                                                </div>
                                                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{project.website.name}</h3>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                                                            <div className="bg-slate-700/50 border border-white/10 rounded-2xl p-5 w-full md:w-48">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Telemetry</span>
                                                                    <Radar className={`h-3 w-3 ${project.website.status === 'UP' ? 'text-emerald-400' : 'text-rose-400'}`} />
                                                                </div>
                                                                <div className="flex items-end gap-2">
                                                                    <p className={`text-3xl font-black italic tracking-tighter leading-none ${project.website.status === 'UP' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                        {project.website.status === 'UP' ? '99.9%' : 'OFF'}
                                                                    </p>
                                                                    <p className="text-[9px] font-black text-slate-600 mb-1 uppercase">Uptime</p>
                                                                </div>
                                                            </div>
                                                            <button onClick={() => setShowFleetAudit(true)} 
                                                                className="px-6 py-4 bg-blue-600/10 text-blue-400 border border-blue-500/30 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-600/20 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 group/btn">
                                                                <RefreshCcw className="h-5 w-5 group-hover/btn:rotate-180 transition-transform duration-700" />
                                                                Fleet Audit
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-1 px-4 py-5 bg-slate-800/60 border border-white/[0.05] rounded-xl divide-x divide-white/10">
                                                        {[
                                                            { label: 'Network URL', value: project.website.url, icon: ArrowUpRight, color: 'text-blue-400' },
                                                            { label: 'Latency Pulse', value: '42ms', icon: Activity, color: 'text-emerald-400' },
                                                            { label: 'Secure SSL', value: 'Verified', icon: ShieldCheck, color: 'text-indigo-400' }
                                                        ].map((item, i) => (
                                                            <div key={i} className="px-6 space-y-1.5 first:pl-0 last:pr-0">
                                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                                    <item.icon className={`h-3 w-3 ${item.color}`} /> {item.label}
                                                                </p>
                                                                <p className="text-xs font-black text-white truncate font-mono">{item.value}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Milestones Registry */}
                                        <div className="bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] p-8 lg:p-12 border border-white/10">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                                                <div className="flex items-center gap-5">
                                                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-inner text-indigo-400">
                                                        <GanttChart className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black text-white tracking-tight mb-1">Milestone Log</h3>
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progression Map</p>
                                                    </div>
                                                </div>
                                                {canManageProject && (
                                                    <button onClick={() => { setSelectedMilestone(null); setShowMilestoneModal(true); }} 
                                                        className="px-6 py-3 bg-slate-700/50 border border-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-600/80 transition-all flex items-center gap-2">
                                                        <Plus className="h-4 w-4 text-emerald-400" /> New Phase
                                                    </button>
                                                )}
                                            </div>

                                            {project.milestones.length === 0 ? (
                                                <div className="text-center py-16 border border-dashed border-white/10 rounded-3xl space-y-4 bg-slate-900/60">
                                                    <Calendar className="h-8 w-8 text-slate-600 mx-auto" />
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No strategic points plotted</p>
                                                </div>
                                            ) : (
                                                <div className="relative space-y-8 pl-10 border-l border-white/10 ml-6">
                                                    {project.milestones.map((ms, idx) => (
                                                        <motion.div key={ms.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
                                                            className="group relative"
                                                        >
                                                            <div className={`absolute -left-[54px] top-6 z-10 w-7 h-7 rounded-sm border-2 border-slate-900 shadow-sm flex items-center justify-center transition-all duration-500 group-hover:scale-110 ${ms.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                                                {ms.status === 'COMPLETED' ? <CheckCircle2 className="h-4 w-4 text-white" /> : <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />}
                                                            </div>
                                                            <div className="bg-slate-800/80 border border-white/10 hover:bg-slate-800 hover:border-white/10 p-8 rounded-3xl transition-all duration-300">
                                                                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 mb-4">
                                                                    <div className="space-y-3">
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest font-mono">PHASE_{idx + 1}</span>
                                                                            <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${ms.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/10 text-slate-300 border border-white/20'}`}>
                                                                                {ms.status}
                                                                            </span>
                                                                        </div>
                                                                        <h4 className="text-xl font-black text-white leading-none">{ms.name}</h4>
                                                                    </div>
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="text-right px-4">
                                                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Due Cycle</p>
                                                                                <p className="text-xs font-black text-slate-300">{new Date(ms.dueDate).toLocaleDateString()}</p>
                                                                            </div>
                                                                            {canManageProject && (
                                                                                <button onClick={() => { setSelectedMilestone(ms); setShowMilestoneModal(true); }} 
                                                                                    className="p-3 bg-slate-700/50 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:bg-slate-600/80 transition-all">
                                                                                    <Edit className="h-4 w-4" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                </div>
                                                                {ms.description && <p className="text-slate-400 text-sm leading-relaxed mb-6 italic">&quot;{ms.description}&quot;</p>}
                                                                {ms.paymentAmount && ms.paymentAmount > 0 ? (
                                                                    <div className={`p-4 rounded-2xl flex items-center justify-between border ${ms.isPaid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-700/50 text-white border-white/10'}`}>
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={`p-2 rounded-xl bg-slate-700/50 ${ms.isPaid ? 'text-emerald-400' : 'text-slate-400'}`}>
                                                                                <DollarSign className="h-4 w-4" />
                                                                            </div>
                                                                            <div>
                                                                                <p className={`text-[9px] font-black uppercase tracking-widest leading-none ${ms.isPaid ? 'text-emerald-500' : 'text-slate-500'}`}>Fiscal Call</p>
                                                                                <p className="text-sm font-black tracking-tight">₹{ms.paymentAmount.toLocaleString()}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`h-1.5 w-1.5 rounded-full ${ms.isPaid ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                                                                            <span className="text-[8px] font-black uppercase tracking-widest">{ms.isPaid ? 'VAL_SETTLED' : 'VAL_PENDING'}</span>
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
                                ) : activeTab === 'tasks' ? (
                                    <div className="bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-black text-white flex items-center gap-3">
                                                <div className="p-2.5 bg-violet-500/10 text-violet-400 rounded-xl"><ListTodo className="h-5 w-5" /></div>
                                                Task Manifest
                                            </h3>
                                            <div className="flex items-center gap-3">
                                                {[
                                                    { label: 'Total', val: project.stats.totalTasks, color: 'text-white' },
                                                    { label: 'Active', val: project.stats.inProgressTasks, color: 'text-blue-400' },
                                                    { label: 'Done', val: project.stats.completedTasks, color: 'text-emerald-400' },
                                                ].map(s => (
                                                    <div key={s.label} className="text-center px-3 py-2 bg-slate-700/50 rounded-xl border border-white/10">
                                                        <p className={`text-base font-black ${s.color}`}>{s.val}</p>
                                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {project.tasks.length === 0 ? (
                                            <div className="py-16 border border-dashed border-white/10 rounded-3xl text-center space-y-3">
                                                <ListTodo className="h-8 w-8 text-slate-600 mx-auto" />
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No tasks deployed yet</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {project.tasks.map((task: any, idx: number) => {
                                                    const TASK_STATUS: Record<string, { bg: string; text: string; dot: string }> = {
                                                        COMPLETED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
                                                        IN_PROGRESS: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
                                                        PENDING: { bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-500' },
                                                        ON_HOLD: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
                                                        CANCELLED: { bg: 'bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-400' },
                                                    };
                                                    const TASK_PRI: Record<string, string> = {
                                                        CRITICAL: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                                                        HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
                                                        MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                                                        LOW: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                                                    };
                                                    const tsCfg = TASK_STATUS[task.status] || TASK_STATUS.PENDING;
                                                    const priCfg = TASK_PRI[task.priority] || TASK_PRI.LOW;
                                                    const progress = task.progressPercent || 0;
                                                    return (
                                                        <motion.div key={task.id}
                                                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                                                            className="flex flex-col md:flex-row md:items-center gap-4 p-5 bg-slate-800/80 hover:bg-slate-800 border border-white/10 hover:border-white/20 rounded-2xl transition-all group"
                                                        >
                                                            {/* Status dot + code */}
                                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                <div className={`w-2 h-2 rounded-full shrink-0 ${tsCfg.dot} animate-pulse`} />
                                                                <div className="min-w-0">
                                                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest font-mono">{task.taskCode}</p>
                                                                    <p className="text-sm font-black text-white group-hover:text-blue-300 transition-colors truncate">{task.title}</p>
                                                                </div>
                                                            </div>
                                                            {/* Progress bar */}
                                                            <div className="w-24 shrink-0">
                                                                <div className="flex justify-between text-[8px] font-black text-slate-600 mb-1">
                                                                    <span>Progress</span><span className="text-slate-400">{progress}%</span>
                                                                </div>
                                                                <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden">
                                                                    <div style={{ width: `${progress}%` }} className="h-full bg-blue-500 rounded-full" />
                                                                </div>
                                                            </div>
                                                            {/* Badges */}
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${priCfg}`}>{task.priority}</span>
                                                                <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${tsCfg.bg} ${tsCfg.text}`}>{task.status.replace('_', ' ')}</span>
                                                            </div>
                                                            {/* Assignee */}
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {task.assignedTo ? (
                                                                    <>
                                                                        <div className="w-6 h-6 rounded-lg bg-blue-600/50 flex items-center justify-center text-[9px] font-black text-white">
                                                                            {task.assignedTo.name.charAt(0)}
                                                                        </div>
                                                                        <span className="text-[9px] font-black text-slate-500 uppercase hidden md:block">{task.assignedTo.name.split(' ')[0]}</span>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-[9px] font-black text-slate-700 uppercase">Unassigned</span>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : activeTab === 'timeline' ? (
                                    <ProjectTimeline startDate={project.startDate} endDate={project.endDate} milestones={project.milestones} tasks={project.tasks} />
                                ) : activeTab === 'suggestions' ? (
                                    <ProjectSuggestions projectId={projectId} suggestions={project.suggestions} onUpdate={fetchProject} canManage={canManageProject} />
                                ) : (
                                    <div className="bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10">
                                        <ITDocumentManager projectId={projectId} canManage={canManageProject} />
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Right Specs Column */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* Parameters */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                            className="bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10 relative overflow-hidden"
                        >
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-3">
                                <Settings className="h-4 w-4 text-blue-400" /> System Params
                            </h3>
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Shield className="h-3 w-3" /> Priority Index</span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${project.priority === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'}`}>{project.priority}</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden border border-white/10">
                                        <motion.div initial={{ width: 0 }} animate={{ width: project.priority === 'CRITICAL' ? '100%' : project.priority === 'HIGH' ? '75%' : '50%' }} className={`h-full rounded-full ${project.priority === 'CRITICAL' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {[
                                        { label: 'Lifecycle', val: project.status, icon: Radar, color: 'text-blue-400' },
                                        { label: 'Initiation', val: project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A', icon: CheckCircle2, color: 'text-emerald-400' },
                                        { label: 'Finality', val: project.endDate ? new Date(project.endDate).toLocaleDateString() : 'ACTIVE', icon: Clock, color: 'text-amber-400' }
                                    ].map((spec, i) => (
                                        <div key={i} className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-2xl border border-white/10 group hover:bg-slate-600/80 transition-colors">
                                            <div className="p-2.5 bg-slate-700/50 rounded-xl text-slate-400 group-hover:text-white transition-colors">
                                                <spec.icon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{spec.label}</p>
                                                <p className="text-xs font-black text-white uppercase">{spec.val}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        {/* Team */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                            className="bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10 relative overflow-hidden"
                        >
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-3">
                                <Users className="h-4 w-4 text-blue-400" /> Team Topology
                            </h3>
                            <div className="space-y-6">
                                {[
                                    { role: 'Mission Director', person: project.projectManager, badge: 'LEAD' },
                                    { role: 'Tactical Lead', person: project.teamLead, badge: 'CORE' }
                                ].map((node, i) => (
                                    <div key={i} className="flex items-center gap-4 group/item relative">
                                        {node.person?.employeeProfile?.profilePicture ? (
                                            <img src={node.person.employeeProfile.profilePicture} alt="" className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/10" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white/50 font-black border border-white/10">
                                                {node.person?.name.charAt(0) || '?'}
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{node.role}</p>
                                                <span className="text-[7px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 uppercase">{node.badge}</span>
                                            </div>
                                            <p className="text-sm font-black text-white">{node.person?.name || 'UNASSIGNED'}</p>
                                        </div>
                                    </div>
                                ))}

                                {project.taggedEmployees && project.taggedEmployees.length > 0 && (
                                    <div className="pt-6 border-t border-white/10">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Field Agents</p>
                                        <div className="flex -space-x-2 overflow-hidden px-1">
                                            {project.taggedEmployees.slice(0, 5).map((emp, j) => (
                                                <div key={emp.id} className="inline-block h-8 w-8 rounded-lg outline outline-2 outline-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-black text-white" title={emp.name}>
                                                    {emp.employeeProfile?.profilePicture ? (
                                                        <img src={emp.employeeProfile.profilePicture} className="h-full w-full object-cover rounded-lg" alt="" />
                                                    ) : emp.name.charAt(0)}
                                                </div>
                                            ))}
                                            {project.taggedEmployees.length > 5 && (
                                                <div className="flex items-center justify-center h-8 w-8 rounded-lg outline outline-2 outline-slate-900 bg-blue-600/50 text-[9px] font-black text-white">
                                                    +{project.taggedEmployees.length - 5}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Fiscal Impact */}
                        {project.isRevenueBased && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
                                className="bg-gradient-to-br from-emerald-900 to-teal-950 rounded-[2.5rem] p-8 border border-emerald-500/20 text-white relative overflow-hidden shadow-2xl"
                            >
                                <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-6 flex items-center gap-3">
                                    <DollarSign className="h-4 w-4" /> Fiscal Yield
                                </h3>
                                <div className="space-y-6">
                                    <div className="text-center bg-black/20 py-6 rounded-2xl border border-white/10">
                                        <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-2">Estimated Value</p>
                                        <span className="text-3xl font-black tracking-tighter">₹{project.estimatedRevenue?.toLocaleString()}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-700/50 p-4 rounded-xl text-center border border-white/10">
                                            <p className="text-[8px] font-black text-white/40 uppercase mb-1 tracking-widest">IT Cut</p>
                                            <p className="text-sm font-black text-white">{project.itDepartmentCut}%</p>
                                        </div>
                                        <div className="bg-slate-700/50 p-4 rounded-xl text-center border border-emerald-500/30">
                                            <p className="text-[8px] font-black text-emerald-300/50 uppercase mb-1 tracking-widest">Net Revenue</p>
                                            <p className="text-sm font-black text-emerald-400">₹{((project.estimatedRevenue * (project.itDepartmentCut || 0)) / 100).toLocaleString()}</p>
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
