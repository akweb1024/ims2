'use client';

import { useState } from 'react';
import { useProjects, useProjectMutations } from '@/hooks/useProjects';
import { Plus, Folder, Calendar, Users, AlertCircle, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function ProjectsPage() {
    const { data: projects = [], isLoading } = useProjects();
    const { createProject } = useProjectMutations();
    const [isCreating, setIsCreating] = useState(false);
    const [newProject, setNewProject] = useState({ title: '', description: '', startDate: '', endDate: '', priority: 'MEDIUM', status: 'PLANNED' });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createProject.mutateAsync(newProject);
            setIsCreating(false);
            setNewProject({ title: '', description: '', startDate: '', endDate: '', priority: 'MEDIUM', status: 'PLANNED' });
            toast.success('Project created successfully');
        } catch (error) {
            toast.error('Failed to create project');
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
                                    <div>
                                        <p className="text-[10px] font-bold text-secondary-400 uppercase">Team</p>
                                        <p className="text-xs font-bold text-secondary-700">
                                            {project.members?.length || 0} Members
                                        </p>
                                    </div>
                                </div>
                            </div>

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
