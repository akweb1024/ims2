'use client';

import { useState, useEffect, useCallback } from 'react';

type GuidelineHelpProps = {
    category?: string;
    search?: string;
    title?: string;
    description?: string;
    variant?: 'popover' | 'sidebar' | 'inline';
};

export default function GuidelineHelp({ category, search, title = "Process Guide", description, variant = 'popover' }: GuidelineHelpProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [articles, setArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchArticles = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let url = `/api/guidelines?limit=3`;
            if (category) url += `&category=${encodeURIComponent(category)}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;

            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setArticles(data);
            }
        } catch (err) {
            console.error('Fetch guideline help error:', err);
        } finally {
            setLoading(false);
        }
    }, [category, search]);

    useEffect(() => {
        if (isOpen && articles.length === 0) {
            fetchArticles();
        }
    }, [isOpen, articles.length, fetchArticles]);

    if (variant === 'inline') {
        return (
            <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 my-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">💡</span>
                    <h5 className="font-bold text-primary-900 text-sm whitespace-nowrap">{title}</h5>
                </div>
                {description && <p className="text-xs text-primary-700 mb-3 leading-relaxed">{description}</p>}
                
                {loading ? (
                    <div className="flex justify-center py-2">
                        <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : articles.length > 0 ? (
                    <div className="space-y-2">
                        {articles.map(art => (
                            <div key={art.id} className="text-[11px] bg-white/50 p-2 rounded-lg border border-primary-100 hover:border-primary-300 transition-colors">
                                <div className="font-bold text-primary-900 mb-1">{art.title}</div>
                                <div className="text-primary-700 opacity-80" dangerouslySetInnerHTML={{ __html: art.content }}></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-[10px] text-primary-400 italic">Finding latest guidelines for this process...</p>
                )}
            </div>
        );
    }

    return (
        <div className="relative inline-block">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning-50 text-warning-700 hover:bg-warning-100 border border-warning-200 transition-all shadow-sm group"
                title="View process guidelines"
            >
                <span className="text-sm group-hover:rotate-12 transition-transform">💡</span>
                <span className="text-[10px] font-black uppercase tracking-tight">Need Help?</span>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-secondary-100 z-[101] overflow-hidden animate-in zoom-in-95 duration-200 origin-top-right">
                        <div className="p-4 bg-secondary-50 border-b border-secondary-100 flex justify-between items-center">
                            <h5 className="font-bold text-secondary-900 text-xs">Internal Process Support</h5>
                            <button onClick={() => setIsOpen(false)} className="text-secondary-400 hover:text-secondary-900">×</button>
                        </div>
                        <div className="p-4 space-y-4 max-h-80 overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="text-center py-4">
                                    <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                </div>
                            ) : articles.length > 0 ? (
                                articles.map(art => (
                                    <div key={art.id} className="space-y-1">
                                        <h6 className="text-xs font-bold text-primary-600">{art.title}</h6>
                                        <div className="text-[11px] text-secondary-600 leading-relaxed prose prose-xs" dangerouslySetInnerHTML={{ __html: art.content }}></div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-xs text-secondary-500 italic">No specific guidelines found for this section yet.</p>
                                    <a href="/dashboard/support" className="text-[10px] font-bold text-primary-600 hover:underline mt-2 block">Visit Guideline Hub →</a>
                                </div>
                            )}
                        </div>
                        <div className="p-3 bg-secondary-50/50 border-t border-secondary-100">
                             <a href="/dashboard/support" className="text-[10px] font-bold text-secondary-500 hover:text-primary-600 block text-center">View Full Hub →</a>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
