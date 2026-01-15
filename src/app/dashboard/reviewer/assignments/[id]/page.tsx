'use client';

import { useState, useEffect, use, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ChevronLeft,
    FileText,
    Calendar,
    Tag,
    BookOpen,
    Star,
    Send,
    Save,
    AlertCircle,
    CheckCircle,
    Info,
    MessageSquare,
    ClipboardCheck,
    Download
} from 'lucide-react';
import Link from 'next/link';

export default function ReviewSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: assignmentId } = use(params);
    const [assignment, setAssignment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [userRole, setUserRole] = useState<string>('');
    const [formData, setFormData] = useState({
        overallRating: 5,
        originality: 5,
        methodology: 5,
        clarity: 5,
        significance: 5,
        commentsToEditor: '',
        commentsToAuthor: '',
        recommendation: 'MINOR_REVISION',
        confidentialComments: ''
    });

    const fetchAssignment = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/assignments/${assignmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAssignment(data);
                if (data.report) {
                    setFormData({
                        overallRating: data.report.overallRating,
                        originality: data.report.originality,
                        methodology: data.report.methodology,
                        clarity: data.report.clarity,
                        significance: data.report.significance,
                        commentsToEditor: data.report.commentsToEditor,
                        commentsToAuthor: data.report.commentsToAuthor || '',
                        recommendation: data.report.recommendation,
                        confidentialComments: data.report.confidentialComments || ''
                    });
                }
            }
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    }, [assignmentId]);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchAssignment();
    }, [fetchAssignment]);

    const handleRatingChange = (field: string, value: number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm('Are you ready to submit this review report? You cannot edit it once it has been validated by the editor.')) return;

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const method = assignment.report ? 'PATCH' : 'POST';
            const res = await fetch(`/api/assignments/${assignmentId}/report`, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert('Review report submitted successfully!');
                fetchAssignment();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to submit review');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred during submission');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <DashboardLayout userRole={userRole}>
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        </DashboardLayout>
    );

    if (!assignment) return (
        <DashboardLayout userRole={userRole}>
            <div className="p-8 text-center text-danger-600">Assignment not found.</div>
        </DashboardLayout>
    );

    const isSubmitted = assignment.status === 'SUBMITTED' || assignment.status === 'VALIDATED';
    const isReadOnly = assignment.status === 'VALIDATED';

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                {/* Header */}
                <div className="flex items-center gap-6">
                    <Link href="/dashboard/reviewer" className="p-3 hover:bg-white rounded-2xl transition-colors border border-transparent hover:border-secondary-100 flex items-center justify-center bg-secondary-50">
                        <ChevronLeft size={24} />
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-[10px] font-black uppercase tracking-wider">Round {assignment.round}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${assignment.priority === 'URGENT' ? 'bg-danger-100 text-danger-700' :
                                assignment.priority === 'HIGH' ? 'bg-warning-100 text-warning-700' : 'bg-secondary-100 text-secondary-600'
                                }`}>
                                {assignment.priority} Priority
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-secondary-900 leading-tight">{assignment.article.title}</h1>
                        <p className="text-secondary-500 mt-1 font-medium">{assignment.article.journal.name}</p>
                    </div>
                    {isSubmitted && (
                        <div className="flex items-center gap-2 bg-success-50 text-success-700 px-4 py-2 rounded-2xl border border-success-100">
                            <CheckCircle size={20} />
                            <span className="text-sm font-bold uppercase tracking-widest">{assignment.status}</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Metadata & Instructions */}
                    <div className="space-y-6">
                        <div className="card-premium p-6 bg-white space-y-6">
                            <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest flex items-center gap-2">
                                <Info size={16} /> Manuscript Info
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Submission Type</label>
                                    <p className="text-sm font-bold text-secondary-900">Original Research Article</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Deadline</label>
                                    <div className="flex items-center gap-2 text-sm font-bold text-secondary-900">
                                        <Calendar size={14} className="text-secondary-400" />
                                        {new Date(assignment.dueDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-secondary-100">
                                <a
                                    href={assignment.article.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary w-full flex items-center justify-center gap-2 h-12"
                                >
                                    <Download size={18} /> Download Manuscript
                                </a>
                            </div>
                        </div>

                        {assignment.notes && (
                            <div className="card-premium p-6 bg-primary-50 border-primary-100">
                                <h3 className="text-sm font-black text-primary-700 uppercase tracking-widest flex items-center gap-2 mb-3">
                                    <MessageSquare size={16} /> Editor&apos;s Notes
                                </h3>
                                <p className="text-sm text-primary-800 leading-relaxed italic">&quot;{assignment.notes}&quot;</p>
                            </div>
                        )}
                    </div>

                    {/* Right: Review Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <form onSubmit={handleSubmit} className="card-premium p-10 bg-white space-y-10">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black text-secondary-900 border-l-4 border-primary-600 pl-4 uppercase tracking-tighter">Review Report</h3>
                                <ClipboardCheck className="text-secondary-200" size={32} />
                            </div>

                            {/* Evaluation Scores */}
                            <div className="space-y-8">
                                <h4 className="text-xs font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2">Technical Evaluation</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                    {[
                                        { label: 'Overall Rating', field: 'overallRating' },
                                        { label: 'Originality', field: 'originality' },
                                        { label: 'Scientific Methodology', field: 'methodology' },
                                        { label: 'Technical Clarity', field: 'clarity' },
                                        { label: 'Significant Contribution', field: 'significance' }
                                    ].map((item: any) => (
                                        <div key={item.field} className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-bold text-secondary-700">{item.label}</label>
                                                <span className="text-lg font-black text-primary-600">{(formData as any)[item.field]}/5</span>
                                            </div>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map(num => (
                                                    <button
                                                        key={num}
                                                        type="button"
                                                        disabled={isReadOnly}
                                                        onClick={() => handleRatingChange(item.field, num)}
                                                        className={`flex-1 h-10 rounded-xl font-bold transition-all ${(formData as any)[item.field] === num
                                                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-200 scale-110'
                                                            : 'bg-secondary-50 text-secondary-400 hover:bg-secondary-100'
                                                            }`}
                                                    >
                                                        {num}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Qualitative Feedback */}
                            <div className="space-y-8">
                                <h4 className="text-xs font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100 pb-2">Detailed Feedback</h4>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs font-bold text-secondary-700 mb-2 block">Comments to Author (Public)</label>
                                        <textarea
                                            name="commentsToAuthor"
                                            className="input min-h-[150px] py-4 h-auto leading-relaxed"
                                            placeholder="Provide constructive feedback for the authors to improve their manuscript..."
                                            value={formData.commentsToAuthor}
                                            onChange={handleTextChange}
                                            disabled={isReadOnly}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-secondary-700 mb-2 block">Comments to Editor (Private)</label>
                                        <textarea
                                            name="commentsToEditor"
                                            className="input min-h-[120px] py-4 h-auto leading-relaxed"
                                            placeholder="Explain your technical reasoning for the recommendation..."
                                            value={formData.commentsToEditor}
                                            onChange={handleTextChange}
                                            disabled={isReadOnly}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-secondary-700 mb-2 block text-danger-600 flex items-center gap-1">
                                            <ShieldAlert size={14} /> Confidential Comments (Strictly Hidden)
                                        </label>
                                        <textarea
                                            name="confidentialComments"
                                            className="input min-h-[80px] bg-secondary-50 border-secondary-100 py-3 h-auto"
                                            placeholder="Any sensitive information for the editor's eyes only..."
                                            value={formData.confidentialComments}
                                            onChange={handleTextChange}
                                            disabled={isReadOnly}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Final Decision */}
                            <div className="space-y-6 pt-6 border-t border-secondary-100">
                                <div>
                                    <label className="text-xs font-black text-secondary-400 uppercase tracking-widest block mb-4">Final Recommendation</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {[
                                            { id: 'ACCEPT', label: 'Accept Submission', style: 'border-success-200 text-success-700 hover:bg-success-50 peer-checked:bg-success-600 peer-checked:text-white' },
                                            { id: 'MINOR_REVISION', label: 'Minor Revision', style: 'border-primary-200 text-primary-700 hover:bg-primary-50 peer-checked:bg-primary-600 peer-checked:text-white' },
                                            { id: 'MAJOR_REVISION', label: 'Major Revision', style: 'border-warning-200 text-warning-700 hover:bg-warning-50 peer-checked:bg-warning-600 peer-checked:text-white' },
                                            { id: 'REJECT_RESUBMIT', label: 'Reject & Resubmit', style: 'border-secondary-200 text-secondary-700 hover:bg-secondary-50 peer-checked:bg-secondary-900 peer-checked:text-white' },
                                            { id: 'REJECT', label: 'Technical Reject', style: 'border-danger-200 text-danger-700 hover:bg-danger-50 peer-checked:bg-danger-600 peer-checked:text-white' }
                                        ].map(rec => (
                                            <label key={rec.id} className="relative cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="recommendation"
                                                    value={rec.id}
                                                    className="sr-only peer"
                                                    checked={formData.recommendation === rec.id}
                                                    onChange={handleTextChange}
                                                    disabled={isReadOnly}
                                                />
                                                <div className={`text-center p-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-tighter transition-all ${rec.style}`}>
                                                    {rec.label}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {!isReadOnly && (
                                <div className="flex gap-4 pt-10">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="btn btn-primary flex-1 h-14 text-lg font-black tracking-widest flex items-center justify-center gap-3"
                                    >
                                        {submitting ? 'Processing...' : isSubmitted ? 'Update Review' : 'Submit Final Review'}
                                        <Send size={20} />
                                    </button>
                                </div>
                            )}

                            {isReadOnly && (
                                <div className="p-6 bg-success-50 rounded-2xl border border-success-100 flex items-center gap-4 text-success-700">
                                    <CheckCircle size={32} />
                                    <div>
                                        <p className="font-black text-lg">Validated by Editorial Team</p>
                                        <p className="text-sm font-medium">This review report has been finalized and a certificate has been issued.</p>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

function ShieldAlert({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>
    );
}

