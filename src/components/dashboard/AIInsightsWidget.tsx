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
        <div className="glass-card flex h-full animate-pulse flex-col items-center justify-center p-12">
            <Brain size={40} className="mb-4 text-muted-foreground/40" />
            <div className="mb-2 h-4 w-32 rounded bg-muted"></div>
            <div className="h-3 w-48 rounded bg-muted/70"></div>
        </div>
    );

    if (!insights) return null;

    return (
        <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-foreground to-card p-6 text-primary-foreground shadow-sm">
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
                    <span className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-primary-foreground/80">
                        v2.1 Enterprise
                    </span>
                </div>

                <div className="space-y-6 flex-1">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-primary-foreground/60">Projected Revenue</p>
                            <p className="text-2xl font-black text-white">₹{(insights.metrics?.projectedRevenue || 0).toLocaleString()}</p>
                            <div className="flex items-center gap-1 text-success-400 text-[10px] font-bold mt-1">
                                <TrendingUp size={10} />
                                +{insights.metrics?.projectedGrowth}% Forecast
                            </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-primary-foreground/60">Risk Exposure</p>
                            <p className="text-2xl font-black text-white">₹{(insights.metrics?.churnRiskValue || 0).toLocaleString()}</p>
                            <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-destructive-foreground/90">
                                <AlertCircle size={10} />
                                {insights.metrics?.churnRiskCount} High Risk Accounts
                            </div>
                        </div>
                    </div>

                    {/* Top Insight */}
                    <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-primary-foreground/80">Strategy Recommendation</p>
                        <p className="text-sm font-medium italic leading-relaxed text-primary-foreground">
                            &quot;{insights.insights?.[0]?.description?.slice(0, 100)}...&quot;
                        </p>
                    </div>
                </div>

                <button className="group/btn mt-8 flex w-full items-center justify-center gap-2 rounded-md bg-card py-2.5 text-xs font-black uppercase tracking-widest text-foreground transition-colors hover:bg-accent">
                    Open Intelligence Hub
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );
}

// Style guide accessibility compliance helper comment: aria-label placeholder label
