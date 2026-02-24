'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function SupportPage() {
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [priority, setPriority] = useState('MEDIUM');
    const [tickets, setTickets] = useState<any[]>([]);
    const [guidelines, setGuidelines] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('ALL');

    const fetchTickets = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/support/tickets', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTickets(data);
            }
        } catch (err) {
            console.error('Fetch tickets error:', err);
        }
    }, []);

    const fetchGuidelines = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            let url = `/api/guidelines?limit=6`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
            if (activeCategory !== 'ALL') url += `&category=${encodeURIComponent(activeCategory)}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setGuidelines(data);
            }
        } catch (err) {
            console.error('Fetch guidelines error:', err);
        }
    }, [searchQuery, activeCategory]);

    const fetchAnnouncements = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/announcements?limit=3', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(data);
            }
        } catch (err) {
            console.error('Fetch announcements error:', err);
        }
    }, []);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
            fetchTickets();
            fetchGuidelines();
            fetchAnnouncements();
        }
    }, [fetchTickets, fetchGuidelines, fetchAnnouncements]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/support/tickets', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ subject, description: message, priority })
            });

            if (res.ok) {
                setSuccess(true);
                setSubject('');
                setMessage('');
                fetchTickets();
            } else {
                alert('Failed to submit ticket');
            }
        } catch (err) {
            console.error('Support error:', err);
            alert('An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const categories = ['ALL', 'BILLING', 'IT', 'HR', 'CRM', 'SUBSCRIPTION'];

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">Support Center & Guidelines</h1>
                        <p className="text-secondary-600">Search guidelines, stay updated, or get help with your account</p>
                    </div>
                    <div className="relative w-full md:w-96">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Search guidelines (e.g. 'Invoicing', 'Tax')..."
                            className="input pl-10 w-full shadow-lg shadow-black/5"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Guidelines & Hub */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3 space-y-8">
                        {/* Category Filters */}
                        <div className="flex flex-wrap gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeCategory === cat
                                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                                            : 'bg-white text-secondary-500 hover:bg-secondary-50 border border-secondary-200'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Guideline Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {guidelines.length === 0 ? (
                                <div className="col-span-full py-20 text-center card-premium border-dashed border-2">
                                    <div className="text-4xl mb-4">📚</div>
                                    <h3 className="text-xl font-bold text-secondary-900">No guidelines found</h3>
                                    <p className="text-secondary-500 max-w-sm mx-auto">Try searching for a different keyword or check a different category.</p>
                                </div>
                            ) : (
                                guidelines.map(art => (
                                    <div key={art.id} className="card-premium p-6 hover:shadow-xl transition-all group flex flex-col justify-between h-full">
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="badge badge-primary text-[10px]">{art.category}</span>
                                                <span className="text-[10px] text-secondary-400 uppercase font-black tracking-widest">{new Date(art.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <h4 className="text-lg font-bold text-secondary-900 group-hover:text-primary-600 transition-colors mb-2 line-clamp-1">{art.title}</h4>
                                            <div className="text-sm text-secondary-600 line-clamp-3 mb-4 prose prose-sm overflow-hidden" dangerouslySetInnerHTML={{ __html: art.content.length > 150 ? art.content.substring(0, 150) + '...' : art.content }}></div>
                                        </div>
                                        <button className="text-sm font-bold text-primary-600 flex items-center gap-2 hover:gap-3 transition-all self-start">
                                            Read Full Guideline <span>→</span>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        {/* Support Status */}
                        <div className="card-premium bg-secondary-900 text-white border-secondary-900">
                            <h3 className="font-bold flex items-center gap-2 mb-4">
                                <span className="p-1.5 bg-secondary-800 rounded-lg">🎫</span>
                                Support Tickets
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm border-b border-secondary-800 pb-3">
                                    <span className="text-secondary-400">Total Requests</span>
                                    <span className="font-bold font-mono text-lg">{tickets.length}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm border-b border-secondary-800 pb-3">
                                    <span className="text-secondary-400">Open Tickets</span>
                                    <span className="font-bold text-success-400 font-mono text-lg">{tickets.filter(t => t.status === 'OPEN').length}</span>
                                </div>
                                <button className="w-full btn bg-white/10 hover:bg-white/20 text-white text-xs py-2">
                                    Manage My Tickets
                                </button>
                            </div>
                        </div>

                        {/* Latest Updates / Announcements */}
                        <div className="card-premium p-0 overflow-hidden border-warning-100 ring-4 ring-warning-50/50">
                            <div className="p-4 bg-warning-50 border-b border-warning-100 flex justify-between items-center">
                                <h3 className="font-black text-[11px] text-warning-800 uppercase tracking-widest flex items-center gap-2">
                                    <span className="animate-pulse">🔔</span> Latest Updates
                                </h3>
                                <div className="w-2 h-2 rounded-full bg-warning-500"></div>
                            </div>
                            <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar bg-white">
                                {announcements.length === 0 ? (
                                    <p className="text-xs text-secondary-500 italic text-center py-4">No recent announcements.</p>
                                ) : (
                                    announcements.map(ann => (
                                        <div key={ann.id} className="group relative pl-4 border-l-2 border-secondary-100 hover:border-warning-400 transition-colors py-1">
                                            <div className="text-[10px] font-bold text-secondary-400 mb-1">{new Date(ann.createdAt).toLocaleDateString()}</div>
                                            <h4 className="text-xs font-bold text-secondary-800 line-clamp-1">{ann.title}</h4>
                                            <p className="text-[11px] text-secondary-500 line-clamp-2 mt-1">{ann.content}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 border-t border-secondary-100">
                    <div className="lg:col-span-4 space-y-6">
                        <div className="card-premium shadow-sm">
                            <h3 className="font-bold text-secondary-900 mb-4">Instant Support</h3>
                            <div className="space-y-4 text-sm text-secondary-600">
                                <div className="flex items-center p-3 bg-secondary-50 rounded-xl">
                                    <span className="text-xl mr-3">📧</span>
                                    <div>
                                        <div className="font-bold text-secondary-900">Email Us</div>
                                        <div className="text-xs">support@nanoims.com</div>
                                    </div>
                                </div>
                                <div className="flex items-center p-3 bg-secondary-50 rounded-xl">
                                    <span className="text-xl mr-3">📞</span>
                                    <div>
                                        <div className="font-bold text-secondary-900">Call Center</div>
                                        <div className="text-xs">+91 800-STM-HELP</div>
                                    </div>
                                </div>
                                <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100 mt-4">
                                    <p className="text-xs text-primary-800 font-medium leading-relaxed">
                                        Need a real-time answer? Try searching our Guideline Hub above. We&apos;ve documented 90% of common internal processes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-8">
                        <div className="card-premium">
                            <h3 className="text-lg font-bold text-secondary-900 mb-6">Create Support Ticket</h3>
                            {success ? (
                                <div className="bg-success-50 text-success-700 p-8 rounded-3xl text-center border border-success-100">
                                    <div className="text-4xl mb-4">✅</div>
                                    <h4 className="text-xl font-bold mb-2">Message Sent Successfully!</h4>
                                    <p className="mb-6 opacity-80">Our support team will get back to you within 24 business hours.</p>
                                    <button
                                        onClick={() => setSuccess(false)}
                                        className="btn btn-primary"
                                    >
                                        Send Another Message
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Inquiry Subject</label>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="e.g. Cannot access full-text PDF"
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Priority</label>
                                            <select
                                                className="input"
                                                value={priority}
                                                onChange={(e) => setPriority(e.target.value)}
                                            >
                                                <option value="LOW">Low</option>
                                                <option value="MEDIUM">Medium</option>
                                                <option value="HIGH">High</option>
                                                <option value="URGENT">Urgent</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">Detailed Description</label>
                                        <textarea
                                            className="input h-32"
                                            placeholder="Please provide details about the issue..."
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            required
                                        ></textarea>
                                    </div>
                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="btn btn-primary w-full shadow-lg shadow-primary-200"
                                        >
                                            {isSubmitting ? 'Sending inquiry...' : 'Submit Support Request'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
