'use client';

import { useState, useMemo } from 'react';
import {
    Users, Phone, Mail, FileText,
    Calendar, Star, MoreVertical,
    CheckCircle2, XCircle, Clock,
    Sparkles, Filter, Search,
    ArrowRight, MessageSquare, Plus
} from 'lucide-react';
import CandidateProfileModal from './CandidateProfileModal';
import AddCandidateModal from './AddCandidateModal';
import InterviewScorecardModal from './screening/InterviewScorecardModal';
import { useJobApplications, useJobPostings, useApplicationMutations, useInterviewMutations } from '@/hooks/useRecruitment';
import { useEmployees } from '@/hooks/useHR';

export default function ApplicantPipeline() {
    const [selectedJobId, setSelectedJobId] = useState('');
    const { data: jobs } = useJobPostings({ status: 'OPEN' });
    const { data: rawApplications, isLoading } = useJobApplications(selectedJobId || undefined);
    const { updateStatus, createApplication } = useApplicationMutations();
    const { scheduleInterview } = useInterviewMutations();

    const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
    const [dragOverStage, setDragOverStage] = useState<string | null>(null);
    const [showInterviewModal, setShowInterviewModal] = useState(false);
    const [selectedAppForInterview, setSelectedAppForInterview] = useState<any>(null);
    const [showScorecardModal, setShowScorecardModal] = useState(false);
    const [scorecardInterview, setScorecardInterview] = useState<any>(null);

    // New Features State
    const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
    const [selectedAppForProfile, setSelectedAppForProfile] = useState<any>(null);
    const [interviewData, setInterviewData] = useState({
        interviewerId: '',
        scheduledAt: '',
        type: 'VIRTUAL',
        meetingLink: '',
        roundName: 'HR Round',
        level: 1
    });

    const { data: employees } = useEmployees();

    // Use real applications from API
    const applications = useMemo(() => {
        if (!rawApplications) return [];
        // Sort by AI Match Score (High to Low)
        return [...rawApplications].sort((a, b) => (b.aiMatchScore || 0) - (a.aiMatchScore || 0));
    }, [rawApplications]);

    const stages = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];

    const handleDragStart = (e: React.DragEvent, appId: string) => {
        setDraggedAppId(appId);
        e.dataTransfer.setData('applicationId', appId);
        e.dataTransfer.effectAllowed = 'move';
        // Add ghost image styling if needed, or rely on browser default
    };

    const handleDragOver = (e: React.DragEvent, stage: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverStage !== stage) setDragOverStage(stage);
    };

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        setDragOverStage(null);
        const appId = draggedAppId || e.dataTransfer.getData('applicationId');

        if (appId && newStatus) {
            try {
                await updateStatus.mutateAsync({ id: appId, status: newStatus });
                // Toast or feedback could be added here
            } catch (err) {
                console.error("Failed to update status", err);
            }
            setDraggedAppId(null);
        }
    };

    const handleScheduleInterview = async () => {
        if (!selectedAppForInterview) return;
        await scheduleInterview.mutateAsync({
            applicationId: selectedAppForInterview.id,
            ...interviewData
        });
        setShowInterviewModal(false);
        setInterviewData({ interviewerId: '', scheduledAt: '', type: 'VIRTUAL', meetingLink: '', roundName: 'HR Round', level: 1 });
    };

    const handleCreateApplication = async (data: any) => {
        try {
            await createApplication.mutateAsync(data);
        } catch (err) {
            console.error("Failed to create application", err);
        }
    };

    const getMatchColor = (score: number) => {
        if (score >= 85) return 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-green-200';
        if (score >= 70) return 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-orange-200';
        return 'bg-secondary-100 text-secondary-600';
    };

    // Calculate Metrics
    const metrics = useMemo(() => {
        if (!applications) return { total: 0, interview: 0, offer: 0, hired: 0 };
        return {
            total: applications.length,
            interview: applications.filter(a => (a.status || '').toUpperCase() === 'INTERVIEW').length,
            offer: applications.filter(a => (a.status || '').toUpperCase() === 'OFFER').length,
            hired: applications.filter(a => (a.status || '').toUpperCase() === 'HIRED').length,
        };
    }, [applications]);

    return (
        <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500">
            {/* Header & Metrics */}
            <div className="shrink-0 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            Talent Pipeline <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-bold">AI Enabled</span>
                        </h3>
                        <p className="text-gray-500 font-medium">Smart candidate tracking and automated scheduling.</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative group">
                            <select
                                className="appearance-none bg-white border border-gray-200 rounded-xl py-3 pl-4 pr-10 font-bold text-sm shadow-sm hover:border-purple-300 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-purple-500"
                                value={selectedJobId}
                                onChange={(e) => setSelectedJobId(e.target.value)}
                            >
                                <option value="">All Active Roles</option>
                                {jobs?.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
                        </div>
                        <button
                            onClick={() => setShowAddCandidateModal(true)}
                            className="bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-500/20 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all hover:-translate-y-0.5"
                        >
                            <Plus size={18} />
                            <span>Add Candidate</span>
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Candidates</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">{metrics.total}</p>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl shadow-sm border border-amber-100">
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">In Interview</p>
                        <p className="text-2xl font-black text-amber-700 mt-1">{metrics.interview}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-xl shadow-sm border border-purple-100">
                        <p className="text-xs font-bold text-purple-600 uppercase tracking-widest">Offers Out</p>
                        <p className="text-2xl font-black text-purple-700 mt-1">{metrics.offer}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl shadow-sm border border-green-100">
                        <p className="text-xs font-bold text-green-600 uppercase tracking-widest">Hired</p>
                        <p className="text-2xl font-black text-green-700 mt-1">{metrics.hired}</p>
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                <div className="flex gap-6 min-w-max h-full px-1">
                    {stages.map((stage) => {
                        const stageApps = applications?.filter(a => {
                            const s = (a.status || 'APPLIED').toUpperCase();
                            if (stage === 'SCREENING') {
                                return s === 'SCREENING' || s === 'EXAM_PENDING' || s === 'EXAM_COMPLETED';
                            }
                            return s === stage;
                        }) || [];

                        return (
                            <div
                                key={stage}
                                className={`w-80 flex flex-col gap-4 transition-colors rounded-xl p-2 ${dragOverStage === stage ? 'bg-primary-50/50 ring-2 ring-primary-200' : ''}`}
                                onDragOver={(e) => handleDragOver(e, stage)}
                                onDragLeave={() => setDragOverStage(null)}
                                onDrop={(e) => handleDrop(e, stage)}
                            >
                                {/* Column Header */}
                                <div className={`flex items-center justify-between sticky top-0 backdrop-blur-md p-3 rounded-xl border mb-2 z-10 
                                    ${stage === 'HIRED' ? 'bg-green-50/80 border-green-100' :
                                        stage === 'REJECTED' ? 'bg-red-50/80 border-red-100' :
                                            'bg-gray-50/80 border-gray-100'}`}>
                                    <h4 className={`font-black text-xs uppercase tracking-widest 
                                        ${stage === 'HIRED' ? 'text-green-700' :
                                            stage === 'REJECTED' ? 'text-red-700' :
                                                'text-gray-500'}`}>
                                        {stage}
                                    </h4>
                                    <span className="bg-white px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm">{stageApps.length}</span>
                                </div>

                                {/* Cards Container */}
                                <div className="flex flex-col gap-3 h-full pb-10 min-h-[100px]">
                                    {stageApps.map((app) => (
                                        <div
                                            key={app.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, app.id)}
                                            onClick={() => setSelectedAppForProfile(app)}
                                            className="group bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-lg hover:border-purple-200 cursor-move transition-all active:scale-95 relative overflow-hidden"
                                        >
                                            {/* AI Match Strip */}
                                            {stage !== 'REJECTED' && (
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 ${getMatchColor(app.aiMatchScore)}`}>
                                                        <Sparkles size={10} fill="currentColor" />
                                                        {app.aiMatchScore}% Match
                                                    </span>
                                                    {app.createdAt && (
                                                        <span className="text-[10px] text-gray-400">
                                                            {new Date(app.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex justify-between items-start mb-1">
                                                <h5 className="font-bold text-gray-900 line-clamp-1">
                                                    {app.applicantName}
                                                    {(app.status || '').toUpperCase() !== stage && (
                                                        <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded ml-2 align-middle uppercase">
                                                            {(app.status || '').replace(/_/g, ' ')}
                                                        </span>
                                                    )}
                                                </h5>
                                            </div>
                                            <p className="text-xs text-secondary-500 mb-3 line-clamp-1 font-medium">{app.jobPosting?.title || 'Unknown Role'}</p>

                                            {/* Skills Tags */}
                                            <div className="flex flex-wrap gap-1 mb-4">
                                                {app.aiTags?.map((tag: string, i: number) => (
                                                    <span key={i} className="text-[10px] bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded border border-gray-100">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Actions Footer */}
                                            <div className="pt-3 border-t border-gray-50 flex justify-between items-center relative z-10">
                                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                    {app.resumeUrl && (
                                                        <a href={app.resumeUrl} target="_blank" className="p-1.5 rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-colors" title="Resume" onClick={(e) => e.stopPropagation()}>
                                                            <FileText size={14} />
                                                        </a>
                                                    )}
                                                    <a href={`mailto:${app.applicantEmail}`} className="p-1.5 rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-colors" title="Email" onClick={(e) => e.stopPropagation()}>
                                                        <Mail size={14} />
                                                    </a>
                                                </div>

                                                {stage !== 'REJECTED' && stage !== 'HIRED' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setSelectedAppForInterview(app); setShowInterviewModal(true); }}
                                                        className="flex items-center gap-1 text-[10px] font-bold text-purple-600 uppercase hover:bg-purple-50 px-2 py-1 rounded transition-colors"
                                                    >
                                                        Schedule <ArrowRight size={10} />
                                                    </button>
                                                )}

                                                {stage === 'INTERVIEW' && app.interviews?.[0] && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setScorecardInterview(app.interviews[0]); setShowScorecardModal(true); }}
                                                        className="flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase hover:bg-amber-50 px-2 py-1 rounded transition-colors ml-2"
                                                    >
                                                        <MessageSquare size={10} /> Scorecard
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {stageApps.length === 0 && (
                                        <div className="h-32 rounded-xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-300 gap-2">
                                            <div className="h-8 w-8 bg-gray-50 rounded-full flex items-center justify-center">
                                                <Users size={14} />
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest">No Candidates</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Scorecard Modal */}
            {showScorecardModal && scorecardInterview && (
                <InterviewScorecardModal
                    interview={{...scorecardInterview, application: applications?.find(a => a.id === scorecardInterview.applicationId) || {}}} 
                    onClose={() => { setShowScorecardModal(false); setScorecardInterview(null); }}
                />
            )}

            {/* Schedule Interview Modal */}
            {showInterviewModal && selectedAppForInterview && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-gray-900">Schedule Interview</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Candidate: <span className="font-bold text-gray-700">{selectedAppForInterview.applicantName}</span></p>
                            </div>
                            <button onClick={() => setShowInterviewModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <XCircle className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Interviewer</label>
                                <select
                                    className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                    value={interviewData.interviewerId}
                                    onChange={(e) => setInterviewData({ ...interviewData, interviewerId: e.target.value })}
                                >
                                    <option value="">Select Interviewer</option>
                                    {employees?.filter(e => e.userId).map(e => (
                                        <option key={e.userId} value={e.userId}>{(e.user as any)?.name || e.employeeId}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                        value={interviewData.scheduledAt}
                                        onChange={(e) => setInterviewData({ ...interviewData, scheduledAt: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Type</label>
                                    <select
                                        className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                        value={interviewData.type}
                                        onChange={(e) => setInterviewData({ ...interviewData, type: e.target.value })}
                                    >
                                        <option value="VIRTUAL">Virtual (Zoom/Meet)</option>
                                        <option value="IN_PERSON">In Person</option>
                                        <option value="PHONE">Phone Screen</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Interview Round</label>
                                <select
                                    className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                    value={interviewData.roundName}
                                    onChange={(e) => setInterviewData({ ...interviewData, roundName: e.target.value, level: e.target.value === 'HR Round' ? 1 : e.target.value === 'Departmental Round' ? 2 : 3 })}
                                >
                                    <option value="HR Round">HR Round (Initial Screening)</option>
                                    <option value="Departmental Round">Departmental Round (Technical)</option>
                                    <option value="Final Round">Final Round (Leadership/Cultural)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Meeting Link / Location</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <input
                                        className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 pl-10 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                        placeholder="https://meet.google.com/..."
                                        value={interviewData.meetingLink}
                                        onChange={(e) => setInterviewData({ ...interviewData, meetingLink: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleScheduleInterview}
                                disabled={!interviewData.interviewerId || !interviewData.scheduledAt}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-purple-200 mt-2 disabled:opacity-50 disabled:shadow-none transition-all"
                            >
                                Send Invitation
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Candidate Profile Modal */}
            {selectedAppForProfile && (
                <CandidateProfileModal
                    application={selectedAppForProfile}
                    onClose={() => setSelectedAppForProfile(null)}
                    onSchedule={(app: any) => {
                        setSelectedAppForProfile(null); // Close profile modal
                        setSelectedAppForInterview(app); // Set app for interview modal
                        setShowInterviewModal(true); // Open interview modal
                    }}
                    onUpdateApplication={updateStatus.mutateAsync}
                />
            )}

            {/* Add Candidate Modal */}
            {showAddCandidateModal && (
                <AddCandidateModal
                    jobs={jobs || []}
                    onClose={() => setShowAddCandidateModal(false)}
                    onSubmit={handleCreateApplication}
                />
            )}
        </div>
    );
}
