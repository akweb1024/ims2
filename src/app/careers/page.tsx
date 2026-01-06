'use client';

import { useState, useEffect } from 'react';

export default function CareersPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [applying, setApplying] = useState(false);
    const [applicationStatus, setApplicationStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
    const [examLink, setExamLink] = useState('');

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const res = await fetch('/api/recruitment/jobs');
            if (res.ok) setJobs(await res.json());
        } catch (err) {
            console.error(err);
        }
    };

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        setApplicationStatus('submitting');
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData);

        try {
            const res = await fetch('/api/recruitment/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobPostingId: selectedJob.id,
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    resumeUrl: data.resumeUrl
                })
            });

            if (res.ok) {
                const responseData = await res.json();
                setExamLink(responseData.examLink);
                setApplicationStatus('success');
            } else {
                alert('Application failed. Please try again.');
                setApplicationStatus('idle');
            }
        } catch (err) {
            alert('Something went wrong.');
            setApplicationStatus('idle');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xl">S</div>
                        <span className="font-extrabold text-xl tracking-tight text-slate-900">STM <span className="text-indigo-600">Careers</span></span>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <div className="bg-slate-900 text-white py-24 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[128px] opacity-40 -mr-20 -mt-20"></div>
                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                    <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">Build the Future of <span className="text-indigo-400">Intelligence.</span></h1>
                    <p className="text-xl text-slate-300 max-w-2xl mx-auto">Join a team that is redefining how enterprises operate with AI-driven decisions. We don&apos;t just record data; we act on it.</p>
                </div>
            </div>

            {/* Job Listings */}
            <div className="max-w-7xl mx-auto px-6 py-20">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-8">Current Openings</h2>

                {jobs.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
                        <p className="text-slate-400 font-bold">No positions open at the moment.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {jobs.map(job => (
                            <div key={job.id} className="group bg-white p-8 rounded-3xl border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-900/5 transition-all flex flex-col items-start cursor-pointer" onClick={() => setSelectedJob(job)}>
                                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">{job.type.replace('_', ' ')}</span>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{job.title}</h3>
                                <p className="text-slate-500 text-sm mb-6 line-clamp-3">{job.salaryRange} • {job.location || 'Remote'}</p>
                                <div className="mt-auto pt-6 w-full border-t border-slate-50 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase">View Details</span>
                                    <span className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">→</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Job Detail Modal */}
            {selectedJob && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative my-8">
                        <div className="p-8 md:p-12 relative">
                            <button onClick={() => { setSelectedJob(null); setApplying(false); }} className="absolute top-6 right-6 w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold transition-all">✕</button>

                            {!applying ? (
                                <>
                                    <span className="text-indigo-600 font-bold tracking-widest uppercase text-xs mb-2 block">{selectedJob.type.replace('_', ' ')}</span>
                                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">{selectedJob.title}</h2>
                                    <div className="flex gap-4 text-sm font-medium text-slate-500 mb-10">
                                        <span>📍 {selectedJob.location || 'Remote'}</span>
                                        <span>💰 {selectedJob.salaryRange}</span>
                                    </div>

                                    <div className="prose prose-slate max-w-none mb-10">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 mb-4">About the Role</h3>
                                        <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedJob.description}</div>

                                        {selectedJob.requirements && (
                                            <>
                                                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 mt-8 mb-4">Requirements</h3>
                                                <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedJob.requirements}</div>
                                            </>
                                        )}
                                    </div>

                                    <div className="sticky bottom-0 bg-white pt-4 border-t border-slate-100">
                                        <button onClick={() => setApplying(true)} className="w-full btn bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-indigo-200">Apply for this Position</button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center max-w-md mx-auto py-10">
                                    {applicationStatus === 'success' ? (
                                        <div className="animate-in fade-in zoom-in duration-300">
                                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✅</div>
                                            <h3 className="text-2xl font-black text-slate-900 mb-2">Application Received!</h3>
                                            <p className="text-slate-500 mb-6">Our AI is reviewing your profile.</p>

                                            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 mb-6">
                                                <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">Next Step</p>
                                                <h4 className="font-bold text-indigo-900 mb-4">Complete your Skill Assessment to proceed.</h4>
                                                <a href={examLink || '#'} className="btn bg-indigo-600 text-white w-full py-3 rounded-xl font-bold block hover:scale-105 transition-transform shadow-lg shadow-indigo-200">Start Assessment Now ⚡</a>
                                            </div>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleApply} className="text-left space-y-6 animate-in slide-in-from-right duration-300">
                                            <div className="text-center mb-10">
                                                <button type="button" onClick={() => setApplying(false)} className="text-xs font-bold text-slate-400 hover:text-indigo-600 uppercase mb-4">← Back to Job Details</button>
                                                <h3 className="text-3xl font-black text-slate-900">Join the Team</h3>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Full Name</label>
                                                <input name="name" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900" placeholder="e.g. Alex Morgan" />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Address</label>
                                                    <input name="email" type="email" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900" placeholder="alex@example.com" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Phone</label>
                                                    <input name="phone" type="tel" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900" placeholder="+91 98765..." />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Resume / Portfolio URL</label>
                                                <input name="resumeUrl" type="url" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900" placeholder="https://linkedin.com/in/..." />
                                                <p className="text-[10px] text-slate-400 mt-1">Link to your LinkedIn, GitHub, or Portfolio.</p>
                                            </div>

                                            <button type="submit" disabled={applicationStatus === 'submitting'} className="w-full btn bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed">
                                                {applicationStatus === 'submitting' ? 'Submitting Application...' : 'Confirm Application'}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
