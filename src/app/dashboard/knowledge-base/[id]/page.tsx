'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import ReactMarkdown from 'react-markdown';
import { KNOWLEDGE_BASE_CATEGORIES, getKnowledgeCategoryLabel } from '@/lib/knowledge-base';

export default function KnowledgeArticleDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const [article, setArticle] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [restoringRevisionId, setRestoringRevisionId] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [form, setForm] = useState({
        title: '',
        category: 'FAQ',
        targetRole: 'ALL',
        content: '',
        status: 'PUBLISHED',
        revisionNotes: '',
    });

    const canManage = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUserRole(JSON.parse(userData).role);
    }, []);

    useEffect(() => {
        const fetchArticle = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/knowledge-base/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to load article');
                setArticle(data);
                setForm({
                    title: data.title,
                    category: data.category,
                    targetRole: data.targetRole,
                    content: data.content,
                    status: data.status,
                    revisionNotes: '',
                });
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchArticle();
    }, [id]);

    const saveArticle = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/knowledge-base/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update article');
            setArticle(data);
            setEditing(false);
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : 'Failed to update article');
        } finally {
            setSaving(false);
        }
    };

    const restoreRevision = async (revisionId: string, revisionVersion: number) => {
        const confirmed = window.confirm(`Restore revision v${revisionVersion} as the new live version?`);
        if (!confirmed) return;

        setRestoringRevisionId(revisionId);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/knowledge-base/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    restoreRevisionId: revisionId,
                    revisionNotes: `Restored revision v${revisionVersion}`,
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to restore revision');
            setArticle(data);
            setForm({
                title: data.title,
                category: data.category,
                targetRole: data.targetRole,
                content: data.content,
                status: data.status,
                revisionNotes: '',
            });
            setEditing(false);
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : 'Failed to restore revision');
        } finally {
            setRestoringRevisionId(null);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="max-w-5xl mx-auto p-8 text-center text-secondary-500">Loading article...</div>
            </DashboardLayout>
        );
    }

    if (!article) {
        return (
            <DashboardLayout>
                <div className="max-w-5xl mx-auto p-8 text-center text-secondary-500">Article not found.</div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <Link href="/dashboard/knowledge-base" className="text-sm font-bold text-secondary-500 hover:text-secondary-900">
                            ← Back to Library
                        </Link>
                        <h1 className="text-4xl font-extrabold text-secondary-900 mt-3">{editing ? 'Edit Article' : article.title}</h1>
                        <div className="flex flex-wrap gap-3 mt-3 text-xs font-bold uppercase tracking-widest text-secondary-400">
                            <span>{getKnowledgeCategoryLabel(article.category)}</span>
                            <span>{article.targetRole}</span>
                            <span>{article.status}</span>
                            <span>v{article.version}</span>
                            <span>{article.views} views</span>
                        </div>
                    </div>
                    {canManage && (
                        <div className="flex gap-3">
                            {editing ? (
                                <>
                                    <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl border border-secondary-200 font-bold text-secondary-600">Cancel</button>
                                    <button onClick={saveArticle} disabled={saving} className="px-4 py-2 rounded-xl bg-primary-600 text-white font-bold">
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-xl bg-primary-600 text-white font-bold">Edit Article</button>
                            )}
                        </div>
                    )}
                </div>

                <div className="rounded-3xl border border-secondary-100 bg-white p-8 shadow-sm">
                    {editing ? (
                        <div className="space-y-5">
                            <input className="w-full rounded-xl border border-secondary-200 px-4 py-3 font-bold" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <select className="rounded-xl border border-secondary-200 px-4 py-3" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                    {KNOWLEDGE_BASE_CATEGORIES.map((category) => (
                                        <option key={category.value} value={category.value}>
                                            {category.label}
                                        </option>
                                    ))}
                                </select>
                                <select className="rounded-xl border border-secondary-200 px-4 py-3" value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })}>
                                    {['ALL', 'STAFF', 'CUSTOMER', 'AGENCY'].map((role) => <option key={role} value={role}>{role}</option>)}
                                </select>
                                <select className="rounded-xl border border-secondary-200 px-4 py-3" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                    {['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED'].map((status) => <option key={status} value={status}>{status}</option>)}
                                </select>
                            </div>
                            <input
                                className="w-full rounded-xl border border-secondary-200 px-4 py-3 text-sm"
                                value={form.revisionNotes}
                                onChange={(e) => setForm({ ...form, revisionNotes: e.target.value })}
                                placeholder="Revision note, for example: Updated pricing guidance and status"
                            />
                            <textarea rows={16} className="w-full rounded-xl border border-secondary-200 px-4 py-3 font-mono text-sm" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
                        </div>
                    ) : (
                        <article className="prose prose-slate max-w-none">
                            <ReactMarkdown>{article.content}</ReactMarkdown>
                        </article>
                    )}
                </div>

                <div className="rounded-3xl border border-secondary-100 bg-secondary-50 p-6 text-sm text-secondary-600">
                        <div className="flex flex-wrap gap-4">
                            <span>Author: <strong>{article.author?.name || article.author?.email || 'Unknown'}</strong></span>
                            <span>Created: <FormattedDate date={article.createdAt} /></span>
                            <span>Updated: <FormattedDate date={article.updatedAt} /></span>
                            {article.publishedAt && <span>Published: <FormattedDate date={article.publishedAt} /></span>}
                        </div>
                </div>

                <div className="rounded-3xl border border-secondary-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4 mb-5">
                        <div>
                            <h2 className="text-xl font-bold text-secondary-900">Revision History</h2>
                            <p className="text-sm text-secondary-500 mt-1">Saved snapshots of this article before each update.</p>
                        </div>
                        <div className="text-xs font-bold uppercase tracking-widest text-secondary-400">
                            {article.revisions?.length || 0} revisions
                        </div>
                    </div>

                    {!article.revisions?.length ? (
                        <div className="rounded-2xl bg-secondary-50 px-4 py-5 text-sm font-medium text-secondary-500">
                            No saved revisions yet.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {article.revisions.map((revision: any) => (
                                <div key={revision.id} className="rounded-2xl border border-secondary-100 bg-secondary-50 p-4">
                                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-secondary-900">
                                                <span>v{revision.version}</span>
                                                <span className="rounded-full bg-white px-2 py-1 text-[10px] uppercase tracking-widest text-secondary-500">
                                                    {revision.status}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-xs text-secondary-500">
                                                Saved by {revision.editor?.name || revision.editor?.email || 'Unknown'} on <FormattedDate date={revision.createdAt} />
                                            </div>
                                        </div>
                                        <div className="text-xs font-medium text-secondary-500 md:text-right">
                                            {revision.notes || 'Snapshot'}
                                        </div>
                                    </div>
                                    {canManage && (
                                        <div className="mt-3 flex justify-end">
                                            <button
                                                onClick={() => restoreRevision(revision.id, revision.version)}
                                                disabled={restoringRevisionId === revision.id}
                                                className="rounded-xl border border-secondary-200 bg-white px-3 py-2 text-xs font-bold text-secondary-700 transition hover:border-primary-300 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {restoringRevisionId === revision.id ? 'Restoring...' : 'Restore This Revision'}
                                            </button>
                                        </div>
                                    )}
                                    <div className="mt-3 rounded-xl bg-white px-3 py-3 text-sm text-secondary-600">
                                        <div className="font-semibold text-secondary-900">{revision.title}</div>
                                        <div className="mt-1 line-clamp-3 whitespace-pre-wrap break-words">{revision.content}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
