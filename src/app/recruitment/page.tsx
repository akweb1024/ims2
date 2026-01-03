'use client';

import { useState, useEffect } from 'react';
import FormattedDate from '@/components/common/FormattedDate';

export default function JobBoard() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [applyingJob, setApplyingJob] = useState<any>(null);
    const [applicationStatus, setApplicationStatus] = useState<any>(null);

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        const res = await fetch('/api/recruitment/jobs');
        if (res.ok) setJobs(await res.json());
        setLoading(false);
    };

    const handleApply = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);

        const res = await fetch('/api/recruitment/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, jobPostingId: applyingJob.id })
        });

        if (res.ok) {
            const result = await res.json();
            setApplicationStatus(result);
            setApplyingJob(null);
        }
    };

    return (
        <div className="min-h-screen bg-secondary-50 py-20 px-4">
            <div className="max-w-4xl mx-auto space-y-12">
                <div className="text-center">
                    <h1 className="text-6xl font-black text-secondary-900 tracking-tighter mb-4">Join Our Team</h1>
                    <p className="text-secondary-500 text-xl">Help us redefine the future of scientific journals.</p>
                </div>

                {applicationStatus ? (
                    <div className="card-premium p-12 text-center bg-white shadow-2xl space-y-6">
                        <div className="w-20 h-20 bg-success-100 text-success-600 rounded-full flex items-center justify-center text-4xl mx-auto">✓</div>
                        <h2 className="text-3xl font-bold text-secondary-900">Application Received!</h2>
                        <p className="text-secondary-600">Your application ID is: <span className="font-mono font-bold">{applicationStatus.id}</span></p>
                        <div className="bg-primary-50 p-6 rounded-2xl border border-primary-100">
                            <p className="text-primary-800 font-bold mb-4">Next Step: Online Entrance Exam</p>
                            <a
                                href={`/recruitment/exam/${applicationStatus.id}`}
                                className="btn btn-primary px-8 py-3 rounded-xl inline-block shadow-lg"
                            >
                                Start Exam Now
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {loading ? (
                            <div className="text-center py-20 text-secondary-400">Loading careers...</div>
                        ) : jobs.map(job => (
                            <div key={job.id} className="card-premium p-8 bg-white hover:shadow-2xl transition-all group border-l-8 border-primary-500">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="badge badge-primary">{job.type.replace('_', ' ')}</span>
                                            <span className="text-xs font-bold text-secondary-400 uppercase tracking-widest">{job.location}</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-secondary-900 group-hover:text-primary-600 transition-colors">{job.title}</h3>
                                        <p className="text-secondary-400 text-sm mt-1">{job.company.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-secondary-900">{job.salaryRange}</p>
                                        <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">Annual Package</p>
                                    </div>
                                </div>
                                <p className="mt-6 text-secondary-600 leading-relaxed max-w-2xl">{job.description}</p>
                                <button
                                    onClick={() => setApplyingJob(job)}
                                    className="mt-8 btn btn-primary px-10 rounded-xl shadow-lg group-hover:scale-105 transition-transform"
                                >
                                    Apply for this Role
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>


            {applyingJob && (
                <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-10 relative animate-in fade-in zoom-in duration-300">
                        <button onClick={() => setApplyingJob(null)} className="absolute top-6 right-8 text-2xl text-secondary-400">×</button>
                        <h2 className="text-3xl font-bold text-secondary-900 mb-2">Apply for {applyingJob.title}</h2>
                        <p className="text-secondary-500 mb-8 font-medium">Please fill in your details to begin the recruitment process.</p>

                        <form onSubmit={handleApply} className="space-y-4">
                            <div>
                                <label className="label">Full Name</label>
                                <input name="name" className="input" required placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="label">Email Address</label>
                                <input name="email" type="email" className="input" required placeholder="john@example.com" />
                            </div>
                            <div>
                                <label className="label">Phone Number</label>
                                <input name="phone" className="input" required placeholder="+1 (555) 000-0000" />
                            </div>
                            <button type="submit" className="btn btn-primary w-full py-4 rounded-xl text-lg font-bold shadow-xl mt-4">
                                Submit & Go to Exam
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div >
    );
}
