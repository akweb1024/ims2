'use client';

import { useState, useEffect, use } from 'react';
import PublicLayout from '@/components/PublicLayout';
import Link from 'next/link';
import { ChevronRight, FileText, Download } from 'lucide-react';

export default function IssuePage({ params }: { params: Promise<{ id: string, issueId: string }> }) {
    const { id, issueId } = use(params);
    const [articles, setArticles] = useState<any[]>([]);
    const [journal, setJournal] = useState<any>(null); // Ideally we fetch issue details too for title
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const resJ = await fetch(`/api/public/journals/${id}`);
                if (resJ.ok) setJournal(await resJ.json());

                const resA = await fetch(`/api/public/issues/${issueId}/articles`);
                if (resA.ok) setArticles(await resA.json());
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchInitial();
    }, [id, issueId]);

    if (loading) return <PublicLayout><div className="p-20 text-center">Loading Content...</div></PublicLayout>;

    return (
        <PublicLayout>
            <div className="bg-secondary-50 border-b border-secondary-200 py-8">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-secondary-500 mb-4">
                        <Link href={`/journals/${id}/archives`} className="hover:text-primary-600">Archives</Link>
                        <ChevronRight size={14} />
                        <span>Issue Content</span>
                    </div>
                    <h1 className="text-3xl font-black text-secondary-900">{journal?.name}</h1>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-12 space-y-6">
                {articles.map((article: any) => (
                    <div key={article.id} className="bg-white p-6 rounded-2xl border border-secondary-200 hover:border-primary-200 hover:shadow-lg transition-all">
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                                <Link href={`/journals/${id}/articles/${article.id}`}>
                                    <h3 className="text-xl font-bold text-secondary-900 mb-2 hover:text-primary-600 transition-colors leading-tight">
                                        {article.title}
                                    </h3>
                                </Link>
                                <p className="text-sm text-secondary-500 mb-4">
                                    {article.authors.map((a: any) => a.name).join(', ')}
                                </p>
                                <div className="flex gap-4">
                                    <Link href={`/journals/${id}/articles/${article.id}`} className="text-xs font-bold uppercase tracking-wider text-primary-600 hover:underline flex items-center gap-1">
                                        <FileText size={14} /> Abstract
                                    </Link>
                                    {article.versions?.[0]?.fileUrl && (
                                        <a href={article.versions[0].fileUrl} target="_blank" className="text-xs font-bold uppercase tracking-wider text-secondary-600 hover:text-primary-600 flex items-center gap-1">
                                            <Download size={14} /> PDF
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </PublicLayout>
    );
}
