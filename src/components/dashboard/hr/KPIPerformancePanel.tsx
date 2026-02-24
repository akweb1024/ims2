'use client';

import { useState, useEffect } from 'react';
import { Target, CheckCircle, Clock, AlertCircle, BarChart3, Calendar } from 'lucide-react';

interface KPIStat {
    taskId: string;
    title: string;
    points: number;
    designation: string | null;
    calculationType: string;
    completions: number;
    approvedCompletions: number;
    totalQuantity: number;
    totalPointsEarned: number;
    approvedPointsEarned: number;
    achievementRate: number;
    totalWorkingDays: number;
    reportDates: string[];
}

interface KPIPerformancePanelProps {
    incrementId: string;
}

export default function KPIPerformancePanel({ incrementId }: KPIPerformancePanelProps) {
    const [loading, setLoading] = useState(true);
    const [performance, setPerformance] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPerformance = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/hr/increments/${incrementId}/kpi-performance`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    setPerformance(data);
                } else {
                    setError('Failed to load performance data');
                }
            } catch (err) {
                console.error('Error fetching KPI performance:', err);
                setError('An error occurred');
            } finally {
                setLoading(false);
            }
        };

        if (incrementId) {
            fetchPerformance();
        }
    }, [incrementId]);

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-secondary-800/20 rounded-2xl border border-secondary-700/50"></div>
                ))}
            </div>
        );
    }

    if (error || !performance || performance.kpiStats.length === 0) {
        return (
            <div className="p-6 bg-secondary-800/30 border border-secondary-700 rounded-2xl text-center">
                <AlertCircle className="mx-auto text-secondary-500 mb-2" size={24} />
                <p className="text-xs text-secondary-400 font-bold uppercase tracking-widest">
                    {error || 'No performance data available for these KPIs yet.'}
                </p>
                <p className="text-[10px] text-secondary-600 mt-1 uppercase italic">
                    Performance is tracked based on daily work report submissions.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <BarChart3 size={14} className="text-primary-400" />
                    <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Real-time Achievement Analysis</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-secondary-500 bg-secondary-800/50 px-2 py-0.5 rounded-lg border border-secondary-700">
                    <Calendar size={10} />
                    {performance.totalReports} Reports / {performance.totalWorkingDays} Working Days
                </div>
            </div>

            <div className="space-y-3">
                {performance.kpiStats.map((stat: KPIStat) => {
                    // Success color logic
                    const isHighAchiever = stat.achievementRate >= 80;
                    const isMidAchiever = stat.achievementRate >= 50;
                    const accentColor = isHighAchiever ? 'text-success-400' : (isMidAchiever ? 'text-amber-400' : 'text-primary-400');
                    const bgColor = isHighAchiever ? 'bg-success-500/10' : (isMidAchiever ? 'bg-amber-500/10' : 'bg-primary-500/10');
                    const barColor = isHighAchiever ? 'bg-success-500' : (isMidAchiever ? 'bg-amber-500' : 'bg-primary-500');

                    return (
                        <div key={stat.taskId} className="p-4 bg-secondary-800/40 border border-secondary-700 rounded-2xl group/stat hover:bg-secondary-800/60 transition-all duration-300">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h5 className="text-[11px] font-black text-white uppercase tracking-tight group-hover/stat:text-primary-300 transition-colors">{stat.title}</h5>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${accentColor}`}>
                                            {stat.completions} Completions
                                        </span>
                                        <span className="h-1 w-1 rounded-full bg-secondary-600"></span>
                                        <span className="text-[9px] text-secondary-500 font-bold">
                                            {stat.approvedPointsEarned.toLocaleString()} / {stat.totalPointsEarned.toLocaleString()} Points Approved
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-lg font-black tracking-tighter leading-none ${accentColor}`}>{stat.achievementRate}%</p>
                                    <p className="text-[8px] font-black text-secondary-500 uppercase tracking-widest mt-1">Consistency</p>
                                </div>
                            </div>
                            
                            <div className="space-y-1.5">
                                <div className="h-1.5 w-full bg-secondary-700 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${barColor} transition-all duration-1000 ease-out`}
                                        style={{ width: `${stat.achievementRate}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest italic">
                                    <span className="text-secondary-600">Base Target: 100% attendance sync</span>
                                    <span className={accentColor}>
                                        {stat.calculationType === 'SCALED' ? `Total Qty: ${stat.totalQuantity.toLocaleString()}` : 'Flat Achievement'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-3 bg-primary-500/5 border border-primary-500/20 rounded-xl">
                <p className="text-[9px] text-primary-400 font-medium leading-relaxed italic text-center">
                    * This analysis automatically bridges linked KPI templates with daily work report snapshots. 
                    Evaluators should use this consistency score to determine variable payout accuracy.
                </p>
            </div>
        </div>
    );
}
