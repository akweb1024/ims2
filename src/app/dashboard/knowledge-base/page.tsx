'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import { KNOWLEDGE_BASE_LIBRARY_TABS, getKnowledgeCategoryLabel } from '@/lib/knowledge-base';

const decodeHtmlEntities = (value: string) =>
    value
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");

const getArticlePreview = (content: string) =>
    decodeHtmlEntities(
        content
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<\/?(div|p|section|article|aside|header|footer|ul|ol|li|br|hr|h[1-6])[^>]*>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/>\s?/g, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    )
        .replace(/\s+/g, ' ')
        .trim();

const getLatestReviewNote = (article: any) => article.revisions?.[0];

export default function KnowledgeBasePage() {
    const router = useRouter();
    const [articles, setArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState('');
    const [activeCategory, setActiveCategory] = useState('MY WORK');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const isPrivileged = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);

    const fetchArticles = useCallback(async (cat?: string, searchTerm?: string, roleOverride?: string) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let url = '/api/knowledge-base/my-work';
            const effectiveRole = roleOverride ?? userRole;
            const privilegedUser = ['SUPER_ADMIN', 'ADMIN'].includes(effectiveRole);

            if (cat !== 'MY WORK') {
                const params = new URLSearchParams();
                if (cat && cat !== 'ALL') params.set('category', cat);
                if (searchTerm) params.set('search', searchTerm);
                if (privilegedUser && statusFilter !== 'ALL') params.set('status', statusFilter);
                url = `/api/knowledge-base${params.toString() ? `?${params.toString()}` : ''}`;
            }

            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setArticles(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, userRole]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        const parsedRole = userData ? JSON.parse(userData).role ?? '' : '';
        if (parsedRole) setUserRole(parsedRole);
        fetchArticles('MY WORK', undefined, parsedRole);
    }, [fetchArticles]);

    useEffect(() => {
        fetchArticles(activeCategory, search);
    }, [activeCategory, fetchArticles, search, statusFilter, userRole]);

    const handleCategoryChange = (cat: string) => {
        setActiveCategory(cat);
        fetchArticles(cat, search);
    };

    const updateArticleStatus = async (articleId: string, nextStatus: string) => {
        const note = window.prompt(`Add a review note for moving this article to ${nextStatus}:`, `Moved to ${nextStatus}`);
        if (note === null) return;

        setActioningId(articleId);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/knowledge-base/${articleId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: nextStatus,
                    revisionNotes: note || `Moved to ${nextStatus}`,
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update article status');

            setArticles((current) => current.map((article) => article.id === articleId ? data : article));
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : 'Failed to update article status');
        } finally {
            setActioningId(null);
        }
    };

    const workflowStats = articles.reduce((acc, article) => {
        acc.total += 1;
        if (article.status === 'DRAFT') acc.draft += 1;
        if (article.status === 'IN_REVIEW') acc.inReview += 1;
        if (article.status === 'PUBLISHED') acc.published += 1;
        if (article.status === 'ARCHIVED') acc.archived += 1;
        return acc;
    }, { total: 0, draft: 0, inReview: 0, published: 0, archived: 0 });

    const reviewCards = [
        { label: 'Articles In View', value: workflowStats.total, tone: 'bg-slate-900 text-white' },
        { label: 'Draft Queue', value: workflowStats.draft, tone: 'bg-slate-100 text-slate-800' },
        { label: 'Needs Review', value: workflowStats.inReview, tone: 'bg-amber-100 text-amber-800' },
        { label: 'Published', value: workflowStats.published, tone: 'bg-emerald-100 text-emerald-800' },
    ];

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-8 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold text-secondary-900 tracking-tight">Knowledge Library</h1>
                        <p className="text-secondary-600 mt-2 text-lg">Central storage for SOPs, guides, and company documentation.</p>
                    </div>
                    {['SUPER_ADMIN', 'ADMIN'].includes(userRole) && (
                        <button
                            onClick={() => router.push('/dashboard/knowledge-base/new')}
                            className="btn btn-primary shadow-xl"
                        >
                            + Create Article
                        </button>
                    )}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {KNOWLEDGE_BASE_LIBRARY_TABS.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => handleCategoryChange(tab.value)}
                            className={`px-6 py-2 rounded-2xl font-bold whitespace-nowrap transition-all ${activeCategory === tab.value ? 'bg-primary-600 text-white shadow-lg' : 'bg-white text-secondary-500 hover:bg-secondary-50'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeCategory !== 'MY WORK' && (
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        {isPrivileged ? (
                            <div className="flex flex-wrap gap-2">
                                {['ALL', 'DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${statusFilter === status ? 'bg-secondary-900 text-white' : 'bg-white text-secondary-500 hover:bg-secondary-50'}`}
                                    >
                                        {status === 'ALL' ? 'All Statuses' : status.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        ) : <div />}
                        <div className="flex justify-end">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSearch(value);
                                fetchArticles(activeCategory, value);
                            }}
                            placeholder="Search knowledge articles..."
                            className="w-full max-w-md rounded-2xl border border-secondary-200 bg-white px-4 py-3 font-medium text-secondary-700 outline-none"
                        />
                        </div>
                    </div>
                )}

                {activeCategory !== 'MY WORK' && isPrivileged && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {reviewCards.map((card) => (
                            <div key={card.label} className={`rounded-3xl px-5 py-5 shadow-sm ${card.tone}`}>
                                <div className="text-[11px] font-black uppercase tracking-[0.18em] opacity-80">{card.label}</div>
                                <div className="mt-3 text-3xl font-black">{card.value}</div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            [1, 2, 3].map(i => <div key={i} className="h-48 bg-white animate-pulse rounded-3xl"></div>)
                        ) : articles.length === 0 ? (
                            <div className="col-span-full py-20 text-center card-premium">
                                <span className="text-5xl mb-4 block">📚</span>
                                <p className="text-secondary-500 font-bold">
                                    {activeCategory === 'MY WORK' ? 'No role-based guides are available yet.' : 'No articles found in this category.'}
                                </p>
                            </div>
                        ) : articles.map(article => (
                            <div key={article.id} className="card-premium group hover:border-primary-300 transition-all flex flex-col h-full">
                                {(() => {
                                    const latestReview = getLatestReviewNote(article);
                                    return latestReview ? (
                                        <div className="mb-4 rounded-2xl border border-secondary-100 bg-secondary-50 px-4 py-3">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-secondary-500">
                                                Latest Review Note
                                            </div>
                                            <div className="mt-2 text-sm font-medium text-secondary-700 line-clamp-3">
                                                {latestReview.notes || 'Snapshot recorded without a note.'}
                                            </div>
                                            <div className="mt-2 text-[11px] text-secondary-500">
                                                {latestReview.editor?.name || latestReview.editor?.email || 'Unknown reviewer'} • <FormattedDate date={latestReview.createdAt} />
                                            </div>
                                        </div>
                                    ) : null;
                                })()}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-2 flex-wrap">
                                        <span className="px-2 py-1 bg-secondary-100 text-secondary-600 text-[10px] font-black uppercase tracking-widest rounded-lg">{getKnowledgeCategoryLabel(article.category)}</span>
                                        <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${article.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : article.status === 'IN_REVIEW' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{article.status}</span>
                                    </div>
                                    <span className="text-secondary-300 group-hover:text-primary-400 transition-colors">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </span>
                                </div>
                                <Link href={`/dashboard/knowledge-base/${article.id}`} className="block">
                                    <h3 className="text-xl font-bold text-secondary-900 mb-3 group-hover:text-primary-600 transition-colors">{article.title}</h3>
                                    <p className="text-secondary-600 text-sm line-clamp-3 mb-6 flex-1">{getArticlePreview(article.content)}</p>
                                </Link>
                                {isPrivileged && activeCategory !== 'MY WORK' && (
                                    <div className="mb-5 flex flex-wrap gap-2">
                                        {article.status !== 'IN_REVIEW' && (
                                            <button
                                                onClick={() => updateArticleStatus(article.id, 'IN_REVIEW')}
                                                disabled={actioningId === article.id}
                                                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-amber-700 disabled:opacity-50"
                                            >
                                                Send To Review
                                            </button>
                                        )}
                                        {article.status !== 'PUBLISHED' && (
                                            <button
                                                onClick={() => updateArticleStatus(article.id, 'PUBLISHED')}
                                                disabled={actioningId === article.id}
                                                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-emerald-700 disabled:opacity-50"
                                            >
                                                Publish
                                            </button>
                                        )}
                                        {article.status !== 'ARCHIVED' && (
                                            <button
                                                onClick={() => updateArticleStatus(article.id, 'ARCHIVED')}
                                                disabled={actioningId === article.id}
                                                className="rounded-xl border border-secondary-200 bg-secondary-50 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-secondary-600 disabled:opacity-50"
                                            >
                                                Archive
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="flex items-center justify-between pt-4 border-t border-secondary-50 text-[10px] font-bold text-secondary-400 uppercase tracking-widest">
                                    <span>Views: {article.views}</span>
                                    <span><FormattedDate date={article.createdAt} /></span>
                                </div>
                            </div>
                        ))}
                    </div>
            </div>
        </DashboardLayout>
    );
}
