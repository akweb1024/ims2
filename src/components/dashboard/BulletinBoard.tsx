'use client';

import { useState, useEffect, useCallback } from 'react';
import FormattedDate from '@/components/common/FormattedDate';

export default function BulletinBoard({ limit = 5 }: { limit?: number }) {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);

    const fetchAnnouncements = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/announcements?limit=${limit}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setAnnouncements(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUserRole(JSON.parse(userData).role);

        fetchAnnouncements();
    }, [fetchAnnouncements]);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setCreating(true);
        const formData = new FormData(e.currentTarget);
        const payload = {
            title: formData.get('title'),
            content: formData.get('content'),
            priority: formData.get('priority'),
            targetRole: formData.get('targetRole')
        };

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/announcements', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowModal(false);
                fetchAnnouncements();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <div className="h-40 flex items-center justify-center animate-pulse bg-secondary-50 rounded-2xl">Loading news...</div>;

    if (announcements.length === 0) return (
        <div className="card-premium p-8 text-center bg-secondary-50/50 border-dashed">
            <span className="text-4xl mb-4 block">📢</span>
            <p className="text-secondary-500 font-medium">No active announcements at the moment.</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {['SUPER_ADMIN', 'ADMIN'].includes(userRole) && (
                <button
                    onClick={() => setShowModal(true)}
                    className="w-full py-2 border-2 border-dashed border-primary-200 rounded-xl text-primary-600 text-[10px] font-black uppercase tracking-widest hover:bg-primary-50 transition-all mb-4"
                >
                    + Post New Announcement
                </button>
            )}

            {announcements.map((ann) => (
                <div key={ann.id} className={`p-5 rounded-2xl border-l-4 shadow-sm bg-white hover:shadow-md transition-shadow ${ann.priority === 'URGENT' ? 'border-danger-500 bg-red-50/10' :
                    ann.priority === 'IMPORTANT' ? 'border-warning-500' : 'border-primary-500'
                    }`}>
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-black text-secondary-900 leading-tight">{ann.title}</h4>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${ann.priority === 'URGENT' ? 'bg-danger-100 text-danger-700' :
                            ann.priority === 'IMPORTANT' ? 'bg-warning-100 text-warning-700' : 'bg-primary-100 text-primary-700'
                            }`}>
                            {ann.priority}
                        </span>
                    </div>
                    <p className="text-sm text-secondary-600 mb-4 whitespace-pre-wrap line-clamp-3">{ann.content}</p>
                    <div className="flex items-center justify-between text-[10px] font-bold text-secondary-400 uppercase tracking-[0.1em]">
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-secondary-100 rounded-full flex items-center justify-center text-[8px] text-secondary-600">
                                {ann.author.email[0].toUpperCase()}
                            </span>
                            {ann.author.email.split('@')[0]}
                        </div>
                        <FormattedDate date={ann.createdAt} />
                    </div>
                </div>
            ))}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
                        <div className="p-6 border-b border-secondary-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-secondary-900">Post Announcement</h3>
                            <button onClick={() => setShowModal(false)} className="text-secondary-400 hover:text-secondary-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="label">Headline</label>
                                <input name="title" required className="input" placeholder="Enter headline..." />
                            </div>
                            <div>
                                <label className="label">Content</label>
                                <textarea name="content" required className="input min-h-[120px]" placeholder="Type your message here..."></textarea>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Priority</label>
                                    <select name="priority" className="input">
                                        <option value="NORMAL">Normal</option>
                                        <option value="IMPORTANT">Important</option>
                                        <option value="URGENT">Urgent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Audience</label>
                                    <select name="targetRole" className="input">
                                        <option value="ALL">Everyone</option>
                                        <option value="STAFF">Staff Only</option>
                                        <option value="CUSTOMER">Customers Only</option>
                                    </select>
                                </div>
                            </div>
                            <button disabled={creating} type="submit" className="btn btn-primary w-full py-4 mt-4 font-bold rounded-2xl">
                                {creating ? 'Publishing...' : 'Publish Announcement'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
