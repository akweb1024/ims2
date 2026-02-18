'use client';

import { useProject, useProjectMutations } from '@/hooks/useProjects'; // Need to ensure hooks export specific mutations
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
import { Calendar, Users, Briefcase, CheckCircle, AlertCircle, Clock, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';

export default function ProjectDetailsPage({ params }: { params: { id: string } }) {
    const { data: project, isLoading } = useProject(params.id);
    const router = useRouter();
    // Assuming deleteProject is available in useProjectMutations
    const { deleteProject } = useProjectMutations();

    if (isLoading) return <div className="p-10 text-center animate-pulse">Loading Project Details...</div>;
    if (!project) return <div className="p-10 text-center text-red-500">Project not found</div>;

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
                    <button className="btn btn-primary px-6 py-2 rounded-lg font-bold flex items-center gap-2">
                        <Edit size={18} /> Edit Details
                    </button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
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

                    <div className="card-premium p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-secondary-900">Issues & Bugs</h3>
                            <button className="text-xs font-bold text-primary-600 uppercase hover:underline">View All Issues</button>
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
                                                    <span>{issue.reporter?.name}</span>
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
        </div>
    );
}
