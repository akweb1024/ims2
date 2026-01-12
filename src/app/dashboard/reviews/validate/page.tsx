'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ChevronLeft,
    ClipboardCheck,
    CheckCircle2,
    XCircle,
    Eye,
    Star,
    MessageSquare,
    AlertTriangle,
    History,
    FileText,
    ExternalLink
} from 'lucide-react';
import Link from 'next/link';

export default function ReviewValidationPage() {
    const [pendingReviews, setPendingReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>('');
    const [selectedReview, setSelectedReview] = useState<any>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showDetailModal, setShowDetailModal] = useState(false);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchPendingReviews();
    }, []);

    const fetchPendingReviews = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/editorial/pending-reports', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPendingReviews(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleValidation = async (isValidated: boolean) => {
        if (!isValidated && !rejectionReason) {
            alert('Please provide a reason for rejection');
            return;
        }

        const confirmMsg = isValidated
            ? 'Confirming validation will issue a digital certificate to the reviewer. Proceed?'
            : 'Are you sure you want to reject this report and request revisions?';

        if (!confirm(confirmMsg)) return;

        setIsValidating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/assignments/${selectedReview.id}/report/validate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    isValidated,
                    rejectionReason: isValidated ? null : rejectionReason
                })
            });

            if (res.ok) {
                alert(isValidated ? 'Report validated and certificate issued!' : 'Report rejected and reviewer notified.');
                setShowDetailModal(false);
                setRejectionReason('');
                fetchPendingReviews();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to process validation');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred');
        } finally {
            setIsValidating(false);
        }
    };

    if (loading) return (
        <DashboardLayout userRole={userRole}>
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 leading-tight">Validate Reports</h1>
                        <p className="text-secondary-500 mt-1 font-medium">Verify reviewer reports and issue digital credentials.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-warning-50 text-warning-700 px-4 py-2 rounded-2xl border border-warning-100 flex items-center gap-2 font-bold text-sm">
                            <AlertTriangle size={20} />
                            {pendingReviews.length} Pending
                        </div>
                    </div>
                </div>

                {/* Reports List */}
                <div className="grid grid-cols-1 gap-4">
                    {pendingReviews.length === 0 ? (
                        <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-secondary-100 space-y-4">
                            <div className="w-20 h-20 bg-secondary-50 rounded-full flex items-center justify-center mx-auto text-secondary-300">
                                <ClipboardCheck size={40} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-secondary-900">All caught up!</h3>
                                <p className="text-secondary-500 font-medium mt-1">There are no pending review reports awaiting validation.</p>
                            </div>
                        </div>
                    ) : (
                        pendingReviews.map((rev) => (
                            <div key={rev.id} className="card-premium p-6 bg-white hover:border-primary-200 transition-all group">
                                <div className="flex flex-col md:flex-row md:items-center gap-6">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-secondary-100 text-secondary-600 rounded-[4px] text-[10px] font-black uppercase tracking-widest">
                                                {rev.reviewer.journal.name}
                                            </span>
                                            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-[4px] text-[10px] font-black uppercase tracking-widest">
                                                Round {rev.round}
                                            </span>
                                        </div>
                                        <h3 className="font-black text-xl text-secondary-900 group-hover:text-primary-700 transition-colors uppercase tracking-tight">{rev.article.title}</h3>
                                        <div className="flex items-center gap-4 text-sm text-secondary-500 font-medium">
                                            <div className="flex items-center gap-1">
                                                <div className="w-5 h-5 rounded-full bg-secondary-100 flex items-center justify-center text-[10px] font-black">{rev.reviewer.user.name.charAt(0)}</div>
                                                {rev.reviewer.user.name}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <History size={14} />
                                                Submitted {new Date(rev.report.submittedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 px-6 border-l border-secondary-100">
                                        <div className="text-center">
                                            <div className="flex items-center gap-1 text-primary-600 justify-center">
                                                <Star size={16} fill="currentColor" />
                                                <span className="text-xl font-black">{rev.report.overallRating}</span>
                                                <span className="text-secondary-300 text-sm font-bold">/5</span>
                                            </div>
                                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-tighter">Rating</p>
                                        </div>
                                        <div className="text-center">
                                            <span className={`px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widst border-2 ${rev.report.recommendation.includes('ACCEPT') ? 'bg-success-50 text-success-700 border-success-200' :
                                                rev.report.recommendation.includes('REJECT') ? 'bg-danger-50 text-danger-700 border-danger-200' :
                                                    'bg-warning-50 text-warning-700 border-warning-200'
                                                }`}>
                                                {rev.report.recommendation.replace('_', ' ')}
                                            </span>
                                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-tighter mt-2">Recommendation</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedReview(rev);
                                                setShowDetailModal(true);
                                            }}
                                            className="btn btn-secondary border-secondary-200 text-secondary-700 hover:bg-secondary-50 px-6 gap-2"
                                        >
                                            Review Report
                                            <Eye size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Detailed Validation Modal */}
                {showDetailModal && selectedReview && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="sticky top-0 bg-white z-10 px-10 py-8 border-b border-secondary-50 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Verify Manuscript Review</p>
                                    <h2 className="text-2xl font-black text-secondary-900 uppercase tracking-tight">{selectedReview.article.title}</h2>
                                </div>
                                <button onClick={() => setShowDetailModal(false)} className="p-3 hover:bg-secondary-50 rounded-2xl transition-all border border-secondary-100">
                                    <XCircle size={24} className="text-secondary-400" />
                                </button>
                            </div>

                            <div className="p-10 space-y-10">
                                {/* Ratings Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                                    {[
                                        { label: 'Overall', val: selectedReview.report.overallRating },
                                        { label: 'Originality', val: selectedReview.report.originality },
                                        { label: 'Methodology', val: selectedReview.report.methodology },
                                        { label: 'Clarity', val: selectedReview.report.clarity },
                                        { label: 'Significance', val: selectedReview.report.significance }
                                    ].map((item, i) => (
                                        <div key={i} className="bg-secondary-50 p-4 rounded-2xl border border-secondary-100 text-center">
                                            <p className="text-[10px] font-black text-secondary-400 uppercase mb-1">{item.label}</p>
                                            <p className="text-2xl font-black text-secondary-900">{item.val}<span className="text-secondary-300 text-sm">/5</span></p>
                                        </div>
                                    ))}
                                </div>

                                {/* Comments Section */}
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-xs font-black text-secondary-900 uppercase tracking-widest border-l-4 border-primary-600 pl-4">
                                            <MessageSquare size={16} /> Comments to Editor
                                        </div>
                                        <div className="p-6 bg-primary-50 rounded-3xl text-sm leading-relaxed text-primary-900 font-medium italic">
                                            &quot;{selectedReview.report.commentsToEditor}&quot;
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-xs font-black text-secondary-900 uppercase tracking-widest border-l-4 border-secondary-400 pl-4">
                                            <FileText size={16} /> Comments to Author
                                        </div>
                                        <div className="p-6 bg-secondary-50 rounded-3xl text-sm leading-relaxed text-secondary-700 font-medium">
                                            {selectedReview.report.commentsToAuthor || <span className="text-secondary-400 italic">No comments provided for author.</span>}
                                        </div>
                                    </div>

                                    {selectedReview.report.confidentialComments && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-xs font-black text-danger-600 uppercase tracking-widest border-l-4 border-danger-600 pl-4">
                                                <AlertTriangle size={16} /> Confidential Comments
                                            </div>
                                            <div className="p-6 bg-danger-50 rounded-3xl text-sm leading-relaxed text-danger-900 font-medium">
                                                {selectedReview.report.confidentialComments}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="pt-10 border-t border-secondary-100 space-y-6">
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <button
                                            onClick={() => handleValidation(true)}
                                            disabled={isValidating}
                                            className="btn btn-primary flex-1 h-14 text-lg font-black gap-3 shadow-xl shadow-primary-200"
                                        >
                                            Validate & Issue Certificate
                                            <CheckCircle2 size={24} />
                                        </button>
                                        <div className="flex-1 flex flex-col gap-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Enter reason for rejection..."
                                                    className="input flex-1 h-14"
                                                    value={rejectionReason}
                                                    onChange={(e) => setRejectionReason(e.target.value)}
                                                />
                                                <button
                                                    onClick={() => handleValidation(false)}
                                                    disabled={isValidating || !rejectionReason}
                                                    className="btn border-2 border-danger-600 text-danger-600 hover:bg-danger-50 px-6 h-14 font-black gap-3"
                                                >
                                                    Reject
                                                    <XCircle size={24} />
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-danger-500 font-bold px-2 italic text-right">* Required for rejection</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-secondary-900 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center font-black text-white">
                                                {selectedReview.reviewer.user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-white text-xs font-black">{selectedReview.reviewer.user.name}</p>
                                                <p className="text-secondary-400 text-[10px] font-bold">Reviewer Specialist</p>
                                            </div>
                                        </div>
                                        <Link
                                            href={`/dashboard/journals/${selectedReview.reviewer.journal.id}/reviewers`}
                                            className="text-primary-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1"
                                        >
                                            View Profile <ExternalLink size={12} />
                                        </Link>
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
