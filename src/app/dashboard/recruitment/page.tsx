'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import {
    Briefcase,
    Calendar,
    CheckCircle,
    ChevronRight,
    Clock,
    Copy,
    ExternalLink,
    FileText,
    Filter,
    LayoutGrid,
    LayoutList,
    MoreHorizontal,
    Plus,
    Search,
    Trash2,
    User,
    UserPlus,
    X,
    Users,
    GraduationCap
} from 'lucide-react';

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
    const [companies, setCompanies] = useState<any[]>([]);
    const [jobs, setJobs] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'PIPELINE' | 'JOBS'>('PIPELINE');
    const [pipelineView, setPipelineView] = useState<'TABLE' | 'KANBAN'>('KANBAN');
    const [resultForm, setResultForm] = useState<{ show: boolean, level: number, result: 'PASSED' | 'FAILED', score: number, feedback: string } | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUserRole(JSON.parse(userData).role);
        fetchApplications();
        fetchJobs();
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/companies', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCompanies(Array.isArray(data) ? data : data.data || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

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

    const submitInterviewResult = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resultForm) return;

        const token = localStorage.getItem('token');
        const res = await fetch('/api/recruitment/interviews', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                applicationId: selectedApp.id,
                level: resultForm.level,
                result: resultForm.result,
                feedback: resultForm.feedback,
                score: resultForm.score,
                type: 'COMPLETE'
            })
        });

        if (res.ok) {
            alert('Interview result recorded successfully!');
            setResultForm(null);
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

    const statusConfig: any = {
        'APPLIED': { label: 'Applied', color: 'bg-slate-100 text-slate-700 border-slate-200' },
        'EXAM_PENDING': { label: 'Exam Pending', color: 'bg-amber-100 text-amber-700 border-amber-200' },
        'EXAM_PASSED': { label: 'Exam Passed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        'EXAM_FAILED': { label: 'Exam Failed', color: 'bg-rose-100 text-rose-700 border-rose-200' },
        'INTERVIEW_L1': { label: 'Interview L1', color: 'bg-blue-100 text-blue-700 border-blue-200' },
        'INTERVIEW_L2': { label: 'Interview L2', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
        'INTERVIEW_L3': { label: 'Interview L3', color: 'bg-violet-100 text-violet-700 border-violet-200' },
        'SELECTED': { label: 'Selected', color: 'bg-teal-600 text-white border-teal-600' },
        'REJECTED': { label: 'Rejected', color: 'bg-rose-50 text-rose-500 border-rose-100' },
        'ONBOARDED': { label: 'Onboarded', color: 'bg-slate-900 text-white border-slate-900' }
    };

    const getStatusBadge = (status: string) => {
        const config = statusConfig[status] || statusConfig['APPLIED'];
        return (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${config.color}`}>
                {config.label}
            </span>
        );
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-8 max-w-[1600px] mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 flex items-center gap-3">
                            <Users size={32} className="text-primary-600" />
                            Recruitment Hub
                        </h1>
                        <p className="text-secondary-500 mt-2 font-medium">Manage talent acquisition, interviews, and onboarding.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-white p-1 rounded-xl shadow-sm border border-secondary-200 flex">
                            <button
                                onClick={() => setActiveTab('PIPELINE')}
                                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'PIPELINE' ? 'bg-secondary-900 text-white shadow-md' : 'text-secondary-500 hover:text-secondary-900 hover:bg-secondary-50'}`}
                            >
                                <LayoutList size={16} />
                                Pipeline
                            </button>
                            <button
                                onClick={() => setActiveTab('JOBS')}
                                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'JOBS' ? 'bg-secondary-900 text-white shadow-md' : 'text-secondary-500 hover:text-secondary-900 hover:bg-secondary-50'}`}
                            >
                                <Briefcase size={16} />
                                Jobs ({jobs.length})
                            </button>
                        </div>

                        <button
                            onClick={() => setShowJobModal(true)}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary-600/20 active:translate-y-0.5"
                        >
                            <Plus size={20} />
                            Create Job
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'PIPELINE' && (
                        <div className="space-y-6">
                            {/* Toolbar */}
                            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-secondary-200 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                                        <input type="text" placeholder="Search candidates..." className="pl-10 pr-4 py-2 bg-secondary-50 border border-secondary-200 rounded-lg text-sm font-medium text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 w-64" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPipelineView('TABLE')}
                                        className={`p-2 rounded-lg transition-colors ${pipelineView === 'TABLE' ? 'bg-secondary-100 text-secondary-900' : 'text-secondary-400 hover:bg-secondary-50'}`}
                                        title="List View"
                                    >
                                        <LayoutList size={20} />
                                    </button>
                                    <button
                                        onClick={() => setPipelineView('KANBAN')}
                                        className={`p-2 rounded-lg transition-colors ${pipelineView === 'KANBAN' ? 'bg-secondary-100 text-secondary-900' : 'text-secondary-400 hover:bg-secondary-50'}`}
                                        title="Board View"
                                    >
                                        <LayoutGrid size={20} />
                                    </button>
                                </div>
                            </div>

                            {pipelineView === 'TABLE' ? (
                                <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-secondary-50 border-b border-secondary-100">
                                                <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Candidate</th>
                                                <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Role</th>
                                                <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Exam Score</th>
                                                <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Stage</th>
                                                <th className="px-6 py-4 text-xs font-bold text-secondary-500 uppercase tracking-wider">Applied</th>
                                                <th className="px-6 py-4 text-right text-xs font-bold text-secondary-500 uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-secondary-100">
                                            {loading ? (
                                                <tr><td colSpan={6} className="text-center py-10 text-secondary-500">Loading pipeline...</td></tr>
                                            ) : applications.map(app => (
                                                <tr key={app.id} className="hover:bg-secondary-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div>
                                                            <div className="font-bold text-secondary-900">{app.applicantName}</div>
                                                            <div className="text-xs text-secondary-500 flex items-center gap-1 mt-0.5">
                                                                <User size={10} /> {app.applicantEmail}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-secondary-700">{app.jobPosting.title}</td>
                                                    <td className="px-6 py-4">
                                                        {app.examAttempt ? (
                                                            <span className={`font-black ${app.examAttempt.isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                {app.examAttempt.score.toFixed(0)}%
                                                            </span>
                                                        ) : <span className="text-secondary-300">--</span>}
                                                    </td>
                                                    <td className="px-6 py-4">{getStatusBadge(app.status)}</td>
                                                    <td className="px-6 py-4 text-sm text-secondary-500"><FormattedDate date={app.createdAt} /></td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => setSelectedApp(app)}
                                                            className="text-primary-600 hover:text-primary-700 font-bold text-sm tracking-wide"
                                                        >
                                                            Manage
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 h-[calc(100vh-300px)]">
                                    {['APPLIED', 'EXAM_PENDING', 'EXAM_PASSED', 'INTERVIEW_L1', 'INTERVIEW_L2', 'INTERVIEW_L3', 'SELECTED', 'ONBOARDED'].map(status => (
                                        <div key={status} className="flex-shrink-0 w-80 flex flex-col h-full">
                                            <div className="flex items-center justify-between mb-4 sticky top-0 px-1">
                                                <h3 className="text-xs font-black text-secondary-400 uppercase tracking-widest flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${statusConfig[status]?.color?.split(' ')[0] || 'bg-secondary-300'}`}></span>
                                                    {status.replace('_', ' ')}
                                                </h3>
                                                <span className="bg-white border border-secondary-200 text-secondary-600 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                                    {applications.filter(a => a.status === status).length}
                                                </span>
                                            </div>

                                            <div className="flex-1 bg-secondary-50/50 rounded-2xl p-3 space-y-3 overflow-y-auto border border-secondary-200 scrollbar-hide">
                                                {applications.filter(a => a.status === status).map(app => (
                                                    <div
                                                        key={app.id}
                                                        onClick={() => setSelectedApp(app)}
                                                        className="bg-white p-4 rounded-xl border border-secondary-200 shadow-sm cursor-pointer hover:border-primary-400 hover:shadow-md hover:-translate-y-1 transition-all group relative"
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded uppercase tracking-wide truncate max-w-[120px]">
                                                                {app.jobPosting.title}
                                                            </span>
                                                            {app.examAttempt && (
                                                                <span className={`text-[10px] font-black ${app.examAttempt.isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                    {app.examAttempt.score.toFixed(0)}%
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="font-bold text-secondary-900 group-hover:text-primary-700 transition-colors">{app.applicantName}</div>
                                                        <div className="text-xs text-secondary-400 mt-1 flex items-center gap-1">
                                                            <Clock size={10} /> <FormattedDate date={app.createdAt} />
                                                        </div>

                                                        <div className="mt-3 pt-3 border-t border-secondary-50 flex justify-end">
                                                            <span className="text-[10px] font-bold text-secondary-300 uppercase tracking-wider group-hover:text-primary-600 flex items-center gap-1 transition-colors">
                                                                View Details <ChevronRight size={12} />
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {applications.filter(a => a.status === status).length === 0 && (
                                                    <div className="text-center py-10 opacity-30">
                                                        <div className="text-4xl mb-2">🍃</div>
                                                        <p className="text-xs font-bold text-secondary-500 uppercase">Empty</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'JOBS' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {jobs.map(job => (
                                <div key={job.id} className="group bg-white rounded-2xl border border-secondary-200 p-6 hover:shadow-xl hover:border-primary-200 transition-all duration-300 relative overflow-hidden flex flex-col h-full">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary-500 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${job.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-secondary-100 text-secondary-600'}`}>
                                            {job.status}
                                        </span>
                                        <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest bg-secondary-50 px-2 py-1 rounded">{job.type.replace('_', ' ')}</span>
                                    </div>

                                    <h3 className="text-xl font-bold text-secondary-900 mb-2 group-hover:text-primary-700 transition-colors">{job.title}</h3>
                                    <p className="text-secondary-500 text-sm mb-6 line-clamp-2 flex-grow">{job.description}</p>

                                    <div className="flex justify-between items-center pt-4 border-t border-secondary-50">
                                        <div className="text-xs font-bold text-secondary-500 flex items-center gap-1">
                                            <Users size={14} className="text-primary-500" />
                                            {job._count?.applications || 0} Applicants
                                        </div>
                                    </div>

                                    <div className="mt-4 flex gap-2">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/careers?jobId=${job.id}`);
                                                alert('Public Job Link Copied!');
                                            }}
                                            className="flex-1 py-2 rounded-lg bg-secondary-50 text-secondary-600 text-xs font-bold uppercase tracking-wide hover:bg-secondary-100 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Copy size={12} /> Copy Link
                                        </button>
                                        <a
                                            href={`/careers`}
                                            target="_blank"
                                            className="flex-1 py-2 rounded-lg bg-primary-50 text-primary-600 text-xs font-bold uppercase tracking-wide hover:bg-primary-100 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <ExternalLink size={12} /> View
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Create Job Modal */}
                {showJobModal && (
                    <div className="fixed inset-0 bg-secondary-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl p-0 relative max-h-[90vh] overflow-y-auto overflow-x-hidden flex flex-col">
                            <div className="sticky top-0 bg-white/90 backdrop-blur-md z-20 p-8 border-b border-secondary-100 flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-black text-secondary-900">Create Position</h2>
                                    <p className="text-sm text-secondary-500">Launch a new recruitment campaign</p>
                                </div>
                                <button onClick={() => setShowJobModal(false)} className="w-10 h-10 rounded-full bg-secondary-50 hover:bg-secondary-100 flex items-center justify-center text-secondary-500 hover:text-secondary-900 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

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
                            }} className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="label-premium">Company</label>
                                        <select name="companyId" className="input-premium" required>
                                            <option value="">Select Organization</option>
                                            {companies.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label-premium">Job Title</label>
                                        <input name="title" className="input-premium" required placeholder="e.g. Senior Sales Manager" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="label-premium">Employment Type</label>
                                        <select name="type" className="input-premium">
                                            <option value="FULL_TIME">Full Time</option>
                                            <option value="CONTRACT">Contract</option>
                                            <option value="INTERNSHIP">Internship</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label-premium">Annual Salary Range</label>
                                        <input name="salaryRange" className="input-premium" placeholder="e.g. 10 - 15 LPA" />
                                    </div>
                                </div>

                                <div>
                                    <label className="label-premium">Job Description</label>
                                    <textarea name="description" className="input-premium min-h-[120px]" required placeholder="Describe the role responsibilities..."></textarea>
                                </div>

                                <div className="border-t border-secondary-100 pt-6">
                                    <label className="label-premium text-primary-600 mb-4 flex items-center gap-2">
                                        <GraduationCap size={18} />
                                        Screening Assessment (MCQs)
                                    </label>
                                    <div className="space-y-6">
                                        {newJobQuestions.map((q, idx) => (
                                            <div key={idx} className="bg-secondary-50 p-6 rounded-2xl border border-secondary-100 space-y-4 relative group">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-bold text-secondary-400 uppercase tracking-wider">Question {idx + 1}</span>
                                                    {newJobQuestions.length > 1 && (
                                                        <button type="button" onClick={() => setNewJobQuestions(prev => prev.filter((_, i) => i !== idx))} className="text-rose-500 hover:text-rose-700 transition-colors p-1">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                                <input
                                                    value={q.question}
                                                    onChange={(e) => {
                                                        const next = [...newJobQuestions];
                                                        next[idx].question = e.target.value;
                                                        setNewJobQuestions(next);
                                                    }}
                                                    className="input-premium bg-white" placeholder="Enter question text..." required
                                                />
                                                <div className="grid grid-cols-2 gap-4">
                                                    {q.options.map((opt, optIdx) => (
                                                        <div key={optIdx} className="flex items-center gap-3">
                                                            <div className="flex items-center justify-center w-8">
                                                                <input
                                                                    type="radio"
                                                                    name={`q-${idx}`}
                                                                    checked={q.correctOption === optIdx}
                                                                    onChange={() => {
                                                                        const next = [...newJobQuestions];
                                                                        next[idx].correctOption = optIdx;
                                                                        setNewJobQuestions(next);
                                                                    }}
                                                                    className="w-5 h-5 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                                />
                                                            </div>
                                                            <input
                                                                value={opt}
                                                                onChange={(e) => {
                                                                    const next = [...newJobQuestions];
                                                                    next[idx].options[optIdx] = e.target.value;
                                                                    setNewJobQuestions(next);
                                                                }}
                                                                className="input-premium py-2 text-sm bg-white" placeholder={`Option ${optIdx + 1}`} required
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setNewJobQuestions([...newJobQuestions, { question: '', options: ['', '', '', ''], correctOption: 0 }])}
                                            className="w-full py-4 border-2 border-dashed border-secondary-200 rounded-xl text-secondary-500 font-bold text-sm hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus size={18} /> Add Another Question
                                        </button>
                                    </div>
                                </div>
                                <div className="sticky bottom-0 pt-4 bg-white z-10">
                                    <button type="submit" className="btn btn-primary w-full py-4 rounded-xl font-bold shadow-lg shadow-primary-200 text-lg">Launch Campaign</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Candidate Process Modal */}
                {selectedApp && (
                    <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl p-0 relative max-h-[90vh] overflow-y-auto flex flex-col md:flex-row overflow-hidden">

                            {/* Left Side: Candidate Info */}
                            <div className="w-full md:w-1/3 bg-secondary-900 text-white p-10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20"></div>
                                <button onClick={() => setSelectedApp(null)} className="absolute top-6 right-6 md:hidden text-white/60 hover:text-white"><X size={24} /></button>

                                <div className="relative z-10 space-y-8">
                                    <div>
                                        <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center text-3xl font-black mb-6 shadow-lg shadow-primary-900/50">
                                            {selectedApp.applicantName.charAt(0)}
                                        </div>
                                        <h2 className="text-3xl font-bold mb-2 leading-tight">{selectedApp.applicantName}</h2>
                                        <p className="text-secondary-400 font-medium">{selectedApp.applicantEmail}</p>
                                        <p className="text-secondary-400 font-medium">{selectedApp.applicantPhone}</p>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-secondary-800">
                                        <div>
                                            <p className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest mb-1">Applying For</p>
                                            <p className="font-bold text-lg">{selectedApp.jobPosting.title}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest mb-1">Current Stage</p>
                                            {getStatusBadge(selectedApp.status)}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest mb-1">Exam Performance</p>
                                            <p className={`font-black text-2xl ${selectedApp.examAttempt?.isPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {selectedApp.examAttempt?.score.toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>

                                    {selectedApp.resumeUrl && (
                                        <a href={selectedApp.resumeUrl} target="_blank" className="block w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-center font-bold text-sm transition-colors border border-white/10">
                                            View Resume / Portfolio
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Right Side: Actions */}
                            <div className="w-full md:w-2/3 p-10 bg-white relative overflow-y-auto">
                                <button onClick={() => setSelectedApp(null)} className="absolute top-6 right-6 hidden md:flex w-10 h-10 bg-secondary-100 hover:bg-secondary-200 rounded-full items-center justify-center text-secondary-500 hover:text-secondary-900 transition-colors">
                                    <X size={20} />
                                </button>

                                <div className="max-w-xl mx-auto space-y-8 h-full">
                                    <h3 className="font-bold text-secondary-900 uppercase tracking-widest text-xs border-b border-secondary-100 pb-4 flex items-center gap-2">
                                        <Filter size={14} /> Available Actions
                                    </h3>

                                    <div className="space-y-6">
                                        {/* Exam Passed - Schedule L1 */}
                                        {selectedApp.status === 'EXAM_PASSED' && !isScheduling && (
                                            <div className="bg-primary-50 p-6 rounded-2xl border border-primary-100">
                                                <h4 className="font-bold text-primary-900 mb-2">Qualified for Interview</h4>
                                                <p className="text-sm text-primary-700 mb-6">Candidate passed the screening exam. Schedule the first round.</p>
                                                <button onClick={() => setIsScheduling(true)} className="btn btn-primary w-full py-3 rounded-xl font-bold shadow-lg shadow-primary-200">
                                                    Schedule Level 1 Interview
                                                </button>
                                            </div>
                                        )}

                                        {/* Interviews */}
                                        {selectedApp.status.includes('INTERVIEW_L') && !isScheduling && (
                                            <div className="space-y-6">
                                                {/* Status Card */}
                                                <div className="bg-gradient-to-br from-primary-50 to-white p-6 rounded-2xl border border-primary-100 shadow-sm">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mb-1">Next Scheduled Session</p>
                                                            <p className="text-lg font-bold text-secondary-900 flex items-center gap-2">
                                                                <Calendar size={18} className="text-secondary-400" />
                                                                {selectedApp.interviews?.find((i: any) => i.status === 'SCHEDULED' && i.level === parseInt(selectedApp.status.at(-1) || '1'))?.scheduledAt
                                                                    ? new Date(selectedApp.interviews.find((i: any) => i.status === 'SCHEDULED' && i.level === parseInt(selectedApp.status.at(-1) || '1')).scheduledAt).toLocaleString()
                                                                    : 'Not yet scheduled'}
                                                            </p>
                                                        </div>
                                                        <button onClick={() => setIsScheduling(true)} className="text-primary-600 text-xs font-bold hover:underline">Reschedule</button>
                                                    </div>
                                                </div>

                                                <div className="border-t border-secondary-100 pt-6">
                                                    <h4 className="font-bold text-secondary-900 mb-4 flex items-center gap-2">
                                                        <FileText size={18} className="text-secondary-400" />
                                                        Record Interview Result
                                                    </h4>
                                                    {!resultForm ? (
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <button
                                                                onClick={() => setResultForm({ show: true, level: parseInt(selectedApp.status.at(-1) || '1'), result: 'PASSED', score: 7, feedback: '' })}
                                                                className="btn btn-primary py-4 rounded-xl font-bold border-b-4 border-primary-700 active:border-b-0 active:translate-y-1 transition-all"
                                                            >
                                                                Pass Candidate
                                                            </button>
                                                            <button
                                                                onClick={() => setResultForm({ show: true, level: parseInt(selectedApp.status.at(-1) || '1'), result: 'FAILED', score: 3, feedback: '' })}
                                                                className="btn bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 py-4 rounded-xl font-bold transition-all"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <form onSubmit={submitInterviewResult} className="bg-secondary-50 p-6 rounded-2xl border border-secondary-200 space-y-4 animate-in zoom-in duration-200">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <h4 className={`font-bold ${resultForm.result === 'PASSED' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                    Marking as {resultForm.result}
                                                                </h4>
                                                                <button type="button" onClick={() => setResultForm(null)} className="text-xs text-secondary-400 font-bold hover:text-secondary-600">Cancel</button>
                                                            </div>
                                                            <div>
                                                                <label className="label-premium">Candidate Score (1-10)</label>
                                                                <div className="flex items-center gap-4">
                                                                    <input
                                                                        type="range" min="1" max="10" step="1"
                                                                        className="flex-1 accent-primary-600 cursor-pointer h-2 bg-secondary-200 rounded-lg appearance-none"
                                                                        value={resultForm.score}
                                                                        onChange={(e) => setResultForm({ ...resultForm, score: parseInt(e.target.value) })}
                                                                    />
                                                                    <span className="font-black text-xl text-primary-600 w-10 text-center bg-white py-1 rounded-lg shadow-sm border border-secondary-100">{resultForm.score}</span>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="label-premium">Interviewer Feedback</label>
                                                                <textarea
                                                                    className="input-premium bg-white min-h-[100px]"
                                                                    placeholder="Key strengths, weaknesses, and remarks..."
                                                                    value={resultForm.feedback}
                                                                    onChange={(e) => setResultForm({ ...resultForm, feedback: e.target.value })}
                                                                    required
                                                                ></textarea>
                                                            </div>
                                                            <button type="submit" className="btn btn-primary w-full py-3 rounded-xl font-bold shadow-lg">
                                                                Submit Evaluation
                                                            </button>
                                                        </form>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Scheduling Form */}
                                        {isScheduling && (
                                            <form onSubmit={handleScheduleInterview} className="space-y-4 bg-white p-6 rounded-2xl border border-secondary-200 shadow-xl relative z-20">
                                                <h4 className="font-bold text-secondary-900 border-b border-secondary-100 pb-2 mb-4">Schedule Interview</h4>
                                                <input type="hidden" name="level" value={selectedApp.status === 'EXAM_PASSED' ? 1 : selectedApp.status.at(-1)} />
                                                <div>
                                                    <label className="label-premium">Interviewer</label>
                                                    <select name="interviewerId" className="input-premium" required>
                                                        <option value="">Select Interviewer</option>
                                                        {interviewers.map(i => (
                                                            <option key={i.id} value={i.id}>{i.email} ({i.role})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="label-premium">Date & Time</label>
                                                    <input type="datetime-local" name="scheduledAt" className="input-premium" required />
                                                </div>
                                                <div className="flex gap-3 pt-2">
                                                    <button type="submit" className="btn btn-primary flex-1 py-3 rounded-xl font-bold">Confirm</button>
                                                    <button type="button" onClick={() => setIsScheduling(false)} className="btn btn-secondary py-3 px-6 rounded-xl font-bold">Cancel</button>
                                                </div>
                                            </form>
                                        )}

                                        {/* Selected / Onboarding */}
                                        {selectedApp.status === 'SELECTED' && !isOnboarding && (
                                            <div className="bg-emerald-50 p-8 rounded-[2rem] border border-emerald-100 text-center space-y-4">
                                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto">🎉</div>
                                                <h3 className="text-xl font-black text-emerald-900">Candidate Selected!</h3>
                                                <p className="text-emerald-700">They have cleared all rounds. Ready to bring them on board?</p>
                                                <button
                                                    onClick={() => setIsOnboarding(true)}
                                                    className="btn bg-emerald-600 hover:bg-emerald-700 text-white w-full py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-200"
                                                >
                                                    Start Onboarding Process
                                                </button>
                                            </div>
                                        )}

                                        {/* Onboarding Form */}
                                        {isOnboarding && (
                                            <form onSubmit={handleOnboard} className="space-y-4 bg-white p-6 rounded-2xl border border-secondary-200 shadow-xl relative z-20">
                                                <h4 className="font-bold text-secondary-900 border-b border-secondary-100 pb-2 mb-4">Final Appointment Details</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="label-premium">Official Role</label>
                                                        <select name="role" className="input-premium" defaultValue="SALES_EXECUTIVE">
                                                            <option value="SALES_EXECUTIVE">Sales Executive</option>
                                                            <option value="MANAGER">Manager</option>
                                                            <option value="ADMIN">Admin</option>
                                                            <option value="FINANCE_ADMIN">Finance Admin</option>
                                                            <option value="TEAM_LEADER">Team Leader</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="label-premium">Designation</label>
                                                        <input name="designation" className="input-premium" defaultValue={selectedApp.jobPosting.title} required />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="label-premium">Assign Company</label>
                                                    <select name="companyId" className="input-premium" defaultValue={selectedApp.jobPosting.companyId}>
                                                        <option value="">Default (Job Posting Company)</option>
                                                        {companies.map(c => (
                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="label-premium">Annual Base Salary (CTC)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-secondary-400">₹</span>
                                                        <input name="baseSalary" type="number" className="input-premium pl-8" placeholder="e.g. 500000" required />
                                                    </div>
                                                </div>

                                                <div className="bg-secondary-900 text-secondary-100 p-4 rounded-xl text-xs space-y-2">
                                                    <p className="font-bold flex items-center gap-2"><div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div> Automated Actions:</p>
                                                    <ul className="list-disc pl-4 space-y-1 text-secondary-300">
                                                        <li>Create Employee Profile & User Account.</li>
                                                        <li>Generate Offer Letter (if template exists).</li>
                                                        <li>Send Welcome Email to candidate.</li>
                                                    </ul>
                                                </div>

                                                <div className="flex gap-2 pt-4">
                                                    <button type="submit" className="btn btn-primary flex-1 py-4 rounded-xl font-bold border-b-4 border-primary-700 active:border-b-0 active:translate-y-1 transition-all">
                                                        🚀 Finalize & Hire
                                                    </button>
                                                    <button type="button" onClick={() => setIsOnboarding(false)} className="btn btn-secondary py-4 px-6 rounded-xl font-bold">Cancel</button>
                                                </div>
                                            </form>
                                        )}

                                        {/* Completed */}
                                        {selectedApp.status === 'ONBOARDED' && (
                                            <div className="w-full bg-secondary-900 text-white p-8 rounded-[2rem] text-center space-y-4">
                                                <div className="text-4xl">👔</div>
                                                <h3 className="font-black text-xl">Onboarding Complete</h3>
                                                <p className="text-secondary-400 text-sm">Candidate is now a full-time employee.</p>
                                                <button
                                                    onClick={() => router.push('/dashboard/hr-management')}
                                                    className="btn bg-white text-secondary-900 hover:bg-secondary-100 w-full py-3 rounded-xl font-bold"
                                                >
                                                    Go to Employee Directory
                                                </button>
                                            </div>
                                        )}

                                        {selectedApp.status === 'REJECTED' && (
                                            <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl text-center">
                                                <p className="text-rose-600 font-bold">This candidate has been rejected.</p>
                                            </div>
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
