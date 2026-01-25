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
            // Re-using the jobs API but filtering on client or fetching specific if endpoint supports
            // The existing list API /api/recruitment/jobs likely returns all, but we can verify if it supports ID
            // Ideally we should have a GET /api/recruitment/jobs/[id] or filter the list
            // For now, I'll fetch the list and find the item, or try a direct fetch if I implement it
            // Let's assume we can fetch all and filter for now as it's safer without checking backend code deeply
            const res = await fetch('/api/recruitment/jobs');
            if (res.ok) {
                const jobs = await res.json();
                const found = jobs.find((j: any) => j.id === id);
                if (found) setJob(found);
                else router.push('/careers');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [router]);

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
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!job) return null;

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/careers')}>
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xl">S</div>
                        <span className="font-extrabold text-xl tracking-tight text-slate-900">STM <span className="text-indigo-600">Careers</span></span>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-6 py-12">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-500 font-bold hover:text-indigo-600 mb-8 transition-colors"
                >
                    <ArrowLeft size={20} /> Back to Jobs
                </button>

                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                    <div className="p-8 md:p-12">
                        {!applying ? (
                            <>
                                <span className="text-indigo-600 font-bold tracking-widest uppercase text-xs mb-2 block">{job.type.replace('_', ' ')}</span>
                                <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">{job.title}</h1>
                                <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-500 mb-10">
                                    <span className="bg-slate-100 px-3 py-1 rounded-full">📍 {job.location || 'Remote'}</span>
                                    <span className="bg-slate-100 px-3 py-1 rounded-full">💰 {job.salaryRange || 'Competitive'}</span>
                                    {job.department && <span className="bg-slate-100 px-3 py-1 rounded-full">🏢 {job.department.name}</span>}
                                </div>

                                <div className="prose prose-slate max-w-none mb-10">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 mb-4">About the Role</h3>
                                    <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">{job.description}</div>

                                    {job.requirements && (
                                        <>
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 mt-8 mb-4">Requirements</h3>
                                            <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">{job.requirements}</div>
                                        </>
                                    )}
                                </div>

                                <div className="sticky bottom-0 bg-white pt-4 border-t border-slate-100">
                                    <button onClick={() => setApplying(true)} className="w-full btn bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-indigo-200 transition-all transform hover:scale-[1.01]">Apply for this Position</button>
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
        </div>
    );
}
