import { useState, useEffect } from 'react';
import { X, Mail, Phone, ExternalLink, Calendar, MapPin, Download, Sparkles, Save, Clock, ThumbsUp, ThumbsDown } from 'lucide-react';

interface CandidateProfileModalProps {
    application: any;
    onClose: () => void;
    onSchedule: (app: any) => void;
    onUpdateApplication: (data: any) => Promise<void>;
}

export default function CandidateProfileModal({ application, onClose, onSchedule, onUpdateApplication }: CandidateProfileModalProps) {
    const [notes, setNotes] = useState(application?.notes || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (application) setNotes(application.notes || '');
    }, [application]);

    const handleSaveNotes = async () => {
        setIsSaving(true);
        try {
            await onUpdateApplication({ id: application.id, notes });
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            await onUpdateApplication({ id: application.id, status: newStatus });
            onClose();
        } catch (error) {
            console.error(error);
        }
    };

    if (!application) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                {/* Header with Cover-like background */}
                <div className="h-32 bg-gradient-to-r from-primary-600 to-secondary-900 relative shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors backdrop-blur-md"
                    >
                        <X size={20} />
                    </button>
                    <div className="absolute -bottom-12 left-8 flex items-end gap-6">
                        <div className="w-24 h-24 bg-white rounded-2xl p-1 shadow-lg ring-4 ring-white/20 backdrop-blur-sm">
                            <div className="w-full h-full bg-primary-100 rounded-xl flex items-center justify-center text-3xl font-black text-primary-600 uppercase">
                                {application.applicantName?.charAt(0)}
                            </div>
                        </div>
                        <div className="pb-2 text-white drop-shadow-md">
                            <h2 className="text-3xl font-black tracking-tight">{application.applicantName}</h2>
                            <p className="font-medium opacity-90">{application.jobPosting?.title || 'Unknown Role'}</p>
                        </div>
                    </div>

                    {/* Header Actions */}
                    <div className="absolute bottom-4 right-8 flex gap-3">
                        <button
                            onClick={() => onSchedule(application)}
                            className="bg-white text-primary-600 hover:bg-primary-50 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 transition-colors"
                        >
                            <Clock size={16} /> Schedule Interview
                        </button>
                        {(application.status !== 'REJECTED' && application.status !== 'HIRED') && (
                            <>
                                <button
                                    onClick={() => handleStatusChange('REJECTED')}
                                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-xl shadow-lg transition-colors"
                                    title="Reject Candidate"
                                >
                                    <ThumbsDown size={20} />
                                </button>
                                <button
                                    onClick={() => handleStatusChange(application.status === 'APPLIED' ? 'SCREENING' : 'INTERVIEW')}
                                    className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-xl shadow-lg transition-colors"
                                    title="Move to Next Stage"
                                >
                                    <ThumbsUp size={20} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto pt-16 px-8 pb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Sidebar Info */}
                        <div className="space-y-6">
                            <div className="bg-secondary-50 rounded-2xl p-6 space-y-4">
                                <h4 className="font-black text-secondary-900 uppercase tracking-widest text-xs">Contact Info</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm font-medium text-secondary-600">
                                        <div className="p-2 bg-white rounded-lg text-primary-600 shadow-sm"><Mail size={16} /></div>
                                        <a href={`mailto:${application.applicantEmail}`} className="hover:text-primary-600 truncate">{application.applicantEmail}</a>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm font-medium text-secondary-600">
                                        <div className="p-2 bg-white rounded-lg text-primary-600 shadow-sm"><Phone size={16} /></div>
                                        <span>{application.applicantPhone || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-secondary-100 rounded-2xl p-6 space-y-4 shadow-sm">
                                <h4 className="font-black text-secondary-900 uppercase tracking-widest text-xs flex items-center gap-2">
                                    <Sparkles size={14} className="text-primary-500" /> AI Insights
                                </h4>
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-secondary-500 text-sm font-medium">Match Score</span>
                                        <span className={`text-xl font-black ${application.aiMatchScore >= 70 ? 'text-green-600' : 'text-amber-600'}`}>{application.aiMatchScore}%</span>
                                    </div>
                                    <div className="w-full bg-secondary-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${application.aiMatchScore >= 70 ? 'bg-green-500' : 'bg-amber-500'}`}
                                            style={{ width: `${application.aiMatchScore}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {application.aiTags?.map((tag: string, i: number) => (
                                        <span key={i} className="text-[10px] bg-secondary-50 text-secondary-600 px-2 py-1 rounded-lg border border-secondary-100 font-bold uppercase tracking-wider">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Screening Notes Section */}
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 space-y-3 shadow-sm">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-black text-amber-900 uppercase tracking-widest text-xs flex items-center gap-2">
                                        Screening Notes
                                    </h4>
                                    <button
                                        onClick={handleSaveNotes}
                                        disabled={isSaving}
                                        className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-1 rounded hover:bg-amber-300 transition-colors"
                                    >
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                                <textarea
                                    className="w-full bg-white border border-amber-200 rounded-xl p-3 text-sm font-medium text-secondary-700 min-h-[120px] focus:ring-2 focus:ring-amber-500 outline-none"
                                    placeholder="Add notes about screening, key strengths, or concerns..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="md:col-span-2 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Current Status</span>
                                        <span className="text-lg font-bold text-secondary-900 bg-secondary-100 px-3 py-1 rounded-lg self-start mt-1">
                                            {(application.status || 'APPLIED').replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Applied On</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Calendar size={16} className="text-secondary-400" />
                                            <span className="text-secondary-600 font-medium">
                                                {new Date(application.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {application.resumeUrl && (
                                    <a
                                        href={application.resumeUrl}
                                        target="_blank"
                                        className="btn bg-secondary-900 hover:bg-black text-white px-5 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2"
                                    >
                                        <Download size={16} /> Download Resume
                                    </a>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-black text-secondary-900 flex items-center gap-2 border-b border-secondary-100 pb-2">
                                    Interview History
                                </h3>
                                {application.interviews && application.interviews.length > 0 ? (
                                    <div className="space-y-4">
                                        {application.interviews.map((interview: any) => (
                                            <div key={interview.id} className="bg-white border border-secondary-100 rounded-xl p-4 flex gap-4 items-start hover:border-primary-200 transition-colors">
                                                <div className="bg-secondary-50 p-3 rounded-lg text-secondary-500 font-bold text-center min-w-[4rem]">
                                                    <div className="text-xs uppercase">{new Date(interview.scheduledAt).toLocaleDateString(undefined, { month: 'short' })}</div>
                                                    <div className="text-xl text-secondary-900">{new Date(interview.scheduledAt).getDate()}</div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h5 className="font-bold text-secondary-900">
                                                                {interview.level === 1 ? 'HR Screening' : interview.level === 2 ? 'Technical Round' : 'Final Round'}
                                                            </h5>
                                                            <p className="text-xs text-secondary-500 font-medium mt-0.5">
                                                                {interview.type} • {new Date(interview.scheduledAt).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                                                            </p>
                                                        </div>
                                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${interview.status === 'COMPLETED' ? 'bg-green-50 text-green-600' :
                                                            interview.status === 'CANCELLED' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                                            }`}>
                                                            {interview.status}
                                                        </span>
                                                    </div>
                                                    {interview.feedback && (
                                                        <div className="mt-3 bg-secondary-50/50 p-3 rounded-lg text-sm text-secondary-600 italic border border-secondary-50">
                                                            &quot;{interview.feedback}&quot;
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-secondary-400 text-sm font-medium italic">No interviews scheduled yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
