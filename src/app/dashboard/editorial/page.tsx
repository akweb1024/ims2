'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Upload, FileText, CheckCircle, AlertTriangle, Clock, BookOpen, UserCheck, Calendar } from 'lucide-react';

export default function EditorialPage() {
    const [articles, setArticles] = useState<any[]>([]);
    const [journals, setJournals] = useState<any[]>([]);
    const [reviewers, setReviewers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAssigning, setIsAssigning] = useState<string | null>(null);
    const [viewingArticle, setViewingArticle] = useState<any | null>(null);
    const [articleReviews, setArticleReviews] = useState<any[]>([]);
    const [articleVersions, setArticleVersions] = useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [userRole, setUserRole] = useState<string>('');
    const [isUploadingVersion, setIsUploadingVersion] = useState(false);
    const [availableIssues, setAvailableIssues] = useState<any[]>([]);

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
            const res = await fetch('/api/editorial/articles', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setArticles(await res.json());
        } catch (error) { console.error(error); }
    };

    const fetchJournals = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/journals', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setJournals(Array.isArray(data) ? data : data.journals);
            }
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const fetchReviewers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/editorial/reviewers', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setReviewers(await res.json());
        } catch (error) { console.error(error); }
    };

    const fetchArticleDetails = async (article: any) => {
        setViewingArticle(article);
        setLoadingReviews(true);
        try {
            const token = localStorage.getItem('token');
            // Fetch Reviews
            const resReviews = await fetch(`/api/editorial/articles/${article.id}/reviews`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (resReviews.ok) setArticleReviews(await resReviews.json());

            // Fetch Versions
            const resVersions = await fetch(`/api/editorial/articles/${article.id}/versions`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (resVersions.ok) setArticleVersions(await resVersions.json());

            // Fetch Issues for this Journal (if we need to assign)
            if (['ACCEPTED', 'PUBLISHED'].includes(article.status) || isEditor) {
                const resIssues = await fetch(`/api/journals/${article.journalId}/volumes`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (resIssues.ok) {
                    const volumes = await resIssues.json();
                    const issues = volumes.flatMap((v: any) => v.issues.map((i: any) => ({ ...i, volumeNumber: v.volumeNumber })));
                    setAvailableIssues(issues);
                }
            }

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
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                setIsSubmitting(false);
                fetchArticles();
            } else alert('Failed to submit article');
        } catch (error) { console.error(error); }
    };

    const handleUploadVersion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!viewingArticle) return;
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/editorial/articles/${viewingArticle.id}/versions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                setIsUploadingVersion(false);
                fetchArticleDetails(viewingArticle); // Refresh details
                fetchArticles(); // Refresh list status
            } else alert('Failed to upload revision');
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
            const res = await fetch(`/api/editorial/articles/${isAssigning}/assign`, { // This is reviewer assignment
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                setIsAssigning(null);
                fetchArticles();
            } else alert('Failed to assign reviewer');
        } catch (error) { console.error(error); }
    };

    const handleIssueAssignment = async (issueId: string) => {
        if (!viewingArticle) return;
        if (!confirm('Assign this article to the selected issue? This will mark it as ACCEPTED.')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/editorial/articles/${viewingArticle.id}/assign`, { // This is issue assignment (PATCH)
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ issueId })
            });
            if (res.ok) {
                fetchArticles();
                setViewingArticle(null);
            } else alert('Failed to assign issue');
        } catch (error) { console.error(error); }
    };

    const handleDecision = async (status: string) => {
        if (!viewingArticle) return;
        if (!confirm(`Mark article as ${status}?`)) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/editorial/articles/${viewingArticle.id}/decision`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            fetchArticles();
            setViewingArticle(null);
        } catch (error) { console.error(error); }
    };

    const isEditor = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'].includes(userRole);

    if (loading) return <div className="p-8 text-center text-secondary-500">Loading...</div>;

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Editorial Workflow</h1>
                        <p className="text-secondary-500">Manage submissions, peer reviews, and production.</p>
                    </div>
                    <button onClick={() => setIsSubmitting(true)} className="btn btn-primary flex items-center gap-2">
                        <Upload size={18} /> Submit Manuscript
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Pending Review', count: articles.filter(a => a.status === 'SUBMITTED').length, color: 'text-secondary-900' },
                        { label: 'Under Review', count: articles.filter(a => a.status === 'UNDER_REVIEW').length, color: 'text-warning-600' },
                        { label: 'Revisions', count: articles.filter(a => a.status === 'REVISION_REQUESTED').length, color: 'text-primary-600' },
                        { label: 'Accepted', count: articles.filter(a => a.status === 'ACCEPTED').length, color: 'text-success-600' }
                    ].map((stat, i) => (
                        <div key={i} className="card-premium p-4 bg-white border border-secondary-100">
                            <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">{stat.label}</h4>
                            <p className={`text-2xl font-black ${stat.color}`}>{stat.count}</p>
                        </div>
                    ))}
                </div>

                {/* Articles List */}
                <div className="bg-white rounded-3xl border border-secondary-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm text-secondary-600">
                        <thead className="bg-secondary-50 text-secondary-900 font-bold border-b border-secondary-200">
                            <tr>
                                <th className="p-4">Title</th>
                                <th className="p-4">Journal</th>
                                <th className="p-4">Round</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100">
                            {articles.map(article => (
                                <tr key={article.id} className="hover:bg-secondary-50 transition-colors">
                                    <td className="p-4 max-w-xs">
                                        <div className="font-bold text-secondary-900 truncate" title={article.title}>{article.title}</div>
                                        <div className="text-xs text-secondary-500">{article.authors?.[0]?.name} • {new Date(article.submissionDate).toLocaleDateString()}</div>
                                    </td>
                                    <td className="p-4">{article.journal?.name}</td>
                                    <td className="p-4 font-mono text-xs">v{(article.versions?.length || 0)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${article.status === 'ACCEPTED' ? 'bg-success-100 text-success-700' :
                                                article.status === 'REJECTED' ? 'bg-danger-100 text-danger-700' :
                                                    article.status === 'PUBLISHED' ? 'bg-primary-100 text-primary-700' :
                                                        'bg-warning-100 text-warning-700'
                                            }`}>
                                            {article.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="p-4 flex gap-2">
                                        {isEditor && article.status === 'SUBMITTED' && (
                                            <button onClick={() => setIsAssigning(article.id)} className="text-primary-600 font-bold text-xs hover:underline bg-primary-50 px-2 py-1 rounded">Assign</button>
                                        )}
                                        <button onClick={() => fetchArticleDetails(article)} className="text-secondary-900 font-bold text-xs hover:underline bg-secondary-100 px-2 py-1 rounded">View</button>
                                    </td>
                                </tr>
                            ))}
                            {articles.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-secondary-400">No articles found.</td></tr>}
                        </tbody>
                    </table>
                </div>

                {/* MODALS */}
                {/* Submit Modal */}
                {isSubmitting && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]">
                            <h3 className="text-2xl font-bold mb-6">New Submission</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div><label className="label">Journal</label><select name="journalId" className="input" required><option value="">Select Journal</option>{journals.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}</select></div>
                                <div><label className="label">Title</label><input name="title" className="input" required /></div>
                                <div><label className="label">Abstract</label><textarea name="abstract" className="input h-32" required /></div>
                                <div><label className="label">Author Name</label><input name="authorName" className="input" required /></div>
                                <div><label className="label">Manuscript URL (File)</label><input name="fileUrl" className="input" placeholder="https://..." /></div>
                                <div className="flex gap-2 pt-4"><button className="btn btn-primary flex-1">Submit</button><button type="button" onClick={() => setIsSubmitting(false)} className="btn btn-secondary">Cancel</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Upload Version Modal */}
                {isUploadingVersion && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-bold mb-4">Upload Revision</h3>
                            <form onSubmit={handleUploadVersion} className="space-y-4">
                                <div><label className="label">New Manuscript URL</label><input name="fileUrl" className="input" required placeholder="https://..." /></div>
                                <div><label className="label">Changelog / Notes</label><textarea name="changelog" className="input h-32" placeholder="Briefly describe changes..." /></div>
                                <div className="flex gap-2 pt-4"><button className="btn btn-primary flex-1">Upload Revision</button><button type="button" onClick={() => setIsUploadingVersion(false)} className="btn btn-secondary">Cancel</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Assign Reviewer Modal */}
                {isAssigning && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-bold mb-4">Assign Reviewer</h3>
                            <form onSubmit={handleAssign} className="space-y-4">
                                <div>
                                    <label className="label">Reviewer</label>
                                    <select name="reviewerId" className="input" required>
                                        <option value="">Select Staff...</option>
                                        {reviewers.map(r => <option key={r.id} value={r.id}>{r.email} ({r.role})</option>)}
                                    </select>
                                </div>
                                <div><label className="label">Due Date</label><input name="dueDate" type="date" className="input" required /></div>
                                <div className="flex gap-2 pt-4"><button className="btn btn-primary flex-1">Assign</button><button type="button" onClick={() => setIsAssigning(null)} className="btn btn-secondary">Cancel</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* DETAILS VIEW */}
                {viewingArticle && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-[2rem] w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col md:flex-row overflow-hidden">
                            {/* Left Panel: Content */}
                            <div className="flex-1 p-8 overflow-y-auto border-r border-secondary-200">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary-100 text-secondary-600 uppercase">{viewingArticle.journal?.name}</span>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary-100 text-secondary-600 uppercase">v{articleVersions.length}</span>
                                        </div>
                                        <h2 className="text-2xl font-black text-secondary-900">{viewingArticle.title}</h2>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <section>
                                        <h4 className="flex items-center gap-2 text-xs font-black text-secondary-400 uppercase tracking-widest mb-3"><BookOpen size={14} /> Abstract</h4>
                                        <p className="text-secondary-700 text-sm leading-relaxed p-4 bg-secondary-50 rounded-xl border border-secondary-100">{viewingArticle.abstract}</p>
                                    </section>

                                    <section>
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="flex items-center gap-2 text-xs font-black text-secondary-400 uppercase tracking-widest"><Clock size={14} /> Version History</h4>
                                            {viewingArticle.status === 'REVISION_REQUESTED' && (
                                                <button onClick={() => setIsUploadingVersion(true)} className="text-[10px] font-bold bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700">Upload Revision</button>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            {articleVersions.map(v => (
                                                <div key={v.id} className="flex justify-between items-center p-3 rounded-xl border border-secondary-200 hover:bg-secondary-50">
                                                    <div>
                                                        <p className="font-bold text-xs text-secondary-900">Version {v.versionNumber}</p>
                                                        <p className="text-[10px] text-secondary-500">{new Date(v.submittedAt).toLocaleString()}</p>
                                                        {v.changelog && <p className="text-[10px] text-secondary-600 mt-1 italic">"{v.changelog}"</p>}
                                                    </div>
                                                    <a href={v.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-xs font-bold hover:underline flex items-center gap-1"><FileText size={12} /> View File</a>
                                                </div>
                                            ))}
                                            {articleVersions.length === 0 && <p className="text-xs text-secondary-400 italic">No files uploaded.</p>}
                                        </div>
                                    </section>

                                    <section>
                                        <h4 className="flex items-center gap-2 text-xs font-black text-secondary-400 uppercase tracking-widest mb-3"><UserCheck size={14} /> Peer Reviews</h4>
                                        <div className="space-y-3">
                                            {articleReviews.map(review => (
                                                <div key={review.id} className="p-4 rounded-xl border border-secondary-200 bg-white">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-secondary-200 flex items-center justify-center text-[10px] font-bold">{review.reviewer.email[0]}</div>
                                                            <div className="text-xs font-bold">{review.reviewer.email}</div>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${review.recommendation === 'ACCEPT' ? 'bg-success-100 text-success-700' :
                                                                review.recommendation === 'REJECT' ? 'bg-danger-100 text-danger-700' : 'bg-warning-100 text-warning-700'
                                                            }`}>{review.recommendation || 'Pending'}</span>
                                                    </div>
                                                    <p className="text-xs text-secondary-600 italic">"{review.commentsToAuthor}"</p>
                                                </div>
                                            ))}
                                            {articleReviews.length === 0 && <p className="text-xs text-secondary-400 italic">No reviews yet.</p>}
                                        </div>
                                    </section>
                                </div>
                            </div>

                            {/* Right Panel: Actions */}
                            <div className="w-full md:w-80 bg-secondary-50 p-8 flex flex-col gap-6 border-l border-secondary-200">
                                <button onClick={() => setViewingArticle(null)} className="self-end text-secondary-400 hover:text-secondary-900"><AlertTriangle size={20} className="rotate-45" /></button>

                                <div className="card-premium bg-white p-4 shadow-sm">
                                    <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-2">Current Status</h4>
                                    <div className="text-lg font-black text-secondary-900 uppercase">{viewingArticle.status.replace('_', ' ')}</div>
                                </div>

                                {viewingArticle.issue && (
                                    <div className="card-premium bg-white p-4 shadow-sm border-l-4 border-success-500">
                                        <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-2">Assigned To</h4>
                                        <div className="text-sm font-bold text-secondary-900">{viewingArticle.issue.title || `Issue ${viewingArticle.issue.issueNumber}`}</div>
                                    </div>
                                )}

                                {isEditor && (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Editorial Actions</p>

                                        {!viewingArticle.issueId && (
                                            <div className="p-3 bg-white rounded-xl border border-secondary-200">
                                                <label className="text-[10px] font-bold text-secondary-500 block mb-2">Assign to Issue (Production)</label>
                                                <select
                                                    className="w-full text-xs p-2 rounded-lg border border-secondary-200 mb-2"
                                                    onChange={(e) => {
                                                        if (e.target.value) handleIssueAssignment(e.target.value);
                                                    }}
                                                    value=""
                                                >
                                                    <option value="">Select Issue...</option>
                                                    {availableIssues.map((issue: any) => (
                                                        <option key={issue.id} value={issue.id}>Vol {issue.volumeNumber}, Iss {issue.issueNumber} ({issue.month})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => handleDecision('ACCEPTED')} className="btn bg-success-600 text-white text-xs py-2 rounded-lg hover:bg-success-700">Accept</button>
                                            <button onClick={() => handleDecision('REJECTED')} className="btn bg-danger-600 text-white text-xs py-2 rounded-lg hover:bg-danger-700">Reject</button>
                                            <button onClick={() => handleDecision('REVISION_REQUESTED')} className="col-span-2 btn bg-warning-500 text-white text-xs py-2 rounded-lg hover:bg-warning-600">Request Revision</button>
                                            <button onClick={() => handleDecision('PUBLISHED')} className="col-span-2 btn bg-primary-600 text-white text-xs py-2 rounded-lg hover:bg-primary-700">Publish Now</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
