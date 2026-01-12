'use client';

import { useState } from 'react';
import {
    Users, Phone, Mail, FileText,
    Calendar, Star, MoreVertical,
    CheckCircle2, XCircle, Clock
} from 'lucide-react';
import { useJobApplications, useJobPostings, useApplicationMutations, useInterviewMutations } from '@/hooks/useRecruitment';
import { useEmployees } from '@/hooks/useHR'; // To get potential interviewers (users)

export default function ApplicantPipeline() {
    const [selectedJobId, setSelectedJobId] = useState('');
    const { data: jobs } = useJobPostings({ status: 'OPEN' });
    const { data: applications, isLoading } = useJobApplications(selectedJobId || undefined);
    const { updateStatus } = useApplicationMutations();
    const { scheduleInterview } = useInterviewMutations();

    const [draggedAppId, setDraggedAppId] = useState<string | null>(null);

    // Interview Modal State
    const [showInterviewModal, setShowInterviewModal] = useState(false);
    const [selectedAppForInterview, setSelectedAppForInterview] = useState<any>(null);
    const [interviewData, setInterviewData] = useState({
        interviewerId: '',
        scheduledAt: '',
        type: 'VIRTUAL',
        meetingLink: ''
    });

    const { data: employees } = useEmployees();
    // Filter employees to only show managers/admins as interviewers ideally, but for now allow all

    const stages = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        if (draggedAppId && newStatus) {
            await updateStatus.mutateAsync({ id: draggedAppId, status: newStatus });
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
        setInterviewData({ interviewerId: '', scheduledAt: '', type: 'VIRTUAL', meetingLink: '' });
    };

    return (
        <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h3 className="text-2xl font-black text-secondary-900 tracking-tight">Candidate Pipeline</h3>
                    <p className="text-secondary-500 font-medium">Track applicants through the hiring workflow.</p>
                </div>
                <div className="w-64">
                    <select
                        className="w-full bg-white border-secondary-200 rounded-xl p-3 font-bold text-sm shadow-sm"
                        value={selectedJobId}
                        onChange={(e) => setSelectedJobId(e.target.value)}
                    >
                        <option value="">All Jobs</option>
                        {jobs?.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto pb-4">
                <div className="flex gap-6 min-w-max h-full">
                    {stages.map((stage) => {
                        const stageApps = applications?.filter(a => a.status === stage) || [];

                        return (
                            <div
                                key={stage}
                                className="w-80 flex flex-col gap-4"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, stage)}
                            >
                                <div className="flex items-center justify-between sticky top-0 bg-secondary-50/80 backdrop-blur p-2 rounded-xl border border-secondary-100 mb-2">
                                    <h4 className="font-black text-secondary-500 text-xs uppercase tracking-widest">{stage}</h4>
                                    <span className="bg-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">{stageApps.length}</span>
                                </div>

                                <div className="flex flex-col gap-4 h-full pb-10">
                                    {stageApps.map((app) => (
                                        <div
                                            key={app.id}
                                            draggable
                                            onDragStart={() => setDraggedAppId(app.id)}
                                            className="card-premium p-4 group hover:border-primary-300 cursor-move bg-white relative active:scale-95 transition-all"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h5 className="font-bold text-secondary-900 line-clamp-1">{app.candidateName}</h5>
                                                {app.rating > 0 && (
                                                    <span className="flex items-center text-[10px] font-bold text-warning-500">
                                                        <Star size={10} fill="currentColor" /> {app.rating}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-secondary-500 mb-3 line-clamp-1">{app.jobPosting?.title || 'Unknown Role'}</p>

                                            <div className="flex gap-2 mb-3">
                                                {app.resumeUrl && (
                                                    <a href={app.resumeUrl} target="_blank" className="p-1.5 rounded-lg bg-secondary-50 text-secondary-600 hover:bg-primary-50 hover:text-primary-600 transition-colors" title="View Resume">
                                                        <FileText size={14} />
                                                    </a>
                                                )}
                                                <a href={`mailto:${app.candidateEmail}`} className="p-1.5 rounded-lg bg-secondary-50 text-secondary-600 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                                                    <Mail size={14} />
                                                </a>
                                            </div>

                                            {/* Actions */}
                                            <div className="pt-3 border-t border-secondary-50 flex justify-between items-center">
                                                <span className="text-[10px] font-medium text-secondary-400">
                                                    Applied {new Date(app.createdAt).toLocaleDateString()}
                                                </span>

                                                {stage !== 'REJECTED' && stage !== 'HIRED' && (
                                                    <button
                                                        onClick={() => { setSelectedAppForInterview(app); setShowInterviewModal(true); }}
                                                        className="text-[10px] font-bold text-primary-600 uppercase hover:underline"
                                                    >
                                                        Schedule
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {stageApps.length === 0 && (
                                        <div className="h-24 rounded-2xl border-2 border-dashed border-secondary-100 flex items-center justify-center text-secondary-300 text-xs font-bold uppercase tracking-widest">
                                            Empty
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Schedule Interview Modal */}
            {showInterviewModal && selectedAppForInterview && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-secondary-50 flex justify-between items-center bg-secondary-50/30">
                            <div>
                                <h3 className="text-xl font-black text-secondary-900 uppercase tracking-tight">Schedule Interview</h3>
                                <p className="text-xs font-bold text-secondary-500">For {selectedAppForInterview.candidateName}</p>
                            </div>
                            <button onClick={() => setShowInterviewModal(false)} className="text-secondary-400 hover:text-secondary-900 text-2xl">×</button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Interviewer</label>
                                <select
                                    className="w-full bg-secondary-50 border-none rounded-2xl p-4 font-bold"
                                    value={interviewData.interviewerId}
                                    onChange={(e) => setInterviewData({ ...interviewData, interviewerId: e.target.value })}
                                >
                                    <option value="">Select Interviewer</option>
                                    {employees?.filter(e => e.userId).map(e => (
                                        <option key={e.userId} value={e.userId}>{(e.user as any)?.name || e.employeeId}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Date & Time</label>
                                <input
                                    type="datetime-local"
                                    className="w-full bg-secondary-50 border-none rounded-2xl p-4 font-bold"
                                    value={interviewData.scheduledAt}
                                    onChange={(e) => setInterviewData({ ...interviewData, scheduledAt: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Meeting Link</label>
                                <input
                                    className="w-full bg-secondary-50 border-none rounded-2xl p-4 font-bold"
                                    placeholder="Zoom / Meet URL"
                                    value={interviewData.meetingLink}
                                    onChange={(e) => setInterviewData({ ...interviewData, meetingLink: e.target.value })}
                                />
                            </div>
                            <button
                                onClick={handleScheduleInterview}
                                disabled={!interviewData.interviewerId || !interviewData.scheduledAt}
                                className="w-full btn bg-primary-600 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl mt-4 disabled:opacity-50"
                            >
                                Confirm Schedule
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
