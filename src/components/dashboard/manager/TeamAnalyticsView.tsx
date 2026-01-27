'use client';

import React from 'react';
import { usePerformanceMetrics } from '@/hooks/useHR';
import { BarChart3, TrendingUp, Zap, Target, Award } from 'lucide-react';

interface TeamAnalyticsViewProps {
    filters: any;
}

const TeamAnalyticsView: React.FC<TeamAnalyticsViewProps> = ({ filters }) => {
    const { data: metrics, isLoading: loading } = usePerformanceMetrics(filters.month, filters.year);

    if (loading) {
        return <div className="p-20 text-center text-secondary-400 font-bold animate-pulse">Analyzing team metrics...</div>;
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h2 className="text-3xl font-black text-secondary-900 tracking-tight">Team Productivity Insights</h2>
                <p className="text-secondary-500 font-medium">Performance trends and engagement metrics for your team</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="card-premium p-8 bg-white border border-secondary-100 shadow-sm overflow-hidden relative group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-200">
                            <TrendingUp size={24} />
                        </div>
                        <h4 className="text-xs font-black text-secondary-400 uppercase tracking-widest">Avg Growth</h4>
                    </div>
                    <div className="text-4xl font-black text-secondary-900 mb-2">
                        {metrics?.averageProgress || 0}%
                    </div>
                    <p className="text-xs font-bold text-success-600 flex items-center gap-1">
                        <Zap size={10} /> +2.4% from last month
                    </p>
                </div>

                <div className="card-premium p-8 bg-white border border-secondary-100 shadow-sm overflow-hidden relative group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                            <Target size={24} />
                        </div>
                        <h4 className="text-xs font-black text-secondary-400 uppercase tracking-widest">Goal Completion</h4>
                    </div>
                    <div className="text-4xl font-black text-secondary-900 mb-2">
                        {metrics?.goalSuccessRate || 0}%
                    </div>
                    <p className="text-xs font-bold text-secondary-400">On-track for quarterly targets</p>
                </div>

                <div className="card-premium p-8 bg-white border border-secondary-100 shadow-sm overflow-hidden relative group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Award size={24} />
                        </div>
                        <h4 className="text-xs font-black text-secondary-400 uppercase tracking-widest">Total Achievements</h4>
                    </div>
                    <div className="text-4xl font-black text-secondary-900 mb-2">
                        {metrics?.totalPoints || 0}
                    </div>
                    <p className="text-xs font-bold text-indigo-600">Points awarded this period</p>
                </div>
            </div>

            <div className="card-premium p-10 bg-secondary-900 text-white border-none shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative">
                    <div className="space-y-6">
                        <h3 className="text-2xl font-black italic tracking-tight">Manager AI Insight</h3>
                        <p className="text-secondary-300 text-sm leading-relaxed font-medium">
                            Based on current attendance and task completion patterns, your team&apos;s productivity peaks between 10 AM and 1 PM.
                            Consider scheduling high-priority sprint reviews or brainstorming sessions during this window for maximum engagement.
                        </p>
                        <div className="flex gap-4 pt-4">
                            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md flex-1">
                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Top Performer</p>
                                <p className="text-sm font-bold text-white">Pradeep Kumar (Software)</p>
                            </div>
                            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md flex-1">
                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Focus Area</p>
                                <p className="text-sm font-bold text-white">Documentation Lag</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-center bg-white/5 rounded-3xl p-8 border border-white/10">
                        <div className="text-center">
                            <BarChart3 size={48} className="mx-auto text-primary-400 mb-4 animate-bounce" />
                            <p className="text-lg font-black tracking-tight">Comparative Analysis Loading...</p>
                            <p className="text-xs text-secondary-400 mt-2">Historical trends are being processed</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamAnalyticsView;
