'use client';

import { useState, useEffect } from 'react';
import RichTextEditor from '@/components/common/RichTextEditor';
import { createPortal } from 'react-dom';

interface JobPostingModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: any | null;
    onSave: (data: any) => Promise<void>;
}

const initialJobForm = {
    title: '',
    description: '',
    requirements: '',
    location: '',
    salaryRange: '',
    type: 'FULL_TIME',
    status: 'OPEN'
};

export default function JobPostingModal({ isOpen, onClose, job, onSave }: JobPostingModalProps) {
    const [jobForm, setJobForm] = useState(initialJobForm);

    useEffect(() => {
        if (job) {
            setJobForm({
                title: job.title,
                description: job.description,
                requirements: job.requirements || '',
                location: job.location,
                salaryRange: job.salaryRange,
                type: job.type,
                status: job.status
            });
        } else {
            setJobForm(initialJobForm);
        }
    }, [job, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(jobForm);
    };

    if (!isOpen) return null;

    return (

        (typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                <div className="bg-primary-50 p-6 border-b border-primary-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-primary-900">{job ? 'Edit Job Posting' : 'Post New Job'}</h3>
                    <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 grid grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                    <div className="col-span-2">
                        <label className="label-premium">Job Title</label>
                        <input type="text" required className="input-premium" value={jobForm.title} onChange={e => setJobForm({ ...jobForm, title: e.target.value })} />
                    </div>
                    <div className="col-span-2 text-editor-fix">
                        <label className="label-premium">Description</label>
                        <RichTextEditor
                            value={jobForm.description}
                            onChange={val => setJobForm({ ...jobForm, description: val })}
                            placeholder="Detailed job description..."
                        />
                    </div>
                    <div className="col-span-2 text-editor-fix">
                        <label className="label-premium">Requirements</label>
                        <RichTextEditor
                            value={jobForm.requirements}
                            onChange={val => setJobForm({ ...jobForm, requirements: val })}
                            placeholder="Skills, background etc..."
                        />
                    </div>
                    <style jsx>{`
                        .text-editor-fix :global(.ql-editor) {
                            min-height: 120px;
                        }
                    `}</style>
                    <div>
                        <label className="label-premium">Location</label>
                        <input type="text" className="input-premium" value={jobForm.location} onChange={e => setJobForm({ ...jobForm, location: e.target.value })} />
                    </div>
                    <div>
                        <label className="label-premium">Salary Range</label>
                        <input type="text" className="input-premium" value={jobForm.salaryRange} onChange={e => setJobForm({ ...jobForm, salaryRange: e.target.value })} />
                    </div>
                    <div>
                        <label className="label-premium">Type</label>
                        <select className="input-premium" value={jobForm.type} onChange={e => setJobForm({ ...jobForm, type: e.target.value })}>
                            <option value="FULL_TIME">Full Time</option>
                            <option value="PART_TIME">Part Time</option>
                            <option value="CONTRACT">Contract</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-premium">Status</label>
                        <select className="input-premium" value={jobForm.status} onChange={e => setJobForm({ ...jobForm, status: e.target.value })}>
                            <option value="OPEN">Open</option>
                            <option value="CLOSED">Closed</option>
                            <option value="DRAFT">Draft</option>
                        </select>
                    </div>
                    <div className="col-span-2 pt-6 flex gap-4">
                        <button type="submit" className="btn btn-primary flex-1 py-4 text-sm font-black uppercase tracking-widest shadow-lg">Save Job</button>
                        <button type="button" onClick={onClose} className="btn btn-secondary px-8">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    ,

        document.body

        ) : null)

    );
}
