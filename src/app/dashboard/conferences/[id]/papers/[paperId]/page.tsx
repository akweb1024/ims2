'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ArrowLeft, FileText, CheckCircle, XCircle, AlertTriangle,
    Download, ExternalLink, MessageSquare, Star, Save
} from 'lucide-react';

export default function PaperDetailPage() {
    const params = useParams();
    const router = useRouter();
    const conferenceId = params.id as string;
    const paperId = params.paperId as string;

    const [paper, setPaper] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [userId, setUserId] = useState('');

    // Review Form
    const [reviewScore, setReviewScore] = useState(3);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewDecision, setReviewDecision] = useState('PENDING'); // Suggestion
    const [submittingReview, setSubmittingReview] = useState(false);

    // Final Decision Form
    const [finalDecision, setFinalDecision] = useState('');
    const [submittingDecision, setSubmittingDecision] = useState(false);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            const userData = JSON.parse(user);
            setUserRole(userData.role);
            setUserId(userData.id);
        }
        fetchPaper();
    }, [paperId]);

    const fetchPaper = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/papers/${paperId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPaper(data);
                // Pre-fill review form if user already reviewed
                if (data.reviews) {
                    const myReview = data.reviews.find((r: any) => r.reviewerId === userId || (!r.reviewer && userRole === 'REVIEWER'));
                    // Note: API might hide reviewerId for authors, but here we are presumably Staff/Reviewer if looking at this page or Author.
                    // If author, they can't review.
                    if (myReview) {
                        setReviewScore(myReview.score);
                        setReviewComment(myReview.comments || '');
                        setReviewDecision(myReview.decision);
                    }
                }
                if (data.finalDecision) {
                    setFinalDecision(data.finalDecision);
                }
            } else {
                alert('Failed to load paper details');
                router.back();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const submitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingReview(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/papers/${paperId}/review`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    score: reviewScore,
                    comments: reviewComment,
                    decision: reviewDecision
                })
            });

            if (res.ok) {
                alert('Review submitted successfully');
                fetchPaper();
            } else {
                alert('Failed to submit review');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSubmittingReview(false);
        }
    };

    const submitFinalDecision = async () => {
        if (!confirm(`Are you sure you want to mark this paper as ${finalDecision}?`)) return;
        setSubmittingDecision(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/papers/${paperId}/decision`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ decision: finalDecision })
            });

            if (res.ok) {
                alert('Decision saved successfully');
                fetchPaper();
            } else {
                alert('Failed to save decision');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSubmittingDecision(false);
        }
    };

    const isStaff = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole);
    const isReviewer = userRole === 'REVIEWER' || isStaff;
    const isAuthor = paper?.userId === userId;

    if (loading) return <div className="p-8 text-center">Loading paper...</div>;
    if (!paper) return <div className="p-8 text-center">Paper not found</div>;

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href={`/dashboard/conferences/${conferenceId}/papers`} className="btn btn-secondary btn-sm">
                        <ArrowLeft size={16} /> Back
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-secondary-900 line-clamp-1">{paper.title}</h1>
                        <p className="text-secondary-500 flex items-center gap-2">
                            <span>Author(s): {paper.authors}</span>
                            <span className="w-1 h-1 rounded-full bg-secondary-300"></span>
                            <span>Track: {paper.track?.name || 'General'}</span>
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Abstract */}
                        <div className="card-premium p-6">
                            <h3 className="font-bold text-lg mb-4">Abstract</h3>
                            <p className="text-secondary-600 leading-relaxed whitespace-pre-wrap">{paper.abstract}</p>
                            {paper.keywords && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {paper.keywords.split(',').map((k: string, i: number) => (
                                        <span key={i} className="px-3 py-1 bg-secondary-100 text-secondary-600 rounded-full text-sm">
                                            {k.trim()}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {paper.fileUrl && (
                                <div className="mt-6 pt-6 border-t border-secondary-100">
                                    <h4 className="font-bold text-sm mb-2">Attached File</h4>
                                    <a href={paper.fileUrl} target="_blank" className="btn btn-secondary inline-flex items-center gap-2">
                                        <Download size={16} /> Download Paper
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Reviews List (Visible to Staff and Reviewers, Authors see anonymized) */}
                        <div className="card-premium p-6">
                            <h3 className="font-bold text-lg mb-4 flex items-center justify-between">
                                Reviews
                                <span className="text-sm font-normal text-secondary-500">
                                    {paper.reviews?.length || 0} Submitted
                                </span>
                            </h3>

                            {paper.reviews?.length === 0 ? (
                                <p className="text-secondary-500 italic">No reviews yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {paper.reviews.map((review: any) => (
                                        <div key={review.id} className="p-4 border border-secondary-200 rounded-xl bg-secondary-50">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-bold text-secondary-900">
                                                        {review.reviewer?.name || 'Reviewer'}
                                                    </p>
                                                    <p className="text-xs text-secondary-500">
                                                        {new Date(review.submittedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded shadow-sm">
                                                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                                    <span className="font-bold">{review.score}/5</span>
                                                </div>
                                            </div>
                                            <div className="mb-2">
                                                <span className={`text-xs px-2 py-0.5 rounded ${review.decision === 'ACCEPT' ? 'bg-green-100 text-green-700' :
                                                        review.decision === 'REJECT' ? 'bg-red-100 text-red-700' :
                                                            'bg-orange-100 text-orange-700'
                                                    }`}>
                                                    Recommendation: {review.decision}
                                                </span>
                                            </div>
                                            <p className="text-secondary-700 text-sm whitespace-pre-wrap">{review.comments || 'No comments.'}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Actions */}
                    <div className="space-y-6">
                        {/* Status Card */}
                        <div className="card-premium p-6">
                            <h3 className="font-bold text-lg mb-4">Status</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-secondary-500 uppercase">Review Status</label>
                                    <div className={`mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-full font-bold text-sm ${paper.reviewStatus === 'REVIEWED' ? 'bg-green-100 text-green-700' :
                                            paper.reviewStatus === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-700' :
                                                'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {paper.reviewStatus.replace('_', ' ')}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-secondary-500 uppercase">Final Decision</label>
                                    <div className={`mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-full font-bold text-sm ${paper.finalDecision === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                                            paper.finalDecision === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                paper.finalDecision === 'REVISION_REQUIRED' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-gray-100 text-gray-700'
                                        }`}>
                                        {paper.finalDecision || 'PENDING'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Final Decision Form (Admin/Manager Only) */}
                        {isStaff && (
                            <div className="card-premium p-6 border-l-4 border-primary-500">
                                <h3 className="font-bold text-lg mb-4">Make Decision</h3>
                                <div className="space-y-4">
                                    <select
                                        className="input w-full"
                                        value={finalDecision}
                                        onChange={(e) => setFinalDecision(e.target.value)}
                                    >
                                        <option value="">Select Decision...</option>
                                        <option value="ACCEPTED">Accept Paper</option>
                                        <option value="REJECTED">Reject Paper</option>
                                        <option value="REVISION_REQUIRED">Request Revision</option>
                                    </select>
                                    <button
                                        onClick={submitFinalDecision}
                                        disabled={!finalDecision || submittingDecision}
                                        className="btn btn-primary w-full"
                                    >
                                        {submittingDecision ? 'Saving...' : 'Save Decision'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Review Form (Staff/Reviewer) */}
                        {isReviewer && !isAuthor && (
                            <div className="card-premium p-6">
                                <h3 className="font-bold text-lg mb-4">Submit Review</h3>
                                <form onSubmit={submitReview} className="space-y-4">
                                    <div>
                                        <label className="label">Score (1-5)</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => setReviewScore(s)}
                                                    className={`w-10 h-10 rounded-full font-bold flex items-center justify-center transition-colors ${reviewScore === s ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                                                        }`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">Recommendation</label>
                                        <select
                                            className="input w-full"
                                            value={reviewDecision}
                                            onChange={(e) => setReviewDecision(e.target.value)}
                                        >
                                            <option value="PENDING">Select...</option>
                                            <option value="ACCEPT">Accept</option>
                                            <option value="REJECT">Reject</option>
                                            <option value="REVISE">Revise</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Comments</label>
                                        <textarea
                                            className="input w-full h-32"
                                            placeholder="Detailed feedback..."
                                            value={reviewComment}
                                            onChange={(e) => setReviewComment(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submittingReview}
                                        className="btn btn-secondary w-full"
                                    >
                                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
