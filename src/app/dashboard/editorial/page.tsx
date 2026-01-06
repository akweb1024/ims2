'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function EditorialPage() {
    const [articles, setArticles] = useState<any[]>([]);
    const [journals, setJournals] = useState<any[]>([]);
    const [reviewers, setReviewers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAssigning, setIsAssigning] = useState<string | null>(null);
    const [viewingArticle, setViewingArticle] = useState<any | null>(null);
    const [articleReviews, setArticleReviews] = useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [userRole, setUserRole] = useState<string>('');

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchArticles();
        fetchJournals();
        fetchReviewers();
    }, []);

    const fetchArticles = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/editorial/articles', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setArticles(await res.json());
        } catch (error) { console.error(error); }
    };

    const fetchJournals = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/journals', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) setJournals(data);
                else if (data.journals) setJournals(data.journals);
            }
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const fetchReviewers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/editorial/reviewers', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setReviewers(await res.json());
        } catch (error) { console.error(error); }
    };

    const fetchArticleReviews = async (articleId: string) => {
        setLoadingReviews(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/editorial/articles/${articleId}/reviews`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setArticleReviews(await res.json());
        } catch (error) { console.error(error); } finally { setLoadingReviews(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/editorial/articles', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                setIsSubmitting(false);
                fetchArticles();
            } else {
                alert('Failed to submit article');
            }
        } catch (error) { console.error(error); }
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAssigning) return;

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/editorial/articles/${isAssigning}/assign`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                setIsAssigning(null);
                fetchArticles();
            } else {
                alert('Failed to assign reviewer');
            }
        } catch (error) { console.error(error); }
    };

    const handleDecision = async (status: string) => {
        if (!viewingArticle) return;
        if (!confirm(`Are you sure you want to mark this article as ${status}?`)) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/editorial/articles/${viewingArticle.id}/decision`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                setViewingArticle(null);
                fetchArticles();
            } else {
                alert('Failed to submit decision');
            }
        } catch (error) { console.error(error); }
    };

    const isEditor = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'].includes(userRole);

    if (loading) return <div className="p-8 text-center text-secondary-500">Loading editorial dashboard...</div>;

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Editorial Workflow</h1>
                        <p className="text-secondary-500">Manage submissions and peer review</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setIsSubmitting(true)}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <span>+</span> Submit Article
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="card-premium p-4 bg-white border border-secondary-100">
                        <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Pending Review</h4>
                        <p className="text-2xl font-black text-secondary-900">{articles.filter(a => a.status === 'SUBMITTED').length}</p>
                    </div>
                    <div className="card-premium p-4 bg-white border border-secondary-100">
                        <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Under Review</h4>
                        <p className="text-2xl font-black text-warning-600">{articles.filter(a => a.status === 'UNDER_REVIEW').length}</p>
                    </div>
                    <div className="card-premium p-4 bg-white border border-secondary-100">
                        <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Revisions</h4>
                        <p className="text-2xl font-black text-primary-600">{articles.filter(a => a.status === 'REVISION_REQUESTED').length}</p>
                    </div>
                    <div className="card-premium p-4 bg-white border border-secondary-100">
                        <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Accepted</h4>
                        <p className="text-2xl font-black text-success-600">{articles.filter(a => a.status === 'ACCEPTED').length}</p>
                    </div>
                </div>

                {/* Articles Table */}
                <div className="bg-white rounded-3xl border border-secondary-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm text-secondary-600">
                        <thead className="bg-secondary-50 text-secondary-900 font-bold border-b border-secondary-200">
                            <tr>
                                <th className="p-4">Title</th>
                                <th className="p-4">Journal</th>
                                <th className="p-4">First Author</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100">
                            {articles.map(article => (
                                <tr key={article.id} className="hover:bg-secondary-50 transition-colors">
                                    <td className="p-4 font-medium text-secondary-900 line-clamp-1 max-w-xs">{article.title}</td>
                                    <td className="p-4">{article.journal?.name}</td>
                                    <td className="p-4 font-medium">{article.authors?.[0]?.name}</td>
                                    <td className="p-4">{new Date(article.submissionDate).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase 
                                            ${article.status === 'ACCEPTED' ? 'bg-success-100 text-success-700' :
                                                article.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                    article.status === 'PUBLISHED' ? 'bg-primary-100 text-primary-700' :
                                                        article.status === 'UNDER_REVIEW' ? 'bg-warning-100 text-warning-700' :
                                                            'bg-secondary-100 text-secondary-700'}`}>
                                            {article.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {isEditor && article.status === 'SUBMITTED' && (
                                            <button
                                                onClick={() => setIsAssigning(article.id)}
                                                className="text-primary-600 font-bold hover:underline px-3 py-1 bg-primary-50 rounded-lg"
                                            >
                                                Assign Reviewer
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setViewingArticle(article);
                                                fetchArticleReviews(article.id);
                                            }}
                                            className="text-secondary-600 font-bold hover:underline ml-2"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {articles.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-secondary-400 italic">No articles found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Submission Modal */}
                {isSubmitting && (
                    <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2rem] p-10 max-w-lg w-full shadow-2xl">
                            <h3 className="text-2xl font-bold mb-6">Submit New Manuscript</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="label">Target Journal</label>
                                    <select name="journalId" className="input" required>
                                        <option value="">Select Journal</option>
                                        {journals.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Article Title</label>
                                    <input name="title" className="input" required placeholder="Nature of the Cosmos..." />
                                </div>
                                <div>
                                    <label className="label">Abstract</label>
                                    <textarea name="abstract" className="input h-32" required placeholder="Paste abstract here..." />
                                </div>
                                <div>
                                    <label className="label">First Author Name</label>
                                    <input name="authorName" className="input" required placeholder="e.g. Dr. Jane Doe" />
                                </div>
                                <div className="flex gap-2 pt-6">
                                    <button type="submit" className="btn btn-primary flex-1">Submit Manuscript</button>
                                    <button type="button" onClick={() => setIsSubmitting(false)} className="btn btn-secondary">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Assignment Modal */}
                {isAssigning && (
                    <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2rem] p-10 max-w-lg w-full shadow-2xl">
                            <h3 className="text-2xl font-bold mb-6">Assign Reviewer</h3>
                            <form onSubmit={handleAssign} className="space-y-4">
                                <div>
                                    <label className="label">Select Reviewer</label>
                                    <select name="reviewerId" className="input" required>
                                        <option value="">Choose a staff member...</option>
                                        {reviewers.map(r => (
                                            <option key={r.id} value={r.id}>
                                                {r.email} ({r.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Due Date</label>
                                    <input name="dueDate" type="date" className="input" required />
                                </div>
                                <div className="flex gap-2 pt-6">
                                    <button type="submit" className="btn btn-primary flex-1">Assign Now</button>
                                    <button type="button" onClick={() => setIsAssigning(null)} className="btn btn-secondary">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Article Detail & reviews Modal */}
                {viewingArticle && (
                    <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2rem] p-10 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-secondary-900">{viewingArticle.title}</h3>
                                    <p className="text-secondary-500">{viewingArticle.journal?.name}</p>
                                </div>
                                <button onClick={() => setViewingArticle(null)} className="text-secondary-400 hover:text-secondary-900 text-2xl">×</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="md:col-span-2 space-y-6">
                                    <div>
                                        <h4 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Abstract</h4>
                                        <p className="text-secondary-700 text-sm leading-relaxed bg-secondary-50 p-6 rounded-2xl border border-secondary-100">
                                            {viewingArticle.abstract || 'No abstract provided.'}
                                        </p>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-4">Peer reviews</h4>
                                        {loadingReviews ? (
                                            <p className="text-secondary-400 italic">Fetching reviews...</p>
                                        ) : articleReviews.length === 0 ? (
                                            <p className="text-secondary-400 italic py-4">No reviews submitted yet.</p>
                                        ) : (
                                            <div className="space-y-4">
                                                {articleReviews.map(review => (
                                                    <div key={review.id} className="p-6 rounded-2xl border border-secondary-200 bg-white shadow-sm">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                                                                    {review.reviewer.email.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-secondary-900">{review.reviewer.email}</p>
                                                                    <p className="text-[10px] text-secondary-400 uppercase">{review.reviewer.role}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${review.recommendation === 'ACCEPT' ? 'bg-success-100 text-success-700' :
                                                                    review.recommendation === 'REJECT' ? 'bg-danger-100 text-danger-700' :
                                                                        'bg-warning-100 text-warning-700'
                                                                    }`}>
                                                                    {review.recommendation || 'No Rec.'}
                                                                </span>
                                                                <p className="text-xs font-black text-secondary-900 mt-1">Rating: {review.rating}/10</p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div>
                                                                <p className="text-[10px] font-bold text-secondary-400 uppercase">Comments to Author</p>
                                                                <p className="text-sm text-secondary-700 italic">&quot;{review.commentsToAuthor}&quot;</p>
                                                            </div>
                                                            {review.commentsToEditor && (
                                                                <div className="pt-3 border-t border-secondary-100">
                                                                    <p className="text-[10px] font-bold text-primary-500 uppercase">Confidential to Editor</p>
                                                                    <p className="text-sm text-secondary-700 italic">&quot;{review.commentsToEditor}&quot;</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="card-premium p-6 bg-secondary-900 text-white shadow-xl">
                                        <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-4">Article Status</h4>
                                        <div className="text-center py-4 bg-white/5 rounded-2xl border border-white/10 mb-6">
                                            <p className="text-2xl font-black uppercase tracking-tighter">{viewingArticle.status.replace('_', ' ')}</p>
                                        </div>

                                        {isEditor && (
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-3">Editorial Decision</p>
                                                <button
                                                    onClick={() => handleDecision('ACCEPTED')}
                                                    className="w-full btn bg-success-600 hover:bg-success-700 text-white text-xs py-3 rounded-xl shadow-lg shadow-success-600/20"
                                                >
                                                    Accept Manuscript
                                                </button>
                                                <button
                                                    onClick={() => handleDecision('REVISION_REQUESTED')}
                                                    className="w-full btn bg-warning-500 hover:bg-warning-600 text-white text-xs py-3 rounded-xl shadow-lg shadow-warning-500/20"
                                                >
                                                    Request Revisions
                                                </button>
                                                <button
                                                    onClick={() => handleDecision('REJECTED')}
                                                    className="w-full btn bg-danger-600 hover:bg-danger-700 text-white text-xs py-3 rounded-xl shadow-lg shadow-danger-600/20"
                                                >
                                                    Reject Manuscript
                                                </button>
                                                <button
                                                    onClick={() => handleDecision('PUBLISHED')}
                                                    className="w-full btn bg-primary-600 hover:bg-primary-700 text-white text-xs py-3 rounded-xl shadow-lg shadow-primary-600/20"
                                                >
                                                    Publish Final
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="card-premium p-6 border border-secondary-100">
                                        <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-4">Metadata</h4>
                                        <div className="space-y-3 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-secondary-500">Submitted</span>
                                                <span className="font-bold">{new Date(viewingArticle.submissionDate).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-secondary-500">First Author</span>
                                                <span className="font-bold">{viewingArticle.authors?.[0]?.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-secondary-500">Journal ID</span>
                                                <span className="font-bold truncate max-w-[100px]">{viewingArticle.journalId}</span>
                                            </div>
                                        </div>
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
