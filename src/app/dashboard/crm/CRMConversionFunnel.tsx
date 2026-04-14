'use client';

import { useState, useEffect } from 'react';
import { Target, TrendingUp, Users, ArrowDown, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/classnames';

type FunnelStage = {
    stage: string;
    count: number;
    percentage: number;
};

export default function CRMConversionFunnel() {
    const [data, setData] = useState<FunnelStage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFunnel = async () => {
            try {
                const res = await fetch('/api/crm/reports/funnel');
                if (res.ok) {
                    const result = await res.json();
                    setData(result);
                }
            } catch (error) {
                console.error('Failed to fetch funnel data', error);
            } finally {
                setLoading(false);
            }
        };

        fetchFunnel();
    }, []);

    if (loading) {
        return (
            <div className="bg-white p-7 rounded-[2.5rem] border border-secondary-100 shadow-xl shadow-secondary-100/40 h-full animate-pulse">
                <div className="h-6 w-1/3 bg-secondary-100 rounded-md mb-8" />
                <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-16 bg-secondary-50 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (data.length === 0) return null;

    const colors = [
        'bg-primary-600',
        'bg-indigo-600',
        'bg-purple-600',
        'bg-emerald-600'
    ];

    const lightColors = [
        'bg-primary-50 text-primary-600',
        'bg-indigo-50 text-indigo-600',
        'bg-purple-50 text-purple-600',
        'bg-emerald-50 text-emerald-600'
    ];

    return (
        <div className="bg-white p-7 rounded-[2.5rem] border border-secondary-100 shadow-xl shadow-secondary-100/40 h-full overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none group-hover:scale-125 transition-transform duration-1000">
                <Target size={120} />
            </div>
            
            <div className="flex flex-col h-full">
                <div className="mb-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-secondary-400 mb-2">Sales Analytics</p>
                    <div className="flex items-center gap-3">
                         <h3 className="text-xl font-black text-secondary-950">Conversion Funnel</h3>
                         <div className="flex items-center gap-1.5 px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-primary-100">
                             <Sparkles size={12} />
                             AI Insights Active
                         </div>
                    </div>
                    <p className="text-xs text-secondary-500 mt-2 font-medium">Tracking conversion efficiency through your sales pipeline.</p>
                </div>

                <div className="flex-1 space-y-3 relative z-10">
                    {data.map((item, index) => (
                        <div key={item.stage} className="relative group/item">
                            <div 
                                className={cn(
                                    "flex items-center justify-between p-5 rounded-[2rem] border border-secondary-100 hover:shadow-lg transition-all duration-500",
                                    "bg-white"
                                )}
                                style={{ 
                                    width: `${100 - (index * 6)}%`,
                                    marginLeft: `${index * 3}%`
                                }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shrink-0 shadow-lg",
                                        colors[index % colors.length]
                                    )}>
                                        {index + 1}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest leading-none mb-1">{item.stage}</span>
                                        <span className="text-lg font-black text-secondary-950 uppercase italic leading-none">{item.count.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest leading-none mb-1">Conv. Rate</span>
                                        <div className="flex items-center gap-1.5">
                                             <TrendingUp size={14} className={colors[index % colors.length].replace('bg', 'text')} />
                                             <span className="text-base font-black text-secondary-950 italic">{Math.round(item.percentage)}%</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-secondary-200 group-hover/item:translate-x-1 transition-transform" />
                                </div>
                            </div>
                            
                            {index < data.length - 1 && (
                                <div className="flex justify-center my-1 relative h-6" style={{ marginLeft: `${(index + 1) * 3}%`, width: `${100 - ((index + 1) * 6)}%` }}>
                                     <div className="w-px h-full bg-gradient-to-b from-secondary-100 to-transparent absolute left-1/2 -translate-x-1/2" />
                                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-full border border-secondary-100">
                                         <ArrowDown size={12} className="text-secondary-400" />
                                     </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-auto pt-10 flex items-center justify-between">
                     <div className="flex flex-col">
                          <span className="text-[9px] font-black text-secondary-400 uppercase tracking-[0.3em] mb-1">Win efficiency</span>
                          <span className="text-2xl font-black text-emerald-600 italic">
                               {Math.round(data[data.length - 1]?.percentage || 0)}%
                          </span>
                     </div>
                     <button className="px-6 py-3 bg-secondary-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all shadow-xl shadow-secondary-950/20 active:scale-95">
                          View Full Report
                     </button>
                </div>
            </div>
        </div>
    );
}
