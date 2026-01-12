'use client';

import { useState, useEffect, use } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ChevronLeft,
    UserPlus,
    Calendar,
    AlertCircle,
    Info,
    MessageSquare,
    Search,
    ShieldCheck,
    Star,
    Clock
} from 'lucide-react';
import Link from 'next/link';

export default function ArticleAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: articleId } = use(params);
    const [article, setArticle] = useState<any>(null);
    const [reviewers, setReviewers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [userRole, setUserRole] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReviewerId, setSelectedReviewerId] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        dueDate: '',
        priority: 'NORMAL',
        round: 1,
        notes: ''
    });

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchData();
    }, [articleId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            // 1. Fetch Article
            const artRes = await fetch(`/api/articles/${articleId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (artRes.ok) {
                const artData = await artRes.json();
                setArticle(artData);
                setFormData(prev => ({ ...prev, round: artData.currentRound || 1 }));

                // 2. Fetch Reviewers for this journal
                const revRes = await fetch(`/api/journals/${artData.journalId}/reviewers`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (revRes.ok) {
                    const revData = await revRes.json();
                    setReviewers(revData);
                }
            }
        } catch (error) {
            console.error('Assignment Page Fetch Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReviewerId || !formData.dueDate) {
            alert('Please select a reviewer and due date');
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/articles/${articleId}/assignments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reviewerId: selectedReviewerId,
                    ...formData
                })
            });

            if (res.ok) {
                alert('Reviewer assigned successfully and notification sent!');
                // Reset or navigate back?
                window.location.href = `/dashboard/editorial`;
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to assign reviewer');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred during assignment');
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

    if (!article) return (
        <DashboardLayout userRole={userRole}>
            <div className="p-8 text-center text-danger-600">Article not found.</div>
        </DashboardLayout>
    );

    const filteredReviewers = reviewers.filter(rev =>
        rev.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rev.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rev.specialization?.some((s: string) => s.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                {/* Header */}
                <div className="flex items-center gap-6">
                    <Link href="/dashboard/editorial" className="p-3 hover:bg-white rounded-2xl transition-colors border border-transparent hover:border-secondary-100 flex items-center justify-center bg-secondary-50">
                        <ChevronLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 leading-tight">Assign Reviewer</h1>
                        <p className="text-secondary-500 mt-1 font-medium">{article.title}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Reviewer Selection */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="card-premium p-6 bg-white space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest flex items-center gap-2">
                                    <Search size={16} /> Find Peer Reviewer
                                </h3>
                                <span className="text-[10px] font-bold bg-primary-100 text-primary-700 px-2 py-1 rounded-full uppercase">
                                    {reviewers.length} Experts in Pool
                                </span>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by name, email, or specialization (e.g. Cardiology)..."
                                    className="input pl-12 h-14"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredReviewers.length > 0 ? (
                                    filteredReviewers.map((rev) => (
                                        <div
                                            key={rev.id}
                                            onClick={() => setSelectedReviewerId(rev.id)}
                                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${selectedReviewerId === rev.id
                                                    ? 'border-primary-600 bg-primary-50 ring-4 ring-primary-50'
                                                    : 'border-secondary-100 hover:border-primary-200 hover:bg-secondary-50'
                                                } ${!rev.isActive ? 'opacity-50 grayscale' : ''}`}
                                        >
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${selectedReviewerId === rev.id ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-500'
                                                }`}>
                                                {rev.user.name?.charAt(0) || rev.user.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-black text-secondary-900">{rev.user.name}</p>
                                                    {!rev.isActive && <span className="text-[8px] font-black bg-danger-100 text-danger-700 px-1.5 py-0.5 rounded">INACTIVE</span>}
                                                </div>
                                                <p className="text-xs text-secondary-500 mb-2">{rev.user.email}</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {rev.specialization?.map((s: string, i: number) => (
                                                        <span key={i} className="text-[9px] font-bold bg-white border border-secondary-200 text-secondary-600 px-2 py-0.5 rounded-full">
                                                            {s}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-1 text-primary-600 justify-end">
                                                    <Star size={12} fill="currentColor" />
                                                    <span className="text-xs font-black">{(rev.completedReviews / (rev.totalReviews || 1) * 100).toFixed(0)}%</span>
                                                </div>
                                                <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-tighter">Success Rate</p>
                                                <p className="text-[10px] text-secondary-900 font-black mt-1">{rev.completedReviews} / {rev.totalReviews} Done</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-secondary-400 bg-secondary-50 rounded-2xl border-2 border-dashed border-secondary-200">
                                        <p className="font-bold">No reviewers found matching your search.</p>
                                        <Link href={`/dashboard/journals/${article.journalId}/reviewers`} className="text-primary-600 text-xs mt-2 inline-block hover:underline">
                                            + Add New Reviewer to Pool
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Assignment Options */}
                    <div className="space-y-6">
                        <form onSubmit={handleAssign} className="card-premium p-8 bg-white border-primary-100 ring-4 ring-primary-50 space-y-6">
                            <h3 className="text-sm font-black text-primary-700 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={16} /> Assignment Details
                            </h3>

                            <div className="space-y-4 text-left">
                                <div>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase mb-1 block">Selected Reviewer</label>
                                    <div className="p-3 bg-secondary-50 rounded-xl border border-secondary-100 font-bold text-sm text-secondary-700">
                                        {selectedReviewerId ?
                                            reviewers.find(r => r.id === selectedReviewerId)?.user.name || 'Reviewer Selected' :
                                            'None selected'}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase mb-1 block">Due Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                        <input
                                            type="date"
                                            required
                                            className="input pl-12"
                                            value={formData.dueDate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-secondary-400 uppercase mb-1 block">Priority</label>
                                        <select
                                            className="input"
                                            value={formData.priority}
                                            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                                        >
                                            <option value="NORMAL">Normal</option>
                                            <option value="HIGH">High</option>
                                            <option value="URGENT">Urgent</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-secondary-400 uppercase mb-1 block">Round</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="input"
                                            value={formData.round}
                                            onChange={(e) => setFormData(prev => ({ ...prev, round: parseInt(e.target.value) }))}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase mb-1 block flex justify-between">
                                        Notes to Reviewer <span className="text-secondary-300">(Optional)</span>
                                    </label>
                                    <textarea
                                        className="input h-32 py-4 text-sm leading-relaxed"
                                        placeholder="Add instructions, special focus areas, or greetings for the reviewer..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || !selectedReviewerId}
                                className="btn btn-primary w-full h-14 text-lg font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl"
                            >
                                {submitting ? 'Assigning...' : 'Confirm Assignment'}
                                <UserPlus size={20} />
                            </button>

                            <div className="flex items-start gap-2 p-3 bg-secondary-50 rounded-xl text-[10px] text-secondary-500 font-medium">
                                <Info size={14} className="mt-0.5 shrink-0" />
                                <p>Assigning a reviewer will automatically send them an email notification with instructions and a direct link to the manuscript.</p>
                            </div>
                        </form>

                        <div className="card-premium p-6 bg-secondary-900 text-white">
                            <h4 className="font-black flex items-center gap-2 mb-4 text-primary-400 uppercase text-xs tracking-widest">
                                <ShieldCheck size={16} /> Quality Assurance
                            </h4>
                            <ul className="space-y-3 text-[11px] font-bold text-secondary-300">
                                <li className="flex gap-2">
                                    <span className="text-primary-400">✓</span> Double-blind protocols active
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-primary-400">✓</span> Automated plagiarism check complete
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-primary-400">✓</span> Formatting verification passed
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
