'use client';

import { useState, useEffect } from 'react';

type AIInsights = {
    summary: string;
    impactRating: 'HIGH' | 'MEDIUM' | 'LOW';
    impactReason: string;
    feasibilityNote: string;
    tags: string[];
};

export default function AIInsightsPanel({ ideaId }: { ideaId: string }) {
    const [insights, setInsights] = useState<AIInsights | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchInsights = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/think-tank/ai-insights', {
                method: 'POST',
                body: JSON.stringify({ ideaId }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.status === 503) {
                setError('Neural Engine Standby: GEMINI_API_KEY required for automated feasibility logic.');
                setLoading(false);
                return;
            }

            const data = await res.json();
            if (data.insights) {
                setInsights(data.insights);
            } else {
                setError(data.error || 'Automation currently offline.');
            }
        } catch (err) {
            setError('Neural Engine connection suspended.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (ideaId) fetchInsights();
    }, [ideaId]);

    if (loading) return (
        <div className="p-6 border-2 border-slate-900 bg-[#FF450010] animate-pulse">
            <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-[#FF4500] animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Neural Engine Active...</span>
            </div>
        </div>
    );

    if (error) return (
        <div className="p-6 border-4 border-slate-950 bg-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-1 bg-[#FF4500]" />
            <div className="flex items-start gap-4">
                <div className="mt-1 w-2 h-2 bg-[#FF4500] animate-ping" />
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF4500]">System Status</p>
                    <p className="text-sm font-black text-slate-950 uppercase tracking-tighter leading-none">Neural Hub Standby</p>
                    <p className="mt-3 text-[10px] font-bold text-slate-400 leading-relaxed uppercase max-w-[200px]">
                        {error.includes('GEMINI_API_KEY') ? 'Neural architecture waiting for API authentication.' : error}
                    </p>
                </div>
            </div>
            <button 
                onClick={fetchInsights} 
                className="mt-6 w-full border-2 border-slate-950 bg-white py-2 text-[8px] font-black uppercase tracking-widest hover:bg-slate-950 hover:text-white transition-all"
            >
                Initialize Re-Scan
            </button>
        </div>
    );

    if (!insights) return null;

    const ratingColors = {
        HIGH: 'bg-[#FF4500] text-white',
        MEDIUM: 'bg-slate-900 text-white',
        LOW: 'bg-slate-200 text-slate-600'
    };

    return (
        <div className="border-2 border-slate-900 bg-white relative overflow-hidden" style={{ animation: 'tt-fade-up 0.5s ease both' }}>
            <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                <div className="text-[80px] font-black leading-none tracking-tighter">AI</div>
            </div>
            
            <div className="p-5 border-b-2 border-slate-900 flex items-center justify-between bg-slate-50">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Automated Intelligence</p>
                    <h3 className="mt-1 text-base font-black text-slate-950 uppercase">Analysis Engine</h3>
                </div>
                <div className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest ${ratingColors[insights.impactRating]}`}>
                    Impact: {insights.impactRating}
                </div>
            </div>

            <div className="p-6 space-y-6">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF4500]">The Core Logic</label>
                    <p className="mt-2 text-base font-bold text-slate-900 leading-snug">{insights.summary}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Impact Profile</label>
                        <p className="mt-1 text-sm text-slate-700 italic border-l-2 border-slate-200 pl-3">{insights.impactReason}</p>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Technical Horizon</label>
                        <p className="mt-1 text-sm text-slate-700 pl-4 border-l-2 border-slate-200">{insights.feasibilityNote}</p>
                    </div>
                </div>

                <div className="pt-4 flex flex-wrap gap-2 border-t border-slate-100">
                    {insights.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
                            #{tag.replace(/\s/g, '')}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
