'use client';

import { useState, useEffect } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Zap,
    Target,
    Users,
    ShieldAlert,
    ArrowRight,
    CheckCircle2,
    DollarSign,
    Lightbulb
} from 'lucide-react';

interface Insight {
    type: 'GROWTH' | 'PROFIT' | 'EMPLOYEE' | 'RISK';
    title: string;
    description: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
    icon: string;
}

export default function AiConsultantDashboard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'growth' | 'profit' | 'employee'>('all');

    useEffect(() => {
        fetch('/api/ai-insights?type=consultant', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(resData => {
                setData(resData);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch AI insights', err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary-100 rounded-full animate-pulse"></div>
                    <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-600 animate-bounce" size={24} />
                </div>
                <p className="text-secondary-600 font-bold italic animate-pulse">AI Consultant is analyzing your business data...</p>
            </div>
        );
    }

    const filteredInsights = data?.insights?.filter((i: Insight) =>
        activeTab === 'all' || i.type.toLowerCase() === activeTab
    ) || [];

    const healthScore = 78; // Mock score calculation

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Business pulse summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-premium bg-gradient-to-br from-primary-600 to-primary-800 text-white p-6 border-none">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-primary-100 text-sm font-bold uppercase tracking-wider">Business Health Score</p>
                            <h2 className="text-5xl font-black mt-2">{healthScore}%</h2>
                        </div>
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <Target size={32} />
                        </div>
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-sm font-medium bg-white/10 p-2 rounded-lg">
                        <TrendingUp size={16} />
                        <span>Trending +4% higher than last quarter</span>
                    </div>
                </div>

                <div className="card-premium p-6 border-l-4 border-l-secondary-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-secondary-500 text-sm font-bold uppercase tracking-wider">Avg Productivity</p>
                            <h2 className="text-3xl font-black text-secondary-900 mt-2">
                                {data?.profile?.employees?.avgDailyProductivity}%
                            </h2>
                        </div>
                        <div className="p-3 bg-secondary-100 rounded-2xl">
                            <Users className="text-secondary-600" size={24} />
                        </div>
                    </div>
                    <p className="mt-4 text-xs text-secondary-600 leading-relaxed italic">
                        Based on KRA alignment and task completion records.
                    </p>
                </div>

                <div className="card-premium p-6 border-l-4 border-l-emerald-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-secondary-500 text-sm font-bold uppercase tracking-wider">Revenue Growth</p>
                            <h2 className={`text-3xl font-black mt-2 ${data?.profile?.financials?.revenueGrowthRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {data?.profile?.financials?.revenueGrowthRate?.toFixed(1)}%
                            </h2>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-2xl">
                            <DollarSign className="text-emerald-600" size={24} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-secondary-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '65%' }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-secondary-500">65% OF TARGET</span>
                    </div>
                </div>
            </div>

            {/* AI Strategic Consultation board */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h3 className="text-2xl font-black text-secondary-900 flex items-center gap-2">
                            <Lightbulb className="text-primary-600" />
                            AI Strategic Consultation
                        </h3>
                        <p className="text-secondary-600 mt-1">Personalized actionable strategies generated from your business footprint</p>
                    </div>

                    <div className="flex gap-1 p-1 bg-secondary-100 rounded-xl">
                        {(['all', 'growth', 'profit', 'employee'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 text-xs font-black rounded-lg transition-all capitalize ${activeTab === tab
                                        ? 'bg-white text-primary-700 shadow-sm'
                                        : 'text-secondary-500 hover:text-secondary-800'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredInsights.length > 0 ? (
                        filteredInsights.map((insight: Insight, idx: number) => (
                            <div key={idx} className="card-premium p-6 border-t-4 border-t-primary-500 shadow-lg hover:shadow-xl transition-all group overflow-hidden relative">
                                <div className="absolute -right-4 -top-4 text-secondary-50/10 group-hover:text-secondary-50/20 transition-colors pointer-events-none">
                                    <span className="text-8xl font-black">{idx + 1}</span>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="text-4xl p-2 bg-secondary-50 rounded-xl group-hover:scale-110 transition-transform">
                                        {insight.icon}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${insight.impact === 'HIGH' ? 'bg-rose-100 text-rose-700' : 'bg-primary-100 text-primary-700'
                                                }`}>
                                                {insight.impact} IMPACT
                                            </span>
                                            <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-tighter">
                                                ID: AI-{idx + 101}
                                            </span>
                                        </div>
                                        <h4 className="text-lg font-black text-secondary-900">{insight.title}</h4>
                                        <p className="text-sm text-secondary-600 leading-relaxed font-medium">
                                            {insight.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 bg-secondary-50 rounded-xl border border-secondary-100 group-hover:bg-secondary-900 group-hover:text-white transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Zap size={16} className="text-amber-500" />
                                            <span className="text-xs font-black">AI RECOMMENDED ACTION</span>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm font-bold leading-snug">
                                        {insight.action}
                                    </p>
                                    <button className="mt-3 flex items-center gap-1 text-[10px] font-black uppercase text-primary-600 group-hover:text-primary-300">
                                        Implement Now <ArrowRight size={12} />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-2 py-12 card-premium text-center border-dashed">
                            <ShieldAlert size={48} className="mx-auto text-secondary-300" />
                            <p className="mt-4 text-secondary-500 font-bold italic">No insights found for this category yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Performance Spotlight */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card-premium p-6">
                    <h4 className="text-lg font-black text-secondary-900 mb-6 flex items-center gap-2">
                        <Users className="text-primary-600" size={20} />
                        Leadership & Merit Spotlight
                    </h4>
                    <div className="space-y-4">
                        {data?.profile?.employees?.topPerformers?.map((emp: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-secondary-50 rounded-xl hover:bg-primary-50 transition-colors border-l-4 border-l-primary-500">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-secondary-200 flex items-center justify-center font-black text-xs text-secondary-600 uppercase">
                                        {emp.name.substring(0, 2)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-secondary-900">{emp.name}</p>
                                        <p className="text-[10px] font-bold text-secondary-500 uppercase tracking-tighter">Consistency: 🔥 High</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-primary-700">+{emp.totalPoints} PTS</p>
                                    <p className="text-[10px] text-secondary-400 font-bold uppercase">Point Index</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card-premium p-6 flex flex-col justify-center items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100/50 rounded-bl-full -mr-10 -mt-10"></div>
                    <Target size={64} className="text-primary-200 mb-4" />
                    <h4 className="text-xl font-black text-secondary-900 text-center">Profit Waterfall Analysis</h4>
                    <p className="text-sm text-secondary-600 text-center mt-2 px-6 font-medium italic">
                        The AI suggests that focusing on **Institutional Agencies** could increase profit margins by **12.4%** next FY.
                    </p>
                    <button className="btn btn-primary mt-8 px-10 font-black shadow-lg shadow-primary-200">
                        View Profit Map
                    </button>
                </div>
            </div>
        </div>
    );
}
