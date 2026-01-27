'use client';

import React from 'react';
import { usePerformanceMetrics } from '@/hooks/useHR';
import { Award, Star, Zap, Trophy, ShieldCheck } from 'lucide-react';

const TeamPointsRewardsView: React.FC = () => {
    // We use performance metrics for points data
    const { data: metrics, isLoading: loading } = usePerformanceMetrics();

    if (loading) {
        return <div className="p-20 text-center text-secondary-400 font-bold animate-pulse">Syncing rewards ledger...</div>;
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-secondary-900 tracking-tight">Points & Rewards</h2>
                    <p className="text-secondary-500 font-medium">Gamified performance tracking and team recognition</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-xl shadow-secondary-100 border border-secondary-100">
                    <Trophy className="text-amber-500" size={24} />
                    <div className="pr-4">
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest leading-none">Team Level</p>
                        <p className="text-lg font-black text-secondary-900 leading-none mt-1">Diamond Squadron</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="card-premium p-10 bg-white border border-secondary-100 shadow-sm space-y-8">
                    <h3 className="text-xl font-black text-secondary-900 flex items-center gap-3 italic">
                        <Star className="text-primary-600 fill-primary-600" size={20} />
                        Top Earners
                    </h3>
                    <div className="space-y-6">
                        {(metrics?.topEarners || []).map((earner: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-secondary-50 rounded-2xl group hover:bg-primary-600 hover:text-white transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white text-secondary-900 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                                        {earner.name?.[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold">{earner.name}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                            {idx === 0 ? 'MVP Status' : 'Star Performer'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black">{earner.points} XP</p>
                                    <p className="text-[10px] font-bold opacity-60">Accumulated</p>
                                </div>
                            </div>
                        ))}
                        {(!metrics?.topEarners || metrics?.topEarners?.length === 0) && (
                            <div className="p-10 text-center text-secondary-400 font-bold italic">No points data available yet.</div>
                        )}
                    </div>
                </div>

                <div className="card-premium p-10 bg-secondary-900 text-white border-none space-y-8 relative overflow-hidden">
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary-600 opacity-10 rounded-full -mb-32 -mr-32 blur-3xl"></div>
                    <h3 className="text-xl font-black italic tracking-tight flex items-center gap-3">
                        <ShieldCheck className="text-primary-400" size={20} />
                        Leaderboard Meta
                    </h3>
                    <div className="space-y-8">
                        <div>
                            <div className="flex justify-between mb-3">
                                <span className="text-xs font-black uppercase tracking-widest text-secondary-400">Team Goal: Project Phoenix</span>
                                <span className="text-xs font-black">78%</span>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="w-[78%] h-full bg-primary-500 rounded-full"></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4">
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                                <Zap className="text-amber-400 mb-3" size={24} />
                                <p className="text-2xl font-black">12</p>
                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Active Boosts</p>
                            </div>
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                                <Award className="text-emerald-400 mb-3" size={24} />
                                <p className="text-2xl font-black">4</p>
                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Team Badges</p>
                            </div>
                        </div>

                        <button className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-primary-900">
                            Distribute Rewards
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamPointsRewardsView;
