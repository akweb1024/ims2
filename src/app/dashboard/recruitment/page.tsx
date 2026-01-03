'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';

export default function RecruitmentDashboard() {
    const router = useRouter();
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [showJobModal, setShowJobModal] = useState(false);
    const [newJobQuestions, setNewJobQuestions] = useState([{ question: '', options: ['', '', '', ''], correctOption: 0 }]);
    const [interviewers, setInterviewers] = useState<any[]>([]);
    const [isScheduling, setIsScheduling] = useState(false);
    const [isOnboarding, setIsOnboarding] = useState(false);
    const [jobs, setJobs] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'PIPELINE' | 'JOBS'>('PIPELINE');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUserRole(JSON.parse(userData).role);
        fetchApplications();
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/recruitment/jobs?all=true', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setJobs(await res.json());
        } catch (err) {
            console.error(err);
        }
    };

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/recruitment/applications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setApplications(await res.json());

            const intRes = await fetch('/api/recruitment/interviews', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (intRes.ok) setInterviewers(await intRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleInterviewAction = async (level: number, result: 'PASSED' | 'FAILED') => {
        const token = localStorage.getItem('token');
        const feedback = prompt(`Enter feedback for Level ${level} interview:`);
        if (feedback === null) return;

        const res = await fetch('/api/recruitment/interviews', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ applicationId: selectedApp.id, level, result, feedback, type: 'COMPLETE' })
        });

        if (res.ok) {
            alert('Interview result recorded');
            setSelectedApp(null);
            fetchApplications();
        }
    };

    const handleScheduleInterview = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);
        const token = localStorage.getItem('token');

        const res = await fetch('/api/recruitment/interviews', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                applicationId: selectedApp.id,
                level: data.level ? parseInt(data.level as string) : (selectedApp.status === 'EXAM_PASSED' ? 1 : parseInt(selectedApp.status.at(-1) || '1')),
                type: 'SCHEDULE',
                scheduledAt: data.scheduledAt,
                interviewerId: data.interviewerId
            })
        });

        if (res.ok) {
            alert('Interview Scheduled!');
            setIsScheduling(false);
            setSelectedApp(null);
            fetchApplications();
        }
    };

    const handleOnboard = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);
        const token = localStorage.getItem('token');

        const res = await fetch('/api/recruitment/onboard', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ applicationId: selectedApp.id, ...data })
        });

        if (res.ok) {
            alert('Applicant onboarded successfully!');
            setIsOnboarding(false);
            setSelectedApp(null);
            fetchApplications();
        }
    };

    const statusBadges: any = {
        'APPLIED': 'badge-secondary',
        'EXAM_PENDING': 'badge-warning',
        'EXAM_PASSED': 'badge-success',
        'EXAM_FAILED': 'badge-danger',
        'INTERVIEW_L1': 'badge-primary',
        'INTERVIEW_L2': 'badge-primary',
        'INTERVIEW_L3': 'badge-primary',
        'SELECTED': 'bg-success-600 text-white',
        'REJECTED': 'badge-danger',
        'ONBOARDED': 'bg-secondary-900 text-white'
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-8">
                        <div>
                            <h1 className="text-3xl font-bold text-secondary-900">Recruitment Dashboard</h1>
                            <p className="text-secondary-600">Master control for hiring campaigns and talent pipelines.</p>
                        </div>
                        <div className="flex bg-secondary-100 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab('PIPELINE')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'PIPELINE' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                            >
                                Applications
                            </button>
                            <button
                                onClick={() => setActiveTab('JOBS')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'JOBS' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                            >
                                Job Postings ({jobs.length})
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowJobModal(true)}
                        className="btn btn-primary px-6 py-3 rounded-xl font-bold flex items-center gap-2"
                    >
                        <span>➕</span> Create New Job
                    </button>
                </div>

                {activeTab === 'JOBS' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {jobs.map(job => (
                            <div key={job.id} className="card-premium p-6 border-l-4 border-primary-500">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`badge ${job.status === 'OPEN' ? 'badge-success' : 'badge-secondary'}`}>{job.status}</span>
                                    <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">{job.type}</span>
                                </div>
                                <h3 className="text-xl font-bold text-secondary-900 mb-1">{job.title}</h3>
                                <p className="text-secondary-500 text-sm mb-4 line-clamp-2">{job.description}</p>
                                <div className="flex justify-between items-center pt-4 border-t border-secondary-50">
                                    <div className="text-xs font-bold text-secondary-400">
                                        {job._count?.applications || 0} APPLICANTS
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Close recruitment for ${job.title}?`)) {
                                                // Handle close logic
                                            }
                                        }}
                                        className="text-primary-600 text-xs font-bold hover:underline"
                                    >
                                        Edit Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="card-premium overflow-hidden">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Candidate</th>
                                    <th>Role Applied</th>
                                    <th>Exam Score</th>
                                    <th>Status</th>
                                    <th>Applied On</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-10">Loading Candidates...</td></tr>
                                ) : applications.map(app => (
                                    <tr key={app.id} className="hover:bg-secondary-50 transition-colors">
                                        <td>
                                            <div className="font-bold text-secondary-900">{app.applicantName}</div>
                                            <div className="text-xs text-secondary-400 font-bold">{app.applicantEmail}</div>
                                        </td>
                                        <td>
                                            <p className="text-xs font-bold text-secondary-600">{app.jobPosting.title}</p>
                                        </td>
                                        <td>
                                            {app.examAttempt ? (
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-black ${app.examAttempt.isPassed ? 'text-success-600' : 'text-danger-600'}`}>
                                                        {app.examAttempt.score.toFixed(0)}%
                                                    </span>
                                                </div>
                                            ) : '--'}
                                        </td>
                                        <td>
                                            <span className={`badge ${statusBadges[app.status]}`}>{app.status.replace('_', ' ')}</span>
                                        </td>
                                        <td><FormattedDate date={app.createdAt} /></td>
                                        <td className="text-right">
                                            <button
                                                onClick={() => setSelectedApp(app)}
                                                className="btn btn-primary py-1.5 text-xs px-4 rounded-lg"
                                            >
                                                Process
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {showJobModal && (
                    <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl p-10 relative max-h-[90vh] overflow-y-auto">
                            <button onClick={() => setShowJobModal(false)} className="absolute top-6 right-8 text-2xl text-secondary-400">×</button>
                            <h2 className="text-2xl font-bold mb-6">Create New Job Posting</h2>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const data = Object.fromEntries(formData);
                                const examQuestions = newJobQuestions;
                                const token = localStorage.getItem('token');
                                const res = await fetch('/api/recruitment/jobs', {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ ...data, examQuestions })
                                });
                                if (res.ok) {
                                    alert('Job and Exam created!');
                                    setShowJobModal(false);
                                    fetchJobs();
                                }
                            }} className="space-y-4">
                                <div>
                                    <label className="label">Job Title</label>
                                    <input name="title" className="input" required placeholder="Sales Manager" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Type</label>
                                        <select name="type" className="input">
                                            <option value="FULL_TIME">Full Time</option>
                                            <option value="CONTRACT">Contract</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Salary Range</label>
                                        <input name="salaryRange" className="input" placeholder="8-12 LPA" />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Description</label>
                                    <textarea name="description" className="input h-24" required></textarea>
                                </div>
                                <div>
                                    <label className="label text-xs uppercase tracking-widest text-secondary-400 font-bold mb-3">Entrance Exam (MCQs)</label>
                                    <div className="space-y-6">
                                        {newJobQuestions.map((q, idx) => (
                                            <div key={idx} className="bg-secondary-50 p-6 rounded-2xl border border-secondary-100 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-primary-600">Question {idx + 1}</span>
                                                    {newJobQuestions.length > 1 && (
                                                        <button type="button" onClick={() => setNewJobQuestions(prev => prev.filter((_, i) => i !== idx))} className="text-danger-500 text-xs font-bold">Remove</button>
                                                    )}
                                                </div>
                                                <input
                                                    value={q.question}
                                                    onChange={(e) => {
                                                        const next = [...newJobQuestions];
                                                        next[idx].question = e.target.value;
                                                        setNewJobQuestions(next);
                                                    }}
                                                    className="input" placeholder="e.g. What is our primary service?" required
                                                />
                                                <div className="grid grid-cols-2 gap-3">
                                                    {q.options.map((opt, optIdx) => (
                                                        <div key={optIdx} className="flex items-center gap-2">
                                                            <input type="radio" checked={q.correctOption === optIdx} onChange={() => {
                                                                const next = [...newJobQuestions];
                                                                next[idx].correctOption = optIdx;
                                                                setNewJobQuestions(next);
                                                            }} />
                                                            <input
                                                                value={opt}
                                                                onChange={(e) => {
                                                                    const next = [...newJobQuestions];
                                                                    next[idx].options[optIdx] = e.target.value;
                                                                    setNewJobQuestions(next);
                                                                }}
                                                                className="input py-2 text-sm" placeholder={`Option ${optIdx + 1}`} required
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setNewJobQuestions([...newJobQuestions, { question: '', options: ['', '', '', ''], correctOption: 0 }])}
                                            className="w-full py-3 border-2 border-dashed border-secondary-200 rounded-xl text-secondary-500 font-bold text-sm hover:border-primary-300 hover:text-primary-600 transition-all"
                                        >
                                            + Add Another Question
                                        </button>
                                    </div>
                                </div>
                                <button type="submit" className="btn btn-primary w-full py-4 rounded-xl font-bold mt-8 shadow-xl shadow-primary-200">Launch Recruitment Campaign</button>
                            </form>
                        </div>
                    </div>
                )}

                {selectedApp && (
                    <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16"></div>
                            <button onClick={() => setSelectedApp(null)} className="absolute top-6 right-8 text-2xl text-secondary-400">×</button>

                            <div className="relative z-10">
                                <h2 className="text-3xl font-bold text-secondary-900 mb-1">{selectedApp.applicantName}</h2>
                                <p className="text-primary-600 font-bold text-sm tracking-widest uppercase mb-8">Ref: {selectedApp.id.slice(0, 8)}</p>

                                <div className="grid grid-cols-2 gap-8 mb-10">
                                    <div className="bg-secondary-50 p-6 rounded-2xl border border-secondary-100">
                                        <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-[0.2em] mb-2">Current Stage</p>
                                        <p className="text-xl font-black text-secondary-900">{selectedApp.status.replace('_', ' ')}</p>
                                    </div>
                                    <div className="bg-secondary-50 p-6 rounded-2xl border border-secondary-100">
                                        <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-[0.2em] mb-2">Exam Result</p>
                                        <p className={`text-xl font-black ${selectedApp.examAttempt?.isPassed ? 'text-success-600' : 'text-danger-600'}`}>
                                            {selectedApp.examAttempt?.score.toFixed(1)}% ({selectedApp.examAttempt?.isPassed ? 'PASSED' : 'FAILED'})
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="font-bold text-secondary-900 uppercase tracking-widest text-xs border-b border-secondary-100 pb-2">Available Actions</h3>

                                    <div className="flex flex-wrap gap-4">
                                        {selectedApp.status === 'EXAM_PASSED' && !isScheduling && (
                                            <div className="w-full space-y-4">
                                                <p className="text-sm text-secondary-500 font-medium">Qualified candidate. Schedule their first behavioral interview.</p>
                                                <button onClick={() => setIsScheduling(true)} className="btn btn-primary w-full py-4 rounded-xl font-bold">Schedule Level 1 Interview</button>
                                            </div>
                                        )}

                                        {selectedApp.status.includes('INTERVIEW_L') && !isScheduling && (
                                            <div className="w-full space-y-6">
                                                <div className="bg-primary-50 p-4 rounded-2xl border border-primary-100 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">Next Scheduled</p>
                                                        <p className="text-sm font-bold text-secondary-900">
                                                            {selectedApp.interviews?.find((i: any) => i.status === 'SCHEDULED' && i.level === parseInt(selectedApp.status.at(-1) || '1'))?.scheduledAt
                                                                ? new Date(selectedApp.interviews.find((i: any) => i.status === 'SCHEDULED' && i.level === parseInt(selectedApp.status.at(-1) || '1')).scheduledAt).toLocaleString()
                                                                : 'Not yet scheduled'}
                                                        </p>
                                                    </div>
                                                    <button onClick={() => setIsScheduling(true)} className="text-primary-600 text-xs font-bold hover:underline">Reschedule</button>
                                                </div>

                                                <div className="space-y-3">
                                                    <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest text-center">Record Level {selectedApp.status.at(-1)} Result</p>
                                                    <div className="flex gap-4">
                                                        <button
                                                            onClick={() => handleInterviewAction(parseInt(selectedApp.status.at(-1) || '1'), 'PASSED')}
                                                            className="btn btn-primary flex-1 py-3 rounded-xl font-bold"
                                                        >
                                                            Pass Round
                                                        </button>
                                                        <button
                                                            onClick={() => handleInterviewAction(parseInt(selectedApp.status.at(-1) || '1'), 'FAILED')}
                                                            className="btn bg-danger-600 text-white hover:bg-danger-700 flex-1 py-3 rounded-xl font-bold"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {isScheduling && (
                                            <form onSubmit={handleScheduleInterview} className="w-full space-y-4 bg-secondary-50 p-6 rounded-3xl border border-secondary-200">
                                                <h4 className="font-bold text-secondary-900">Schedule Round</h4>
                                                <input type="hidden" name="level" value={selectedApp.status === 'EXAM_PASSED' ? 1 : selectedApp.status.at(-1)} />
                                                <div>
                                                    <label className="label text-[10px]">Interviewer</label>
                                                    <select name="interviewerId" className="input text-sm" required>
                                                        <option value="">Select Interviewer</option>
                                                        {interviewers.map(i => (
                                                            <option key={i.id} value={i.id}>{i.email} ({i.role})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="label text-[10px]">Date & Time</label>
                                                    <input type="datetime-local" name="scheduledAt" className="input text-sm" required />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button type="submit" className="btn btn-primary flex-1 py-3 rounded-xl font-bold">Confirm Schedule</button>
                                                    <button type="button" onClick={() => setIsScheduling(false)} className="btn btn-secondary py-3 px-4 rounded-xl font-bold">Back</button>
                                                </div>
                                            </form>
                                        )}

                                        {selectedApp.status === 'SELECTED' && !isOnboarding && (
                                            <div className="w-full bg-success-50 p-6 rounded-3xl border border-success-200">
                                                <p className="text-success-800 font-bold mb-4 flex items-center gap-2"><span>🎉</span> All rounds cleared. Candidate is ready for final onboarding.</p>
                                                <button
                                                    onClick={() => setIsOnboarding(true)}
                                                    className="btn bg-secondary-900 text-white hover:bg-secondary-800 w-full py-4 rounded-2xl font-black text-lg shadow-xl"
                                                >
                                                    Start Onboarding Process
                                                </button>
                                            </div>
                                        )}

                                        {isOnboarding && (
                                            <form onSubmit={handleOnboard} className="w-full space-y-4 bg-primary-50 p-8 rounded-[2rem] border border-primary-100">
                                                <h4 className="text-lg font-bold text-secondary-900 border-b border-primary-200 pb-2">Final Appointment</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="label text-[10px]">Official Role</label>
                                                        <select name="role" className="input text-sm" defaultValue="SALES_EXECUTIVE">
                                                            <option value="SALES_EXECUTIVE">Sales Executive</option>
                                                            <option value="MANAGER">Manager</option>
                                                            <option value="ADMIN">Admin</option>
                                                            <option value="FINANCE_ADMIN">Finance Admin</option>
                                                            <option value="TEAM_LEADER">Team Leader</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="label text-[10px]">Title/Designation</label>
                                                        <input name="designation" className="input text-sm" defaultValue={selectedApp.jobPosting.title} required />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="label text-[10px]">Offer Letter URL (Hosted)</label>
                                                    <input name="offerLetterUrl" className="input text-sm" placeholder="https://..." />
                                                </div>
                                                <div>
                                                    <label className="label text-[10px]">Contract/Agreement URL</label>
                                                    <input name="contractUrl" className="input text-sm" placeholder="https://..." />
                                                </div>
                                                <div className="flex gap-2 pt-4">
                                                    <button type="submit" className="btn btn-primary flex-1 py-4 rounded-xl font-bold">Finalize & Hire</button>
                                                    <button type="button" onClick={() => setIsOnboarding(false)} className="btn btn-secondary py-4 px-6 rounded-xl font-bold">Cancel</button>
                                                </div>
                                            </form>
                                        )}

                                        {selectedApp.status === 'ONBOARDED' && (
                                            <div className="w-full bg-secondary-900 p-8 rounded-[2rem] text-center space-y-4">
                                                <div className="text-4xl">👔</div>
                                                <h3 className="text-white font-black text-xl">Onboarding Complete</h3>
                                                <p className="text-secondary-400 text-sm">Candidate is now a full-time employee. Their profile has been created in HR Management.</p>
                                                <button
                                                    onClick={() => router.push('/dashboard/hr-management')}
                                                    className="btn btn-primary w-full py-3 rounded-xl font-bold"
                                                >
                                                    View in HR Directory
                                                </button>
                                            </div>
                                        )}

                                        {selectedApp.status === 'REJECTED' && (
                                            <p className="text-danger-600 font-bold bg-danger-50 w-full p-4 rounded-xl text-center">Candidate has been rejected.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
