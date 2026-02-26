/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    FolderKanban, Edit, Trash2, Calendar, DollarSign, Users, CheckCircle2,
    Clock, TrendingUp, AlertCircle, ArrowLeft, Plus, ListTodo, BookOpen,
} from 'lucide-react';
import MilestoneModal from '@/components/dashboard/it/MilestoneModal';
import ITDocumentManager from '@/components/dashboard/it/ITDocumentManager';
import ProjectTimeline from '@/components/dashboard/it/ProjectTimeline';
import ProjectComments from '@/components/dashboard/it/ProjectComments';
import ProjectSuggestions from '@/components/dashboard/it/ProjectSuggestions';
import { LayoutDashboard, FileText as FileIcon, GanttChart, Globe, Building2, Tag, MessageSquare, AlertTriangle } from 'lucide-react';

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

const getStatusColor = (status: string) => {
    switch (status) {
        case 'COMPLETED': return 'bg-success-100 text-success-700';
        case 'IN_PROGRESS': return 'bg-primary-100 text-primary-700';
        case 'ON_HOLD': return 'bg-warning-100 text-warning-700';
        case 'PLANNING': return 'bg-purple-100 text-purple-700';
        case 'TESTING': return 'bg-orange-100 text-orange-700';
        default: return 'bg-secondary-100 text-secondary-600';
    }
};

const getPriorityColor = (priority: string) => {
    switch (priority) {
        case 'CRITICAL': return 'text-danger-600';
        case 'HIGH': return 'text-orange-600';
        case 'MEDIUM': return 'text-warning-600';
        case 'LOW': return 'text-success-600';
        default: return 'text-secondary-600';
    }
};

