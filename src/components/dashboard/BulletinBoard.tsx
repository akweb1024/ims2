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

    if (loading) return <div className="flex h-40 items-center justify-center rounded-xl bg-muted animate-pulse text-sm text-muted-foreground">Loading news...</div>;

    if (announcements.length === 0) return (
        <div className="glass-card border-dashed p-8 text-center">
            <span className="text-4xl mb-4 block">📢</span>
            <p className="font-medium text-muted-foreground">No active announcements at the moment.</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {['SUPER_ADMIN', 'ADMIN'].includes(userRole) && (
                <button
                    onClick={() => setShowModal(true)}
                    className="mb-4 w-full rounded-xl border-2 border-dashed border-primary/30 py-2 text-[10px] font-black uppercase tracking-widest text-primary transition-colors hover:bg-accent"
                >
                    + Post New Announcement
                </button>
            )}

            {announcements.map((ann) => (
                <div key={ann.id} className={`rounded-xl border border-border/60 border-l-4 bg-card p-5 text-card-foreground shadow-sm transition-shadow hover:shadow-md ${ann.priority === 'URGENT' ? 'border-l-destructive bg-destructive/5' :
                    ann.priority === 'IMPORTANT' ? 'border-l-chart-5' : 'border-l-primary'
                    }`}>
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-black leading-tight text-foreground">{ann.title}</h4>
                        <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${ann.priority === 'URGENT' ? 'bg-destructive/10 text-destructive' :
                            ann.priority === 'IMPORTANT' ? 'bg-chart-5/20 text-chart-5' : 'bg-primary/10 text-primary'
                            }`}>
                            {ann.priority}
                        </span>
                    </div>
                    <p className="mb-4 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{ann.content}</p>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[8px] text-muted-foreground">
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md animate-slide-up overflow-hidden rounded-lg border border-border bg-card shadow-xl">
                        <div className="flex items-center justify-between border-b border-border p-6">
                            <h3 className="text-xl font-bold text-foreground">Post Announcement</h3>
                            <button onClick={() => setShowModal(false)} className="text-muted-foreground transition-colors hover:text-foreground">
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
                            <button disabled={creating} type="submit" className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                                {creating ? 'Publishing...' : 'Publish Announcement'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
