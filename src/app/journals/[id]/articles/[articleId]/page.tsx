'use client';

import { useState, useEffect, use } from 'react';
import PublicLayout from '@/components/PublicLayout';
import Link from 'next/link';
import { ChevronRight, Download, Calendar, User, BookOpen } from 'lucide-react';

export default function ArticlePage({ params }: { params: Promise<{ id: string, articleId: string }> }) {
    const { id, articleId } = use(params);
    const [article, setArticle] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                const res = await fetch(`/api/public/articles/${articleId}`);
                if (res.ok) setArticle(await res.json());
                else if (res.status === 404) setArticle(null);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchArticle();
    }, [articleId]);

    if (loading) return <PublicLayout><div className="p-20 text-center">Loading Article...</div></PublicLayout>;
    if (!article) return <PublicLayout><div className="p-20 text-center">Article not found.</div></PublicLayout>;

    const pdfUrl = article.versions?.[0]?.fileUrl;

    return (
        <PublicLayout>
            <div className="bg-secondary-50 border-b border-secondary-200 py-6">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-secondary-500 mb-4 uppercase tracking-wider">
                        <Link href={`/journals/${id}`} className="hover:text-primary-600 truncate max-w-[150px]">{article.journal.name}</Link>
                        <ChevronRight size={12} />
                        <span>Vol {article.issue.volume.volumeNumber}, Issue {article.issue.issueNumber}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-4 gap-12">
                <div className="lg:col-span-3">
                    <h1 className="text-3xl md:text-5xl font-black text-secondary-900 mb-6 leading-tight">{article.title}</h1>

                    <div className="flex flex-wrap gap-4 mb-8">
                        {article.authors.map((author: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-secondary-700 bg-secondary-50 px-3 py-1.5 rounded-lg border border-secondary-100">
                                <User size={14} className="text-secondary-400" />
                                <span className="font-bold">{author.name}</span>
                                {author.affiliation && <span className="text-secondary-400 border-l border-secondary-300 pl-2 ml-1 italic">{author.affiliation}</span>}
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4 mb-12 border-y border-secondary-100 py-6">
                        <div className="flex items-center gap-2 text-sm text-secondary-500">
                            <Calendar size={16} />
                            <span>Published: <strong>{article.issue.month} {article.issue.year}</strong></span>
                        </div>
                        {/* Add DOI here later */}
                    </div>

                    <div className="prose prose-lg max-w-none text-secondary-800">
                        <h3 className="font-black uppercase text-sm tracking-widest text-secondary-400 mb-4">Abstract</h3>
                        <p className="leading-relaxed bg-secondary-50/50 p-6 rounded-2xl border border-secondary-100/50">
                            {article.abstract || 'No abstract available.'}
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-primary-50 rounded-2xl p-6 border border-primary-100">
                        <h3 className="font-black text-primary-900 mb-2 flex items-center gap-2"><BookOpen size={18} /> Access</h3>
                        <p className="text-sm text-primary-700 mb-6">This article is open access and free to read/download.</p>

                        {pdfUrl ? (
                            <a href={pdfUrl} target="_blank" className="btn btn-primary w-full flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20">
                                <Download size={18} /> Download PDF
                            </a>
                        ) : (
                            <button disabled className="btn btn-secondary w-full text-secondary-400 cursor-not-allowed">
                                PDF Not Available
                            </button>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-secondary-200">
                        <h3 className="font-bold text-secondary-900 mb-4 text-sm uppercase tracking-widest">Share</h3>
                        {/* Social Share Buttons Placeholder */}
                        <div className="flex gap-2">
                            <button className="w-8 h-8 rounded-full bg-secondary-100 text-secondary-600 flex items-center justify-center hover:bg-secondary-200">X</button>
                            <button className="w-8 h-8 rounded-full bg-secondary-100 text-secondary-600 flex items-center justify-center hover:bg-secondary-200">f</button>
                            <button className="w-8 h-8 rounded-full bg-secondary-100 text-secondary-600 flex items-center justify-center hover:bg-secondary-200">in</button>
                        </div>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
