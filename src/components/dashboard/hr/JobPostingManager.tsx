'use client';

import { useState } from 'react';
import {
    Briefcase, Users, UserPlus,
    Search, Filter, MapPin, DollarSign,
    MoreHorizontal, Edit, CheckCircle2, Clock,
    Loader2, BookOpen, Ban
} from 'lucide-react';
import RichTextEditor from '@/components/common/RichTextEditor';
import ExamManagerModal from './ExamManagerModal';
import { useJobPostings, useJobMutations } from '@/hooks/useRecruitment';
import { useDepartments } from '@/hooks/useHR';

interface JobForm {
    id?: string;
    title: string;
    departmentId: string;
    type: string;
    location: string;
    salaryRange: string;
    description: string;
    requirements: string;
    status: string;
}

const initialForm: JobForm = {
    title: '',
    departmentId: '',
    type: 'FULL_TIME',
    location: 'On-site',
    salaryRange: '',
    description: '',
    requirements: '',
    status: 'OPEN'
};

export default function JobPostingManager() {
    const [statusFilter, setStatusFilter] = useState('OPEN');
    const { data: jobs, isLoading } = useJobPostings({ status: statusFilter === 'ALL' ? undefined : statusFilter });
    const { data: departments } = useDepartments();
    const { createJob, updateJob } = useJobMutations();

    const [showModal, setShowModal] = useState(false);
    const [showExamModal, setShowExamModal] = useState(false);
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<JobForm>(initialForm);

    const handleEdit = (job: any) => {
        setFormData({
            id: job.id,
            title: job.title,
            departmentId: job.departmentId || '',
            type: job.type,
            location: job.location || '',
            salaryRange: job.salaryRange || '',
            description: job.description || '',
            requirements: job.requirements || '',
            status: job.status
        });
        setShowModal(true);
    };

    const handleCreate = () => {
        setFormData(initialForm);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (formData.id) {
                await updateJob.mutateAsync(formData);
            } else {
                await createJob.mutateAsync(formData);
            }
            setShowModal(false);
            setFormData(initialForm);
        } catch (error) {
            console.error(error);
            alert('Failed to save job posting. Please check all fields.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="p-10 text-center font-bold text-secondary-400 animate-pulse">Loading jobs...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h3 className="text-2xl font-black text-secondary-900 tracking-tight">Active Job Openings</h3>
                    <p className="text-secondary-500 font-medium">Manage job descriptions and hiring requirements.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-white p-1 rounded-xl border border-secondary-200 flex gap-1 shadow-sm">
                        {['OPEN', 'CLOSED', 'DRAFT', 'ALL'].map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-secondary-900 text-white shadow-md' : 'text-secondary-400 hover:text-secondary-900'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handleCreate}
                        className="btn bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg shadow-primary-200"
                    >
                        <UserPlus size={16} /> Post New Job
                    </button>
                </div>
            </div>

            {/* Job Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs?.map((job) => (
                    <div key={job.id} onClick={() => handleEdit(job)} className="card-premium p-6 group hover:border-primary-200 transition-all cursor-pointer relative overflow-hidden bg-white">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center text-xl font-bold shadow-inner">
                                {job.title.charAt(0)}
                            </div>
                            <div className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${job.status === 'OPEN' ? 'bg-success-50 text-success-600' : 'bg-secondary-100 text-secondary-500'}`}>
                                {job.status}
                            </div>
                        </div>

                        <h4 className="font-black text-secondary-900 text-lg mb-1 group-hover:text-primary-600 transition-colors">{job.title}</h4>
                        <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest mb-4">
                            {job.department?.name || 'General'} • {job.type.replace('_', ' ')}
                        </p>

                        <div className="flex flex-wrap gap-2 text-xs font-medium text-secondary-500 mb-6">
                            <span className="flex items-center gap-1 bg-secondary-50 px-2 py-1 rounded-lg">
                                <MapPin size={12} /> {job.location || 'Remote'}
                            </span>
                            <span className="flex items-center gap-1 bg-secondary-50 px-2 py-1 rounded-lg">
                                <DollarSign size={12} /> {job.salaryRange || 'Not Updated'}
                            </span>
                        </div>

                        <div className="pt-4 border-t border-secondary-50 flex justify-between items-center">
                            <div className="flex -space-x-2">
                                {Array.from({ length: Math.min(3, job._count.applications) }).map((_, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-secondary-200 border-2 border-white"></div>
                                ))}
                                {job._count.applications > 0 && (
                                    <div className="w-6 h-6 rounded-full bg-secondary-900 text-white text-[8px] flex items-center justify-center font-bold border-2 border-white">
                                        {job._count.applications}
                                    </div>
                                )}
                                {job._count.applications === 0 && (
                                    <span className="text-secondary-400 text-xs italic">No applicants yet</span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedJob(job);
                                        setShowExamModal(true);
                                    }}
                                    className="text-primary-600 hover:text-primary-800 bg-primary-50 p-2 rounded-full transition-colors"
                                    title="Manage Assessment (MCQ)"
                                >
                                    <BookOpen size={14} />
                                </button>
                                <button className="text-secondary-400 hover:text-secondary-900 bg-secondary-50 p-2 rounded-full transition-colors" onClick={() => handleEdit(job)}>
                                    <Edit size={14} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newStatus = job.status === 'OPEN' ? 'CLOSED' : 'OPEN';
                                        if (confirm(`Are you sure you want to ${newStatus === 'OPEN' ? 're-open' : 'close'} hiring for this position?`)) {
                                            updateJob.mutate({ id: job.id, status: newStatus });
                                        }
                                    }}
                                    className={`p-2 rounded-full transition-colors ${job.status === 'OPEN' ? 'text-red-400 hover:text-red-600 bg-red-50' : 'text-green-400 hover:text-green-600 bg-green-50'}`}
                                    title={job.status === 'OPEN' ? 'Close Hiring' : 'Re-open Hiring'}
                                >
                                    {job.status === 'OPEN' ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showExamModal && selectedJob && (
                <ExamManagerModal
                    jobId={selectedJob.id}
                    jobTitle={selectedJob.title}
                    onClose={() => {
                        setShowExamModal(false);
                        setSelectedJob(null);
                    }}
                />
            )}

            {/* Create/Edit Job Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-secondary-50 flex justify-between items-center bg-secondary-50/30 shrink-0">
                            <h3 className="text-xl font-black text-secondary-900 uppercase tracking-tight">
                                {formData.id ? 'Edit Job Posting' : 'Create Job Posting'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-secondary-400 hover:text-secondary-900 text-2xl">×</button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                            <div className="p-8 space-y-6 overflow-y-auto">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Job Title *</label>
                                            <input
                                                required
                                                className="w-full bg-secondary-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-primary-500"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                placeholder="e.g. Senior Product Designer"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Department *</label>
                                            <select
                                                required
                                                className="w-full bg-secondary-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-primary-500"
                                                value={formData.departmentId}
                                                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                                            >
                                                <option value="">Select Dept</option>
                                                {departments?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Type</label>
                                            <select
                                                className="w-full bg-secondary-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-primary-500"
                                                value={formData.type}
                                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            >
                                                <option value="FULL_TIME">Full Time</option>
                                                <option value="PART_TIME">Part Time</option>
                                                <option value="CONTRACT">Contract</option>
                                                <option value="INTERNSHIP">Internship</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Location</label>
                                            <input
                                                className="w-full bg-secondary-50 border-none rounded-2xl p-4 font-bold"
                                                value={formData.location}
                                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Salary Range</label>
                                            <input
                                                className="w-full bg-secondary-50 border-none rounded-2xl p-4 font-bold"
                                                value={formData.salaryRange}
                                                onChange={(e) => setFormData({ ...formData, salaryRange: e.target.value })}
                                                placeholder="e.g. 12LPA - 18LPA"
                                            />
                                        </div>
                                    </div>

                                    {formData.id && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Current Status</label>
                                            <select
                                                className="w-full bg-secondary-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-primary-500"
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            >
                                                <option value="OPEN">Open (Accepting Applications)</option>
                                                <option value="CLOSED">Closed</option>
                                                <option value="DRAFT">Draft</option>
                                            </select>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Description *</label>
                                        <div className="bg-white rounded-2xl overflow-hidden border border-secondary-100 focus-within:ring-2 focus-within:ring-primary-500">
                                            <RichTextEditor
                                                value={formData.description}
                                                onChange={(val) => setFormData({ ...formData, description: val })}
                                                placeholder="Detailed job responsibilities (min 10 chars)..."
                                                className="min-h-[150px]"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Requirements</label>
                                        <div className="bg-white rounded-2xl overflow-hidden border border-secondary-100 focus-within:ring-2 focus-within:ring-primary-500">
                                            <RichTextEditor
                                                value={formData.requirements}
                                                onChange={(val) => setFormData({ ...formData, requirements: val })}
                                                placeholder="Skills, qualifications, experience..."
                                                className="min-h-[100px]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 border-t border-secondary-50 bg-secondary-50/30 flex justify-end gap-4 shrink-0">
                                <button type="button" onClick={() => setShowModal(false)} className="text-secondary-500 font-bold uppercase text-xs tracking-widest hover:text-black px-4">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={!formData.title || !formData.departmentId || isSubmitting}
                                    className="btn bg-secondary-900 hover:bg-black text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : (formData.id ? 'Save Changes' : 'Launch Position')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
