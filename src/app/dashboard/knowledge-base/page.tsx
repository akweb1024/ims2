'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';

export default function KnowledgeBasePage() {
    const [articles, setArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [activeCategory, setActiveCategory] = useState('ALL');

    const categories = ['ALL', 'FAQ', 'SOP', 'Product Guide', 'Internal Policy'];

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUserRole(JSON.parse(userData).role);
        fetchArticles();
    }, []);

    const fetchArticles = async (cat?: string) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const url = cat && cat !== 'ALL' ? `/api/knowledge-base?category=${cat}` : '/api/knowledge-base';
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setArticles(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryChange = (cat: string) => {
        setActiveCategory(cat);
        fetchArticles(cat);
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-8 max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold text-secondary-900 tracking-tight">Knowledge Library</h1>
                        <p className="text-secondary-600 mt-2 text-lg">Central storage for SOPs, guides, and company documentation.</p>
                    </div>
                    {['SUPER_ADMIN', 'ADMIN'].includes(userRole) && (
                        <button className="btn btn-primary shadow-xl">+ Create Article</button>
                    )}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => handleCategoryChange(cat)}
                            className={`px-6 py-2 rounded-2xl font-bold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-primary-600 text-white shadow-lg' : 'bg-white text-secondary-500 hover:bg-secondary-50'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        [1, 2, 3].map(i => <div key={i} className="h-48 bg-white animate-pulse rounded-3xl"></div>)
                    ) : articles.length === 0 ? (
                        <div className="col-span-full py-20 text-center card-premium">
                            <span className="text-5xl mb-4 block">📚</span>
                            <p className="text-secondary-500 font-bold">No articles found in this category.</p>
                        </div>
                    ) : articles.map(article => (
                        <div key={article.id} className="card-premium group hover:border-primary-300 transition-all flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <span className="px-2 py-1 bg-secondary-100 text-secondary-600 text-[10px] font-black uppercase tracking-widest rounded-lg">{article.category}</span>
                                <span className="text-secondary-300 group-hover:text-primary-400 transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-secondary-900 mb-3 group-hover:text-primary-600 transition-colors">{article.title}</h3>
                            <p className="text-secondary-600 text-sm line-clamp-3 mb-6 flex-1">{article.content}</p>
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
