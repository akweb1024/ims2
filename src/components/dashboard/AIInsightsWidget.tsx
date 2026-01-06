'use client';

import { useState, useEffect } from 'react';
import { Brain, Sparkles, ChevronRight, AlertCircle, TrendingUp } from 'lucide-react';

export default function AIInsightsWidget({ role }: { role?: string }) {
    const [insights, setInsights] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const token = localStorage.getItem('token');
                const type = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role || '') ? 'hr' : 'sales';
                const res = await fetch(`/api/ai-insights?type=${type}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    setInsights(await res.json());
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchInsights();
    }, [role]);

    if (loading) return (
        <div className="card-premium h-full animate-pulse flex flex-col items-center justify-center p-12">
            <Brain size={40} className="text-secondary-200 mb-4" />
            <div className="h-4 w-32 bg-secondary-100 rounded mb-2"></div>
            <div className="h-3 w-48 bg-secondary-50 rounded"></div>
        </div>
    );

    if (!insights) return null;

    return (
        <div className="card-premium bg-gradient-to-br from-secondary-900 to-secondary-800 text-white border-0 relative overflow-hidden group">
            {/* Background elements */}
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Brain size={120} />
            </div>

            <div className="relative z-10 h-full flex flex-col">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary-500 rounded-xl shadow-lg shadow-primary-500/20">
                            <Sparkles size={16} className="text-white" />
                        </div>
                        <h2 className="text-lg font-black tracking-tight uppercase">AI Intelligence</h2>
                    </div>
                    <span className="text-[10px] font-black bg-white/10 px-2 py-1 rounded-lg uppercase tracking-widest text-primary-300">
                        v2.1 Enterprise
                    </span>
                </div>

                <div className="space-y-6 flex-1">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <p className="text-[9px] font-bold text-secondary-400 uppercase tracking-widest mb-1">Projected Revenue</p>
                            <p className="text-2xl font-black text-white">₹{(insights.metrics?.projectedRevenue || 0).toLocaleString()}</p>
                            <div className="flex items-center gap-1 text-success-400 text-[10px] font-bold mt-1">
                                <TrendingUp size={10} />
                                +{insights.metrics?.projectedGrowth}% Forecast
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <p className="text-[9px] font-bold text-secondary-400 uppercase tracking-widest mb-1">Risk Exposure</p>
                            <p className="text-2xl font-black text-white">₹{(insights.metrics?.churnRiskValue || 0).toLocaleString()}</p>
                            <div className="flex items-center gap-1 text-danger-400 text-[10px] font-bold mt-1">
                                <AlertCircle size={10} />
                                {insights.metrics?.churnRiskCount} High Risk Accounts
                            </div>
                        </div>
                    </div>

                    {/* Top Insight */}
                    <div className="bg-primary-500/10 p-4 rounded-2xl border border-primary-500/20">
                        <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-2">Strategy Recommendation</p>
                        <p className="text-sm font-medium leading-relaxed italic text-secondary-100">
                            &quot;{insights.insights?.[0]?.description?.slice(0, 100)}...&quot;
                        </p>
                    </div>
                </div>

                <button className="mt-8 w-full py-3 bg-white text-secondary-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary-50 transition-all flex items-center justify-center gap-2 group/btn">
                    Open Intelligence Hub
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );
}
