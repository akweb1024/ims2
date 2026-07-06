'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';

// Candidate-facing application tracker. Reached via the tokenized link handed
// out on the apply success screen — no account or login involved.

const STAGES = [
    { label: 'Application Received', reached: () => true },
    { label: 'Skill Assessment', reached: (s: string) => !['EXAM_PENDING'].includes(s) },
    { label: 'Under Review', reached: (s: string) => ['EXAM_COMPLETED', 'EXAM_PASSED', 'SCREENING', 'INTERVIEW', 'OFFER', 'SELECTED', 'HIRED', 'ONBOARDED'].includes(s) },
    { label: 'Interview', reached: (s: string) => ['INTERVIEW', 'OFFER', 'SELECTED', 'HIRED', 'ONBOARDED'].includes(s) },
    { label: 'Offer & Hiring', reached: (s: string) => ['OFFER', 'SELECTED', 'HIRED', 'ONBOARDED'].includes(s) },
];

const TERMINAL: Record<string, { title: string; note: string }> = {
    REJECTED: {
        title: 'Not selected this time',
        note: 'Thank you for your interest. We encourage you to apply for future openings that match your profile.',
    },
    EXAM_FAILED: {
        title: 'Assessment not cleared',
        note: 'Unfortunately the skill assessment score did not meet the bar for this role. You are welcome to apply for other openings.',
    },
};

function statusHeadline(status: string): string {
    switch (status) {
        case 'EXAM_PENDING': return 'Next step: complete your skill assessment';
        case 'EXAM_COMPLETED':
        case 'EXAM_PASSED':
        case 'APPLIED':
        case 'SCREENING': return 'Your application is being reviewed';
        case 'INTERVIEW': return 'You are in the interview stage';
        case 'OFFER':
        case 'SELECTED': return 'Great news — offer stage!';
        case 'HIRED':
        case 'ONBOARDED': return 'Congratulations — you have been selected! 🎉';
        default: return 'Application status';
    }
}

export default function ApplicationTrackerPage() {
    const params = useParams();
    const router = useRouter();
    const [application, setApplication] = useState<any>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (id: string) => {
        try {
            const token = new URLSearchParams(window.location.search).get('token') || '';
            const res = await fetch(`/api/public/recruitment/applications/${id}?token=${encodeURIComponent(token)}`);
            if (res.ok) {
                setApplication(await res.json());
            } else if (res.status === 401) {
                setError('This tracking link is invalid. Please use the exact link shown when you applied.');
            } else {
                setError('Application not found.');
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (params.id) load(params.id as string);
    }, [params.id, load]);

    const terminal = application ? TERMINAL[application.status] : undefined;

    return (
        <div className="min-h-screen bg-secondary-50 font-sans text-secondary-900">
            <header className="bg-white/80 backdrop-blur-md border-b border-secondary-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/careers')}>
                        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-black text-xl">S</div>
                        <span className="font-extrabold text-xl tracking-tight text-secondary-900">STM <span className="text-primary-600">Careers</span></span>
                    </div>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-6 py-12">
                <button onClick={() => router.push('/careers')} className="flex items-center gap-2 text-secondary-500 font-bold hover:text-primary-600 mb-8 transition-colors">
                    <ArrowLeft size={20} /> Browse Open Roles
                </button>

                {loading ? (
                    <div className="flex justify-center py-24">
                        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : error ? (
                    <div className="bg-white rounded-3xl shadow-xl border border-secondary-100 p-10 text-center">
                        <div className="text-5xl mb-4">🔒</div>
                        <h1 className="text-2xl font-black text-secondary-900 mb-2">Cannot open tracker</h1>
                        <p className="text-secondary-500">{error}</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-xl border border-secondary-100 p-8 md:p-10">
                        <p className="text-primary-600 font-bold tracking-widest uppercase text-xs mb-1">Application Tracker</p>
                        <h1 className="text-2xl md:text-3xl font-black text-secondary-900 mb-1">{application.jobPosting?.title}</h1>
                        <p className="text-sm text-secondary-500 mb-8">
                            {application.applicantName} · applied on {new Date(application.createdAt).toLocaleDateString()}
                        </p>

                        {terminal ? (
                            <div className="bg-secondary-50 border border-secondary-200 rounded-2xl p-6 text-center">
                                <XCircle className="mx-auto mb-3 text-secondary-400" size={36} />
                                <h2 className="text-xl font-black text-secondary-900 mb-2">{terminal.title}</h2>
                                <p className="text-sm text-secondary-500">{terminal.note}</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-primary-50 border border-primary-100 rounded-2xl px-5 py-4 mb-8">
                                    <p className="font-bold text-primary-800">{statusHeadline(application.status)}</p>
                                    {application.examLink && (
                                        <a href={application.examLink} className="inline-block mt-3 btn bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm">
                                            Start Assessment ⚡
                                        </a>
                                    )}
                                </div>

                                <ol className="space-y-0">
                                    {STAGES.map((stage, i) => {
                                        const reached = stage.reached(application.status);
                                        const isCurrent = reached && (i === STAGES.length - 1 || !STAGES[i + 1].reached(application.status));
                                        return (
                                            <li key={stage.label} className="flex gap-4">
                                                <div className="flex flex-col items-center">
                                                    {reached ? (
                                                        isCurrent ? <Clock className="text-primary-600" size={22} /> : <CheckCircle2 className="text-success-500" size={22} />
                                                    ) : (
                                                        <Circle className="text-secondary-200" size={22} />
                                                    )}
                                                    {i < STAGES.length - 1 && (
                                                        <div className={`w-0.5 flex-1 min-h-8 ${reached && !isCurrent ? 'bg-success-300' : 'bg-secondary-100'}`} />
                                                    )}
                                                </div>
                                                <div className="pb-8">
                                                    <p className={`font-bold ${reached ? 'text-secondary-900' : 'text-secondary-400'}`}>{stage.label}</p>
                                                    {isCurrent && <p className="text-xs text-primary-600 font-bold mt-0.5">Current stage</p>}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </>
                        )}

                        <p className="text-[11px] text-secondary-400 mt-6 border-t border-secondary-50 pt-4">
                            Bookmark this page to check your status anytime. Updates appear here as our team progresses your application.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