export default function ProjectDetailPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    interface Milestone {
        id: string; name: string; description: string | null; dueDate: string;
        status: string; completedAt: string | null; paymentAmount: number | null; isPaid: boolean;
    }

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [showMilestoneModal, setShowMilestoneModal] = useState(false);
    const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
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
        if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
        setDeleting(true);
        try {
            const response = await fetch(`/api/it/projects/${projectId}`, { method: 'DELETE' });
            if (response.ok) { alert('Project deleted successfully'); router.push('/dashboard/it-management/projects'); }
            else { const error = await response.json(); alert(error.error || 'Failed to delete project'); }
        } catch { alert('Failed to delete project'); }
        finally { setDeleting(false); }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <p className="text-secondary-500 text-sm">Loading project...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!project) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-danger-400 mx-auto mb-4" />
                        <p className="text-secondary-600">Project not found</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

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
                                <span className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center">
                                    <FolderKanban className="h-4 w-4 text-primary-600" />
                                </span>
                                <h1 className="text-2xl font-bold text-secondary-900">{project.name}</h1>
                            </div>
                            <p className="text-secondary-400 text-sm ml-11">{project.projectCode}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push(`/dashboard/it-management/projects/${projectId}/edit`)} className="btn btn-primary text-sm">
                            <Edit className="h-4 w-4" /> Edit
                        </button>
                        <button onClick={handleDelete} disabled={deleting} className="btn border border-danger-200 text-danger-600 hover:bg-danger-50 text-sm disabled:opacity-50">
                            <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>

                {/* Pending Items Indicator */}
                {(project.stats.pendingTasks > 0 || project.stats.pendingSuggestions > 0) && (
                    <div className="mb-6 flex flex-wrap gap-4">
                        {project.stats.pendingTasks > 0 && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 animate-pulse">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-sm font-bold">{project.stats.pendingTasks} Pending Tasks</span>
                            </div>
                        )}
                        {project.stats.pendingSuggestions > 0 && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 animate-pulse">
                                <MessageSquare className="h-4 w-4" />
                                <span className="text-sm font-bold">{project.stats.pendingSuggestions} New Suggestions</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="card-premium">
                        <p className="text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-2">Status</p>
                        <span className={`inline-flex px-3 py-1.5 rounded-xl text-sm font-bold ${getStatusColor(project.status)}`}>
                            {project.status.replace('_', ' ')}
                        </span>
                    </div>
                    <div className="card-premium">
                        <p className="text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-2">Priority</p>
                        <p className={`text-2xl font-bold ${getPriorityColor(project.priority)}`}>{project.priority}</p>
                    </div>
                    <div className="card-premium">
                        <p className="text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-2">Completion</p>
                        <p className="text-2xl font-bold text-primary-600">{project.stats.completionRate}%</p>
                        <p className="text-xs text-secondary-400 mt-1">{project.stats.completedTasks} / {project.stats.totalTasks} tasks</p>
                    </div>
                    {project.isRevenueBased ? (
                        <div className="card-premium bg-success-50 border-success-200">
                            <p className="text-xs font-semibold text-success-600 uppercase tracking-wider mb-2">IT Revenue</p>
                            <p className="text-2xl font-bold text-success-700">₹{project.itRevenueEarned.toLocaleString()}</p>
                            <p className="text-xs text-success-600 mt-1">of ₹{((project.estimatedRevenue * project.itDepartmentCut) / 100).toLocaleString()} est.</p>
                        </div>
                    ) : (
                        <div className="card-premium">
                            <p className="text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-2">Type</p>
                            <p className="text-lg font-bold text-secondary-900">{project.type}</p>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-secondary-200">
                    {[
                        { key: 'overview', label: 'Project Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
                        { key: 'timeline', label: 'Timeline', icon: <GanttChart className="h-4 w-4" /> },
                        { key: 'documents', label: 'Documents & Assets', icon: <FileIcon className="h-4 w-4" /> },
                        { key: 'suggestions', label: 'Suggestions', icon: <MessageSquare className="h-4 w-4" />, count: project.stats.pendingSuggestions },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === tab.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-secondary-400 hover:text-secondary-700'}`}>
                            {tab.icon} 
                            {tab.label}
                            {tab.count ? <span className="ml-1 px-1.5 py-0.5 bg-primary-100 text-primary-600 rounded-full text-[10px]">{tab.count}</span> : null}
                        </button>
                    ))}
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {activeTab === 'overview' ? (
                            <>
                                {/* Description Card */}
                                <div className="card-premium">
                                    <h2 className="text-base font-bold text-secondary-900 mb-4">About &amp; Scope</h2>
                                    {project.about && (
                                        <div className="mb-4">
                                            <h3 className="text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-1">About</h3>
                                            <p className="text-secondary-900 font-medium">{project.about}</p>
                                        </div>
                                    )}
                                    <div className="mb-4">
                                        <h3 className="text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-1">Description</h3>
                                        <p className="text-secondary-700 whitespace-pre-wrap text-sm">{project.description || 'No description provided'}</p>
                                    </div>
                                    {project.details && (
                                        <div className="mb-4">
                                            <h3 className="text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-1">Detailed Scope</h3>
                                            <p className="text-secondary-700 text-sm whitespace-pre-wrap">{project.details}</p>
                                        </div>
                                    )}
                                    {project.keywords && project.keywords.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-secondary-100">
                                            <h3 className="text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Keywords</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {project.keywords.map(kw => (
                                                    <span key={kw} className="px-2.5 py-1 bg-secondary-100 text-secondary-600 rounded-lg text-xs font-medium">{kw}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <ProjectComments projectId={projectId} />
                                </div>

                                {/* Milestones */}
                                <div className="card-premium">
                                    <div className="flex items-center justify-between mb-5">
                                        <h2 className="text-base font-bold text-secondary-900 flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-primary-500" /> Project Milestones
                                        </h2>
                                        <button onClick={() => { setSelectedMilestone(null); setShowMilestoneModal(true); }} className="btn btn-primary text-xs">
                                            <Plus className="h-3.5 w-3.5" /> Add Milestone
                                        </button>
                                    </div>
                                    {project.milestones.length === 0 ? (
                                        <div className="text-center py-10 border-2 border-dashed border-secondary-200 rounded-2xl">
                                            <Calendar className="h-8 w-8 text-secondary-300 mx-auto mb-3" />
                                            <p className="text-secondary-400 text-sm">No milestones defined yet.<br />Break your project into key deliverables.</p>
                                        </div>
                                    ) : (
                                        <div className="relative space-y-5 pl-4 border-l-2 border-secondary-100 ml-2">
                                            {project.milestones.map((milestone) => (
                                                <div key={milestone.id} className="relative group">
                                                    <div className={`absolute -left-[25px] top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm ${milestone.status === 'COMPLETED' ? 'bg-success-500' : 'bg-secondary-300'}`} />
                                                    <div className="bg-secondary-50 rounded-2xl p-5 group-hover:bg-white group-hover:shadow-md transition-all border border-transparent group-hover:border-secondary-200">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div>
                                                                <h3 className="font-bold text-secondary-900 group-hover:text-primary-600 transition-colors">{milestone.name}</h3>
                                                                {milestone.description && <p className="text-sm text-secondary-500 mt-1 line-clamp-2">{milestone.description}</p>}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${getStatusColor(milestone.status)}`}>{milestone.status}</span>
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => { setSelectedMilestone(milestone); setShowMilestoneModal(true); }} className="p-1.5 hover:bg-secondary-100 rounded-lg text-secondary-400 hover:text-primary-600 transition-colors"><Edit className="h-4 w-4" /></button>
                                                                    <button onClick={async () => { if (confirm('Delete this milestone?')) { await fetch(`/api/it/milestones/${milestone.id}`, { method: 'DELETE' }); fetchProject(); } }} className="p-1.5 hover:bg-secondary-100 rounded-lg text-secondary-400 hover:text-danger-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium border-t border-secondary-100 pt-3">
                                                            <div className="flex items-center gap-1.5 text-secondary-400"><Calendar className="h-3.5 w-3.5" />Deadline: {new Date(milestone.dueDate).toLocaleDateString()}</div>
                                                            {milestone.paymentAmount && milestone.paymentAmount > 0 && (
                                                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${milestone.isPaid ? 'bg-success-100 text-success-700' : 'bg-orange-100 text-orange-700'}`}>
                                                                    <DollarSign className="h-3.5 w-3.5" />₹{milestone.paymentAmount.toLocaleString()} {milestone.isPaid ? '- PAID' : '- DUE'}
                                                                </div>
                                                            )}
                                                            {milestone.completedAt && <div className="flex items-center gap-1.5 text-success-600"><CheckCircle2 className="h-3.5 w-3.5" />Released: {new Date(milestone.completedAt).toLocaleDateString()}</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Tasks */}
                                <div className="card-premium">
                                    <div className="flex items-center justify-between mb-5">
                                        <h2 className="text-base font-bold text-secondary-900 flex items-center gap-2">
                                            <ListTodo className="h-4 w-4" /> Tasks ({project.tasks.length})
                                        </h2>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => router.push('/dashboard/it-management/tasks/guidelines')} className="px-3 py-1.5 rounded-xl border border-secondary-200 text-secondary-500 text-xs font-semibold flex items-center gap-1.5 hover:bg-secondary-50 transition-colors">
                                                <BookOpen className="h-3.5 w-3.5" /> Guidelines
                                            </button>
                                            <button onClick={() => router.push(`/dashboard/it-management/tasks/new?projectId=${projectId}`)} className="btn btn-primary text-xs">
                                                <Plus className="h-3.5 w-3.5" /> Add Task
                                            </button>
                                        </div>
                                    </div>
                                    {project.tasks.length === 0 ? (
                                        <p className="text-secondary-400 text-center py-8 text-sm">No tasks yet. Click &quot;Add Task&quot; to create one.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {project.tasks.map((task) => (
                                                <div key={task.id} onClick={() => router.push(`/dashboard/it-management/tasks/${task.id}`)}
                                                    className="border border-secondary-200 rounded-xl p-4 hover:bg-secondary-50 hover:border-primary-200 cursor-pointer transition-all">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-semibold text-secondary-400">{task.taskCode}</span>
                                                                <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold ${getStatusColor(task.status)}`}>{task.status.replace('_', ' ')}</span>
                                                            </div>
                                                            <h3 className="font-semibold text-secondary-900 text-sm">{task.title}</h3>
                                                        </div>
                                                        <span className={`text-xs font-bold ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        {task.assignedTo && (
                                                            <div className="flex items-center gap-1.5 text-xs text-secondary-400">
                                                                <Users className="h-3.5 w-3.5" />{task.assignedTo.name}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 ml-auto">
                                                            <div className="w-28 bg-secondary-100 rounded-full h-1.5">
                                                                <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${task.progressPercent}%` }}></div>
                                                            </div>
                                                            <span className="text-xs font-semibold text-secondary-500">{task.progressPercent}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : activeTab === 'timeline' ? (
                            <ProjectTimeline startDate={project.startDate} endDate={project.endDate} milestones={project.milestones} tasks={project.tasks} />
                        ) : activeTab === 'suggestions' ? (
                            <ProjectSuggestions 
                                projectId={projectId} 
                                suggestions={project.suggestions} 
                                onUpdate={fetchProject}
                                canManage={true} 
                            />
                        ) : (
                            <div className="card-premium">
                                <ITDocumentManager projectId={projectId} />
                            </div>
                        )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-5">
                        {/* Project Details */}
                        <div className="card-premium">
                            <h2 className="text-sm font-bold text-secondary-900 uppercase tracking-wider mb-4">Project Details</h2>
                            <div className="space-y-4">
                                {[
                                    { label: 'Category', value: project.category },
                                    { label: 'Type', value: project.type },
                                ].map(({ label, value }) => (
                                    <div key={label}>
                                        <p className="text-xs text-secondary-400 font-semibold uppercase tracking-wider">{label}</p>
                                        <p className="font-semibold text-secondary-900 mt-0.5">{value}</p>
                                    </div>
                                ))}
                                {project.startDate && (
                                    <div>
                                        <p className="text-xs text-secondary-400 font-semibold uppercase tracking-wider flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Start Date</p>
                                        <p className="font-semibold text-secondary-900 mt-0.5">{new Date(project.startDate).toLocaleDateString()}</p>
                                    </div>
                                )}
                                {project.endDate && (
                                    <div>
                                        <p className="text-xs text-secondary-400 font-semibold uppercase tracking-wider flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />End Date</p>
                                        <p className="font-semibold text-secondary-900 mt-0.5">{new Date(project.endDate).toLocaleDateString()}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-secondary-400 font-semibold uppercase tracking-wider flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Created</p>
                                    <p className="font-semibold text-secondary-900 mt-0.5">{new Date(project.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Team */}
                        <div className="card-premium">
                            <h2 className="text-sm font-bold text-secondary-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                <Users className="h-4 w-4" /> Team
                            </h2>
                            <div className="space-y-4">
                                {project.projectManager && (
                                    <div>
                                        <p className="text-xs text-secondary-400 font-semibold uppercase tracking-wider">Project Manager</p>
                                        <p className="font-bold text-secondary-900 mt-0.5">{project.projectManager.name}</p>
                                        <p className="text-xs text-secondary-400">{project.projectManager.email}</p>
                                    </div>
                                )}
                                {project.teamLead && (
                                    <div>
                                        <p className="text-xs text-secondary-400 font-semibold uppercase tracking-wider">Team Lead</p>
                                        <p className="font-bold text-secondary-900 mt-0.5">{project.teamLead.name}</p>
                                        <p className="text-xs text-secondary-400">{project.teamLead.email}</p>
                                    </div>
                                )}
                                {!project.projectManager && !project.teamLead && <p className="text-secondary-400 text-sm">No team members assigned</p>}
                                {project.taggedEmployees && project.taggedEmployees.length > 0 && (
                                    <div className="pt-3 mt-3 border-t border-secondary-100">
                                        <p className="text-xs text-secondary-400 font-semibold uppercase tracking-wider mb-3">Followers &amp; Participants</p>
                                        <div className="flex flex-wrap gap-2">
                                            {project.taggedEmployees.map(emp => (
                                                <div key={emp.id} className="flex items-center gap-1.5 bg-secondary-50 border border-secondary-200 px-2 py-1 rounded-full text-xs">
                                                    {emp.employeeProfile?.profilePicture ? (
                                                        <img src={emp.employeeProfile.profilePicture} className="w-5 h-5 rounded-full" alt="" />
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-[10px]">{emp.name.charAt(0)}</div>
                                                    )}
                                                    <span className="font-medium text-secondary-700">{emp.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Synced Modules */}
                        {(project.department || project.website) && (
                            <div className="card-premium">
                                <h2 className="text-sm font-bold text-secondary-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                    <Globe className="h-4 w-4" /> Synced Modules
                                </h2>
                                <div className="space-y-4">
                                    {project.department && (
                                        <div>
                                            <p className="text-xs text-secondary-400 font-semibold uppercase tracking-wider flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Department Focus</p>
                                            <p className="font-semibold text-secondary-900 mt-0.5">{project.department.name}</p>
                                        </div>
                                    )}
                                    {project.website && (
                                        <div>
                                            <p className="text-xs text-secondary-400 font-semibold uppercase tracking-wider flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />Website Config</p>
                                            <a href={project.website.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-600 hover:underline mt-0.5 block">{project.website.name}</a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Revenue */}
                        {project.isRevenueBased && (
                            <div className="card-premium bg-success-50 border-success-200">
                                <h2 className="text-sm font-bold text-success-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                    <DollarSign className="h-4 w-4 text-success-600" /> Revenue Breakdown
                                </h2>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-success-700">Estimated</span>
                                        <span className="font-semibold text-success-900">₹{project.estimatedRevenue.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-success-700">IT Cut ({project.itDepartmentCut}%)</span>
                                        <span className="font-semibold text-success-900">₹{((project.estimatedRevenue * project.itDepartmentCut) / 100).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-success-200">
                                        <span className="text-sm font-bold text-success-900">IT Revenue Earned</span>
                                        <span className="font-bold text-success-700 text-lg">₹{project.itRevenueEarned.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <MilestoneModal isOpen={showMilestoneModal} onClose={() => setShowMilestoneModal(false)} projectId={projectId} milestone={selectedMilestone || undefined} onSuccess={fetchProject} />
            </div>
        </DashboardLayout>
    );
}
