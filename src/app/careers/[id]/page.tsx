'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function JobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [applicationStatus, setApplicationStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
    const [examLink, setExamLink] = useState('');

    const fetchJob = useCallback(async (id: string) => {
        try {
            const res = await fetch('/api/recruitment/jobs');
            if (res.ok) {
                const jobs = await res.json();
                const found = jobs.find((j: any) => j.id === id);
                if (found) {
                    setJob(found);
                } else {
                    setJob(null); // Explicitly set null to trigger Not Found
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []); // Removed router dependency to avoid unnecessary re-creations

    useEffect(() => {
        if (params.id) {
            fetchJob(params.id as string);
        }
    }, [params.id, fetchJob]);

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
                    jobPostingId: job.id,
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

    if (loading) {
        return (
            <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="min-h-screen bg-secondary-50 flex flex-col items-center justify-center text-center p-6">
                <div className="text-6xl mb-4">😕</div>
                <h1 className="text-3xl font-black text-secondary-900 mb-2">Job Not Found</h1>
                <p className="text-secondary-500 mb-8">The position you are looking for might have been closed or moved.</p>
                <button onClick={() => router.push('/careers')} className="btn btn-primary">
                    <ArrowLeft size={18} /> Browse Open Roles
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-secondary-50 font-sans text-secondary-900">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-secondary-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/careers')}>
                        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-black text-xl">S</div>
                        <span className="font-extrabold text-xl tracking-tight text-secondary-900">STM <span className="text-primary-600">Careers</span></span>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-6 py-12">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-secondary-500 font-bold hover:text-primary-600 mb-8 transition-colors"
                >
                    <ArrowLeft size={20} /> Back to Jobs
                </button>

                <div className="bg-white rounded-3xl shadow-xl border border-secondary-100 overflow-hidden">
                    <div className="p-8 md:p-12">
                        {!applying ? (
                            <>
                                <span className="text-primary-600 font-bold tracking-widest uppercase text-xs mb-2 block">{job.type.replace(/_/g, ' ')}</span>
                                <h1 className="text-3xl md:text-5xl font-black text-secondary-900 mb-4">{job.title}</h1>
                                <div className="flex flex-wrap gap-4 text-sm font-medium text-secondary-500 mb-10">
                                    <span className="bg-secondary-100 px-3 py-1 rounded-full text-secondary-700">📍 {job.location || 'Remote'}</span>
                                    <span className="bg-success-50 text-success-700 px-3 py-1 rounded-full">💰 {job.salaryRange || 'Competitive'}</span>
                                    {job.department && <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full">🏢 {job.department.name}</span>}
                                </div>

                                <div className="prose prose-slate max-w-none mb-10">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-secondary-900 mb-4">About the Role</h3>
                                    <div
                                        className="text-secondary-600 leading-relaxed prose prose-sm max-w-none text-justify"
                                        dangerouslySetInnerHTML={{ __html: job.description }}
                                    />

                                    {job.requirements && (
                                        <>
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-secondary-900 mt-8 mb-4">Requirements</h3>
                                            <div
                                                className="text-secondary-600 leading-relaxed prose prose-sm max-w-none text-justify"
                                                dangerouslySetInnerHTML={{ __html: job.requirements }}
                                            />
                                        </>
                                    )}
                                </div>

                                <div className="sticky bottom-0 bg-white pt-4 border-t border-secondary-100">
                                    <button onClick={() => setApplying(true)} className="w-full btn bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-primary-200 transition-all transform hover:scale-[1.01]">Apply for this Position</button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center max-w-md mx-auto py-10">
                                {applicationStatus === 'success' ? (
                                    <div className="animate-in fade-in zoom-in duration-300">
                                        <div className="w-20 h-20 bg-success-100 text-success-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✅</div>
                                        <h3 className="text-2xl font-black text-secondary-900 mb-2">Application Received!</h3>
                                        <p className="text-secondary-500 mb-6">Our AI is reviewing your profile.</p>

                                        <div className="bg-primary-50 p-6 rounded-2xl border border-primary-100 mb-6">
                                            <p className="text-xs font-bold text-primary-500 uppercase tracking-widest mb-2">Next Step</p>
                                            <h4 className="font-bold text-primary-900 mb-4">Complete your Skill Assessment to proceed.</h4>
                                            <a href={examLink || '#'} className="btn bg-primary-600 text-white w-full py-3 rounded-xl font-bold block hover:scale-105 transition-transform shadow-lg shadow-primary-200">Start Assessment Now ⚡</a>
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleApply} className="text-left space-y-6 animate-in slide-in-from-right duration-300">
                                        <div className="text-center mb-10">
                                            <button type="button" onClick={() => setApplying(false)} className="text-xs font-bold text-secondary-400 hover:text-primary-600 uppercase mb-4">← Back to Job Details</button>
                                            <h3 className="text-3xl font-black text-secondary-900">Join the Team</h3>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-secondary-500 uppercase mb-2">Full Name</label>
                                            <input name="name" required className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold text-secondary-900" placeholder="e.g. Alex Morgan" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-secondary-500 uppercase mb-2">Email Address</label>
                                                <input name="email" type="email" required className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold text-secondary-900" placeholder="alex@example.com" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-secondary-500 uppercase mb-2">Phone</label>
                                                <input name="phone" type="tel" className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold text-secondary-900" placeholder="+91 98765..." />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-secondary-500 uppercase mb-2">Resume / Portfolio URL</label>
                                            <input name="resumeUrl" type="url" className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold text-secondary-900" placeholder="https://linkedin.com/in/..." />
                                            <p className="text-[10px] text-secondary-400 mt-1">Link to your LinkedIn, GitHub, or Portfolio.</p>
                                        </div>

                                        <button type="submit" disabled={applicationStatus === 'submitting'} className="w-full btn bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-primary-200 disabled:opacity-70 disabled:cursor-not-allowed">
                                            {applicationStatus === 'submitting' ? 'Submitting Application...' : 'Confirm Application'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
