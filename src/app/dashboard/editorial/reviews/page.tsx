'use client';

import { useState, useEffect } from 'react';

export default function ReviewerDashboard() {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>('');
    const [isCompleting, setIsCompleting] = useState<string | null>(null);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/editorial/reviews', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setReviews(await res.json());
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isCompleting) return;

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/editorial/reviews/${isCompleting}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                setIsCompleting(null);
                fetchReviews();
            } else {
                alert('Failed to submit review');
            }
        } catch (error) { console.error(error); }
    };

    if (loading) return <div className="p-8 text-center text-secondary-500">Loading your reviews...</div>;

    return (
        <>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-black text-secondary-900">My Review Assignments</h1>
                    <p className="text-secondary-500">Manage manuscripts assigned to you for peer review</p>
                </div>

                <div className="space-y-4">
                    {reviews.map(review => (
                        <div key={review.id} className="card-premium p-6 border border-secondary-100 flex flex-col md:flex-row gap-6 hover:shadow-premium-lg transition-all">
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-xl font-bold text-secondary-900 mb-2">{review.article.title}</h3>
                                    <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${review.status === 'COMPLETED' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}`}>
                                        {review.status}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm mb-4">
                                    <span className="text-secondary-500"><strong>Journal:</strong> {review.article.journal.name}</span>
                                    <span className="text-secondary-500"><strong>Authors:</strong> {review.article.authors.map((a: any) => a.name).join(', ')}</span>
                                </div>
                                {review.dueDate && (
                                    <p className="text-xs font-bold text-danger-600 uppercase tracking-widest">
                                        Due Date: {new Date(review.dueDate).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-col justify-center gap-2">
                                {review.status === 'PENDING' ? (
                                    <button
                                        onClick={() => setIsCompleting(review.id)}
                                        className="btn btn-primary"
                                    >
                                        Start Review
                                    </button>
                                ) : (
                                    <button className="btn btn-secondary cursor-not-allowed" disabled>Completed</button>
                                )}
                            </div>
                        </div>
                    ))}

                    {reviews.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-secondary-200">
                            <div className="text-6xl mb-4 opacity-30">✍️</div>
                            <h3 className="text-xl font-bold text-secondary-900">No Pending Reviews</h3>
                            <p className="text-secondary-500 mt-2">You will be notified when a manuscript is assigned to you.</p>
                        </div>
                    )}
                </div>

                {/* Review Submission Modal */}
                {isCompleting && (
                    <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2rem] p-10 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                            <h3 className="text-2xl font-bold mb-6">Submit peer Review</h3>
                            <form onSubmit={handleReviewSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="label">Rating (1-10)</label>
                                        <input name="rating" type="number" min="1" max="10" className="input" required />
                                    </div>
                                    <div>
                                        <label className="label">Recommendation</label>
                                        <select name="recommendation" className="input" required>
                                            <option value="">Select one...</option>
                                            <option value="ACCEPT">Accept as is</option>
                                            <option value="MINOR_REVISION">Minor Revision</option>
                                            <option value="MAJOR_REVISION">Major Revision</option>
                                            <option value="REJECT">Reject</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Comments to Author (Public)</label>
                                    <textarea name="commentsToAuthor" className="input h-32" required placeholder="Detailed feedback for the authors..." />
                                </div>
                                <div>
                                    <label className="label">Comments to Editor (Private)</label>
                                    <textarea name="commentsToEditor" className="input h-24" placeholder="Confidential notes for the editorial team..." />
                                </div>
                                <div className="flex gap-2 pt-6">
                                    <button type="submit" className="btn btn-primary flex-1">Submit Final Review</button>
                                    <button type="button" onClick={() => setIsCompleting(null)} className="btn btn-secondary">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
