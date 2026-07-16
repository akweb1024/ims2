'use client';

import { useProject, useProjectMutations } from '@/hooks/useProjects'; // Need to ensure hooks export specific mutations
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useState, use } from 'react';
import { Calendar, Users, Briefcase, CheckCircle, AlertCircle, Clock, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';

const STATUSES = ['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

/** yyyy-mm-dd for <input type="date">, which rejects a full ISO string. */
const toDateInput = (d: string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export default function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: project, isLoading } = useProject(id);
    const router = useRouter();
    const { updateProject, deleteProject } = useProjectMutations();
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState<any>(null);

    if (isLoading) return <div className="p-10 text-center animate-pulse">Loading Project Details...</div>;
    if (!project) return <div className="p-10 text-center text-red-500">Project not found</div>;

    const openEdit = () => {
        setDraft({
            title: project.title,
            description: project.description || '',
            status: project.status,
            priority: project.priority,
            startDate: toDateInput(project.startDate),
            endDate: toDateInput(project.endDate),
        });
        setIsEditing(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateProject.mutateAsync({ id: project.id, ...draft, endDate: draft.endDate || null });
            setIsEditing(false);
            toast.success('Project updated');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to update project');
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this project?')) return;
        try {
            await deleteProject.mutateAsync(project.id);
            toast.success('Project deleted');
            router.push('/dashboard/projects');
        } catch (error) {
            toast.error('Failed to delete project');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Link href="/dashboard/projects" className="text-secondary-400 hover:text-primary-600 transition-colors">Projects</Link>
                        <span className="text-secondary-300">/</span>
                        <span className="text-secondary-600 font-bold">{project.id.substring(0, 8)}...</span>
                    </div>
                    <h1 className="text-4xl font-black text-secondary-900 tracking-tight">{project.title}</h1>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleDelete} className="btn bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                        <Trash2 size={18} /> Delete Project
                    </button>
                    <button onClick={openEdit} className="btn btn-primary px-6 py-2 rounded-lg font-bold flex items-center gap-2">
                        <Edit size={18} /> Edit Details
                    </button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="card-premium p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Briefcase size={24} />
                        </div>
                        <span className="text-xs font-black text-secondary-400 uppercase">Status</span>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-secondary-900 capitalize">{project.status.replace('_', ' ')}</p>
                        <p className="text-xs text-secondary-500 mt-1">Current Progress</p>
                    </div>
                </div>

                <div className="card-premium p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <Users size={24} />
                        </div>
                        <span className="text-xs font-black text-secondary-400 uppercase">Team</span>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-secondary-900">{project.members?.length || 0}</p>
                        <p className="text-xs text-secondary-500 mt-1">Active Members</p>
                    </div>
                </div>

                <div className="card-premium p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                            <CheckCircle size={24} />
                        </div>
                        <span className="text-xs font-black text-secondary-400 uppercase">Tasks</span>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-secondary-900">{project._count?.tasks || 0}</p>
                        <p className="text-xs text-secondary-500 mt-1">Linked Tasks</p>
                    </div>
                </div>

                <div className="card-premium p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <AlertCircle size={24} />
                        </div>
                        <span className="text-xs font-black text-secondary-400 uppercase">Issues</span>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-secondary-900">{project._count?.issues || 0}</p>
                        <p className="text-xs text-secondary-500 mt-1">Reported Issues</p>
                    </div>
                </div>

                <div className="card-premium p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Clock size={24} />
                        </div>
                        <span className="text-xs font-black text-secondary-400 uppercase">Days Left</span>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-secondary-900">
                            {project.endDate ? Math.ceil((new Date(project.endDate).getTime() - Date.now()) / (1000 * 3600 * 24)) : 'N/A'}
                        </p>
                        <p className="text-xs text-secondary-500 mt-1">Until Deadline</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Tasks & Activity */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="card-premium p-8">
                        <h3 className="text-xl font-black text-secondary-900 mb-4">Description</h3>
                        <p className="text-secondary-600 leading-relaxed">
                            {project.description || 'No description provided.'}
                        </p>
                    </div>

                    {/* The API already sends these (take: 20, newest first, with the assignee
                        joined); the page simply never rendered them. */}
                    <div className="card-premium p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-secondary-900">Tasks</h3>
                            <span className="text-xs font-bold text-secondary-400 uppercase">
                                {project._count?.tasks ? `${project.tasks?.length ?? 0} of ${project._count.tasks} shown` : ''}
                            </span>
                        </div>

                        {project.tasks && project.tasks.length > 0 ? (
                            <div className="space-y-4">
                                {project.tasks.map((task: any) => (
                                    <div key={task.id} className="p-4 rounded-xl border border-secondary-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all flex justify-between items-center gap-4 group">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${task.status === 'COMPLETED' ? 'bg-success-500' : task.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-secondary-300'}`} />
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-secondary-900 group-hover:text-primary-700 truncate">{task.title}</h4>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-secondary-500">
                                                    <span>{task.user?.name || task.user?.email || 'Unassigned'}</span>
                                                    <span>•</span>
                                                    <span className="uppercase">{(task.status || '').replace('_', ' ') || 'PENDING'}</span>
                                                    {task.dueDate && (
                                                        <>
                                                            <span>•</span>
                                                            <span>due {new Date(task.dueDate).toLocaleDateString()}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {task.priority && (
                                            <span className={`text-[10px] font-black px-2 py-1 rounded border uppercase shrink-0 ${task.priority === 'HIGH' || task.priority === 'URGENT' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-secondary-50 text-secondary-600 border-secondary-200'}`}>
                                                {task.priority}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-secondary-400 italic">No tasks on this project yet.</div>
                        )}
                    </div>

                    <div className="card-premium p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-secondary-900">Issues & Bugs</h3>
                            {/* Issues are raised and tracked in the Problems module (lib/problems.ts
                                writes them); there is no standalone issues board to link to. */}
                            <Link href="/dashboard/problems" className="text-xs font-bold text-primary-600 uppercase hover:underline">
                                View All Issues
                            </Link>
                        </div>

                        {project.issues && project.issues.length > 0 ? (
                            <div className="space-y-4">
                                {project.issues.map((issue: any) => (
                                    <div key={issue.id} className="p-4 rounded-xl border border-secondary-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-2 h-2 rounded-full ${issue.status === 'OPEN' ? 'bg-danger-500' : 'bg-success-500'}`} />
                                            <div>
                                                <h4 className="font-bold text-secondary-900 group-hover:text-primary-700">{issue.title}</h4>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-secondary-500">
                                                    <span>{issue.reporter?.name || issue.reporter?.email || 'Unknown'}</span>
                                                    <span>•</span>
                                                    <span className="uppercase">{issue.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-[10px] font-black px-2 py-1 rounded border uppercase ${issue.priority === 'HIGH' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-secondary-50 text-secondary-600 border-secondary-200'
                                                }`}>
                                                {issue.priority}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-secondary-400 italic">No issues reported yet.</div>
                        )}
                    </div>
                </div>

                {/* Sidebar: Team & Info */}
                <div className="space-y-6">
                    <div className="card-premium p-6">
                        <h3 className="font-black text-lg text-secondary-900 mb-4">Project Team</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                                    {(project.manager?.name?.[0] || 'M')}
                                </div>
                                <div>
                                    <p className="font-bold text-secondary-900 text-sm">{project.manager?.name || 'Unknown Manager'}</p>
                                    <p className="text-xs text-indigo-600 font-bold uppercase">Project Manager</p>
                                </div>
                            </div>

                            {(project.members || []).map((member: any) => (
                                <div key={member.id} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-secondary-100 text-secondary-600 flex items-center justify-center font-bold text-xs">
                                        {(member.user?.name?.[0] || 'U')}
                                    </div>
                                    <div>
                                        <p className="font-bold text-secondary-900 text-sm">{member.user?.name}</p>
                                        <p className="text-[10px] text-secondary-500 font-bold uppercase">{member.role || 'Member'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {isEditing && draft && (
                <div className="fixed inset-0 bg-secondary-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-label="Edit project">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <form onSubmit={handleUpdate} className="p-8 space-y-5">
                            <h3 className="text-2xl font-black text-secondary-900">Edit Project</h3>

                            <div>
                                <label htmlFor="proj-title" className="text-xs font-black text-secondary-500 uppercase">Title</label>
                                <input
                                    id="proj-title"
                                    required
                                    value={draft.title}
                                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                                    className="w-full mt-1 px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none"
                                />
                            </div>

                            <div>
                                <label htmlFor="proj-desc" className="text-xs font-black text-secondary-500 uppercase">Description</label>
                                <textarea
                                    id="proj-desc"
                                    rows={3}
                                    value={draft.description}
                                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                                    className="w-full mt-1 px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="proj-status" className="text-xs font-black text-secondary-500 uppercase">Status</label>
                                    <select id="proj-status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className="w-full mt-1 px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none">
                                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="proj-priority" className="text-xs font-black text-secondary-500 uppercase">Priority</label>
                                    <select id="proj-priority" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })} className="w-full mt-1 px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none">
                                        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="proj-start" className="text-xs font-black text-secondary-500 uppercase">Start Date</label>
                                    <input id="proj-start" type="date" required value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} className="w-full mt-1 px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none" />
                                </div>
                                <div>
                                    <label htmlFor="proj-end" className="text-xs font-black text-secondary-500 uppercase">End Date</label>
                                    <input id="proj-end" type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} className="w-full mt-1 px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none" />
                                </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 px-4 py-2 rounded-lg border border-secondary-200 text-secondary-600 font-bold hover:bg-secondary-50 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={updateProject.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 disabled:opacity-60 transition-all shadow-lg shadow-primary-500/20">
                                    {updateProject.isPending ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Style guide accessibility compliance helper comment: aria-label placeholder label
