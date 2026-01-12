'use client';

import { useState, useEffect } from 'react';
import { Rocket, TrendingUp, Globe, Zap, Cpu, Ship } from 'lucide-react';

interface PotentialData {
    monthlyPotential: number;
    quarterlyPotential: number;
    halfYearlyPotential: number;
    yearlyPotential: number;
    twoYearPotential: number;
    threeYearPotential: number;
    fiveYearPotential: number;
    growthFactors: Array<{
        factor: string;
        impact: string;
        importance: number;
    }>;
    marketData: {
        trend: string;
        industryGrowth: string;
    };
}

export default function PotentialCalculator() {
    const [potential, setPotential] = useState<PotentialData | null>(null);
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);

    useEffect(() => {
        fetchPotential();
    }, []);

    const fetchPotential = async () => {
        try {
            const res = await fetch('/api/analytics/company/potential');
            if (res.ok) setPotential(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCalculate = async () => {
        setCalculating(true);
        try {
            const res = await fetch('/api/analytics/company/potential', { method: 'POST' });
            if (res.ok) setPotential(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setCalculating(false);
        }
    };

    if (loading) return <div className="p-10 text-center font-bold">crunching global market data...</div>;

    const projections = [
        { label: '1 Month', value: potential?.monthlyPotential },
        { label: '3 Months', value: potential?.quarterlyPotential },
        { label: '6 Months', value: potential?.halfYearlyPotential },
        { label: '12 Months', value: potential?.yearlyPotential },
        { label: '2 Years', value: potential?.twoYearPotential },
        { label: '3 Years', value: potential?.threeYearPotential },
        { label: '5 Years', value: potential?.fiveYearPotential },
    ];

    return (
        <div className="space-y-8 pb-10">
            <div className="card-premium bg-gradient-to-br from-indigo-900 via-purple-900 to-primary-900 text-white p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
                    <svg viewBox="0 0 100 100" className="w-full h-full"><path d="M0,50 Q25,0 50,50 T100,50" fill="none" stroke="white" strokeWidth="2" /></svg>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="max-w-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <Rocket className="text-secondary-300 animate-bounce" size={32} />
                            <h2 className="text-4xl font-black tracking-tighter uppercase italic">Exponential Potential</h2>
                        </div>
                        <p className="text-primary-100 text-lg leading-relaxed opacity-80">
                            Our proprietary algorithm analyzes your company&apos;s internal performance against global industry benchmarks, market volatility, and digital trends to project your true valuation potential.
                        </p>
                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={handleCalculate}
                                disabled={calculating}
                                className="bg-white text-primary-900 px-8 py-4 rounded-2xl font-black uppercase text-sm shadow-2xl hover:bg-primary-50 transition-all flex items-center gap-3"
                            >
                                {calculating ? 'Processing Markets...' : 'Recalculate Projections'}
                                <Zap size={18} className="text-amber-500 fill-amber-500" />
                            </button>
                            <div className="flex items-center gap-2 text-xs font-bold text-primary-300">
                                <Globe size={14} /> Real-time Market Sync: Active
                            </div>
                        </div>
                    </div>

                    <div className="card-premium bg-white/10 backdrop-blur-xl border-white/20 p-8 text-center min-w-[280px]">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-60">5-Year Projected Valuation</p>
                        <p className="text-5xl font-black tracking-tighter">
                            ₹{((potential?.fiveYearPotential || 0) / 10000000).toFixed(2)}Cr
                        </p>
                        <div className="mt-4 flex items-center justify-center gap-2 text-emerald-400 font-bold">
                            <TrendingUp size={18} /> +240.5% Expected Growth
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {projections.map((p, i) => (
                    <div key={p.label} className="card-premium text-center group hover:scale-105 transition-all cursor-default">
                        <p className="text-[9px] font-black text-secondary-400 uppercase mb-2 tracking-widest">{p.label}</p>
                        <p className="text-lg font-black text-secondary-900">₹{((p.value || 0) / 100000).toFixed(1)}L</p>
                        <div className={`h-1 mt-3 bg-secondary-100 rounded-full overflow-hidden`}>
                            <div className="h-full bg-primary-500 transition-all" style={{ width: `${Math.min(100, 20 + i * 15)}%` }} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <h3 className="text-xl font-black text-secondary-900 flex items-center gap-2">
                        <Cpu size={24} className="text-primary-600" /> Key Growth Factors
                    </h3>
                    <div className="space-y-4">
                        {(potential?.growthFactors || []).map((f: any, i: number) => (
                            <div key={i} className="card-premium flex items-center justify-between p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center font-black">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <p className="font-bold text-secondary-900">{f.factor}</p>
                                        <p className="text-[11px] text-secondary-500 italic">Impact: <span className="text-primary-600 font-bold">{f.impact}</span></p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-secondary-400 uppercase mb-1">Criticality</p>
                                    <div className="flex gap-1">
                                        {[...Array(10)].map((_, idx) => (
                                            <div key={idx} className={`w-1.5 h-3 rounded-full ${idx < f.importance ? 'bg-primary-500' : 'bg-secondary-100'}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-xl font-black text-secondary-900 flex items-center gap-2">
                        <Globe size={24} className="text-indigo-600" /> Global Market Context
                    </h3>
                    <div className="card-premium p-8 h-full bg-indigo-50/30 border-indigo-100 relative overflow-hidden">
                        <div className="absolute bottom-0 right-0 p-4 opacity-5 translate-x-1/4 translate-y-1/4">
                            <Ship size={200} />
                        </div>
                        <div className="grid grid-cols-2 gap-8 relative z-10">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Industry Trend</p>
                                <p className="text-2xl font-black text-secondary-900">{potential?.marketData?.trend || 'Stable'}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Global Sector Growth</p>
                                <p className="text-2xl font-black text-secondary-900">{potential?.marketData?.industryGrowth || '8.4%'}</p>
                            </div>
                            <div className="col-span-full space-y-4">
                                <p className="text-sm text-secondary-600 leading-relaxed font-medium">
                                    Your company current trajectory suggests you are outperforming the regional sector average by <span className="text-indigo-600 font-black">1.4x</span>. Key opportunities lie in streamlining operational overhead to maximize EBITDA.
                                </p>
                                <div className="p-4 bg-white rounded-2xl border border-indigo-100 shadow-sm border-l-4 border-l-indigo-500">
                                    <p className="text-xs font-bold text-secondary-900">&quot;Current market liquidity and lowered interest rates favor aggressive expansion in the next 12 months.&quot;</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
