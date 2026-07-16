'use client';

import { useState, useMemo } from 'react';
import { useProjects, useProjectMutations, useProjectAssignees } from '@/hooks/useProjects';
import { Plus, Folder, Calendar, Users, AlertCircle, ArrowRight, CheckCircle, Clock, Search, Building2, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

const EMPTY_PROJECT = { title: '', description: '', startDate: '', endDate: '', priority: 'MEDIUM', status: 'PLANNED', memberIds: [] as string[] };

const STATUS_OPTIONS = ['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function ProjectsPage() {
    const [filters, setFilters] = useState({ q: '', status: '', priority: '', companyId: '', mine: false });

    // The API takes every one of these; until now the page called useProjects() with no
    // arguments, so none of them were reachable from the UI.
    const query = useMemo(() => {
        const q: Record<string, string> = {};
        if (filters.q.trim()) q.q = filters.q.trim();
        if (filters.status) q.status = filters.status;
        if (filters.priority) q.priority = filters.priority;
        if (filters.companyId) q.companyId = filters.companyId;
        if (filters.mine) q.mine = 'true';
        return q;
    }, [filters]);

    const { data: projects = [], isLoading } = useProjects(query);
    const { createProject } = useProjectMutations();
    const [isCreating, setIsCreating] = useState(false);
    const [newProject, setNewProject] = useState(EMPTY_PROJECT);
    // Only fetched once the form is open — no reason to load the directory otherwise.
    const { data: assignees = [] } = useProjectAssignees(isCreating);

    // Company options come from the board itself — every internal user can see the
    // projects but not necessarily list companies, so there is no directory to call.
    const companyOptions = useMemo(() => {
        const seen = new Map<string, string>();
        for (const p of projects as any[]) if (p.company?.id) seen.set(p.company.id, p.company.name);
        return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [projects]);

    const activeFilterCount = Object.keys(query).length;

    const toggleMember = (userId: string) =>
        setNewProject((p) => ({
            ...p,
            memberIds: p.memberIds.includes(userId) ? p.memberIds.filter((m) => m !== userId) : [...p.memberIds, userId],
        }));

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createProject.mutateAsync(newProject);
            setIsCreating(false);
            setNewProject(EMPTY_PROJECT);
            toast.success('Project created successfully');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to create project');
        }
    };

    if (isLoading) return <div className="p-10 text-center animate-pulse">Loading Projects...</div>;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-success-100 text-success-700 border-success-200';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'ON_HOLD': return 'bg-warning-100 text-warning-700 border-warning-200';
            default: return 'bg-secondary-100 text-secondary-600 border-secondary-200';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-secondary-900 tracking-tight">Project Management</h1>
                    <p className="text-secondary-500 font-medium mt-1"> oversee initiatives, track progress, and manage resources</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="btn btn-primary flex items-center gap-2 px-6 py-3 font-bold shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 transition-all"
                >
                    <Plus size={20} /> New Project
                </button>
            </div>

            <div className="card-premium p-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                    <input
                        value={filters.q}
                        onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                        placeholder="Search title or description…"
                        aria-label="Search projects"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none text-sm"
                    />
                </div>

                <select aria-label="Filter by status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none text-sm font-medium">
                    <option value="">All statuses</option>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>

                <select aria-label="Filter by priority" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} className="px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none text-sm font-medium">
                    <option value="">All priorities</option>
                    {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>

                {companyOptions.length > 1 && (
                    <select aria-label="Filter by company" value={filters.companyId} onChange={(e) => setFilters({ ...filters, companyId: e.target.value })} className="px-3 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 outline-none text-sm font-medium">
                        <option value="">All companies</option>
                        {companyOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                )}

                <button
                    type="button"
                    onClick={() => setFilters({ ...filters, mine: !filters.mine })}
                    aria-pressed={filters.mine}
                    className={`px-3 py-2 rounded-lg border text-sm font-bold transition-all ${filters.mine ? 'bg-primary-600 text-white border-primary-600' : 'border-secondary-200 text-secondary-600 hover:bg-secondary-50'}`}
                >
                    Only mine
                </button>

                {activeFilterCount > 0 && (
                    <button
                        type="button"
                        onClick={() => setFilters({ q: '', status: '', priority: '', companyId: '', mine: false })}
                        className="px-3 py-2 rounded-lg text-sm font-bold text-secondary-500 hover:text-secondary-800 flex items-center gap-1"
                    >
                        <X size={14} /> Clear
                    </button>
                )}

                <span className="text-xs font-bold text-secondary-400 ml-auto">
                    {projects.length} {projects.length === 1 ? 'project' : 'projects'}
                </span>
            </div>

            {projects.length === 0 && (
                <div className="card-premium p-12 text-center text-secondary-400">
                    <Folder size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="font-bold text-secondary-600">
                        {activeFilterCount > 0 ? 'No projects match these filters.' : 'No projects yet.'}
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project: any) => (
                    <Link href={`/dashboard/projects/${project.id}`} key={project.id} className="group">
                        <div className="card-premium h-full hover:-translate-y-1 hover:shadow-xl transition-all border border-secondary-100 relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-1 h-full ${project.priority === 'HIGH' ? 'bg-danger-500' :
                                    project.priority === 'MEDIUM' ? 'bg-warning-500' : 'bg-success-500'
                                }`} />

                            <div className="flex justify-between items-start mb-4 pl-3">
                                <div className="p-3 bg-primary-50 text-primary-600 rounded-xl group-hover:bg-primary-600 group-hover:text-white transition-colors">
                                    <Folder size={24} />
                                </div>
                                <span className={`text-[10px] font-black px-2 py-1 rounded border uppercase tracking-wider ${getStatusColor(project.status)}`}>
                                    {project.status.replace('_', ' ')}
                                </span>
                            </div>

                            <div className="pl-3 mb-6">
                                <h3 className="text-xl font-black text-secondary-900 mb-2 line-clamp-1 group-hover:text-primary-600 transition-colors">
                                    {project.title}
                                </h3>
                                <p className="text-sm text-secondary-500 line-clamp-2 min-h-[40px]">
                                    {project.description || 'No description provided.'}
                                </p>
                            </div>

                            <div className="pl-3 grid grid-cols-2 gap-4 mb-6">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-secondary-400" />
                                    <div>
                                        <p className="text-[10px] font-bold text-secondary-400 uppercase">Deadline</p>
                                        <p className="text-xs font-bold text-secondary-700">
                                            {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'No Deadline'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users size={14} className="text-secondary-400" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-secondary-400 uppercase">Team</p>
                                        {/* Names, not just a count — you could not tell who was on a
                                            project without opening it. User.name is nullable, so fall
                                            back to email. */}
                                        <p className="text-xs font-bold text-secondary-700 truncate">
                                            {project.members?.length
                                                ? project.members
                                                    .slice(0, 2)
                                                    .map((m: any) => m.user?.name || m.user?.email || 'Unknown')
                                                    .join(', ') + (project.members.length > 2 ? ` +${project.members.length - 2}` : '')
                                                : 'No members yet'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* The board spans every company now, so say which one owns this. */}
                            {project.company?.name && (
                                <div className="pl-3 mb-4 flex items-center gap-1.5 text-[10px] font-black text-secondary-400 uppercase tracking-wider">
                                    <Building2 size={12} />
                                    {project.company.name}
                                </div>
                            )}

                            <div className="pl-3 pt-4 border-t border-secondary-50 flex justify-between items-center">
                                <div className="flex -space-x-2">
                                    {(project.members || []).slice(0, 3).map((m: any, i: number) => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-secondary-200 flex items-center justify-center text-[10px] font-bold text-secondary-600">
                                            {(m.user?.name?.[0] || 'U')}
                                        </div>
                                    ))}
                                    {(project.members?.length || 0) > 3 && (
                                        <div className="w-8 h-8 rounded-full border-2 border-white bg-secondary-100 flex items-center justify-center text-[10px] font-bold text-secondary-500">
                                            +{project.members.length - 3}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 text-primary-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
                                    View Details <ArrowRight size={14} />
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}

                {/* Create Project Modal */}
                {isCreating && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
                            <div className="p-6 border-b border-secondary-100 bg-secondary-50">
                                <h3 className="text-xl font-black text-secondary-900">Create New Project</h3>
                            </div>
                            <form onSubmit={handleCreate} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Project Title</label>
                                    <input
                                        required
                                        className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                                        value={newProject.title}
                                        onChange={e => setNewProject({ ...newProject, title: e.target.value })}
                                        placeholder="e.g. Q4 Marketing Campaign"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Description</label>
                                    <textarea
                                        className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                                        rows={3}
                                        value={newProject.description}
                                        onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                                        placeholder="Project goals and objectives..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                                            value={newProject.startDate}
                                            onChange={e => setNewProject({ ...newProject, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Deadline</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                                            value={newProject.endDate}
                                            onChange={e => setNewProject({ ...newProject, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Priority</label>
                                        <select
                                            className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                                            value={newProject.priority}
                                            onChange={e => setNewProject({ ...newProject, priority: e.target.value })}
                                        >
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High</option>
                                            <option value="CRITICAL">Critical</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">Status</label>
                                        <select
                                            className="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                                            value={newProject.status}
                                            onChange={e => setNewProject({ ...newProject, status: e.target.value })}
                                        >
                                            <option value="PLANNED">Planned</option>
                                            <option value="IN_PROGRESS">In Progress</option>
                                            <option value="ON_HOLD">On Hold</option>
                                            <option value="COMPLETED">Completed</option>
                                        </select>
                                    </div>
                                </div>
                                {/* POST /api/projects has always accepted memberIds; the form
                                    never sent them, so every project created here started with
                                    an empty team. */}
                                <div>
                                    <label className="block text-xs font-bold text-secondary-600 uppercase mb-1">
                                        Team Members {newProject.memberIds.length > 0 && `(${newProject.memberIds.length} selected)`}
                                    </label>
                                    {assignees.length === 0 ? (
                                        <p className="text-xs text-secondary-400 italic py-2">Loading people…</p>
                                    ) : (
                                        <div className="max-h-40 overflow-y-auto rounded-lg border border-secondary-200 divide-y divide-secondary-100">
                                            {assignees.map((a) => (
                                                <label key={a.userId} className="flex items-center gap-3 px-3 py-2 hover:bg-secondary-50 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={newProject.memberIds.includes(a.userId)}
                                                        onChange={() => toggleMember(a.userId)}
                                                        className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                                                    />
                                                    <span className="text-sm font-medium text-secondary-800">{a.name}</span>
                                                    {a.departmentName && (
                                                        <span className="text-[10px] text-secondary-400 uppercase font-bold ml-auto">{a.departmentName}</span>
                                                    )}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreating(false)}
                                        className="flex-1 px-4 py-2 rounded-lg border border-secondary-200 text-secondary-600 font-bold hover:bg-secondary-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20"
                                    >
                                        Create Project
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
