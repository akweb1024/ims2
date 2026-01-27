'use client';

import React from 'react';
import { useKPIs } from '@/hooks/useHR';
import { Target, Flag, CheckCircle2, Circle, AlertCircle } from 'lucide-react';

const TeamGoalTrackingView: React.FC = () => {
    const { data: goals = [], isLoading: loading } = useKPIs();

    if (loading) {
        return <div className="p-20 text-center text-secondary-400 font-bold animate-pulse">Syncing team objectives...</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h2 className="text-3xl font-black text-secondary-900 tracking-tight">Goal Tracking (KRA/KPI)</h2>
                <p className="text-secondary-500 font-medium">Monitoring key results and individual growth targets</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {goals.length === 0 ? (
                    <div className="card-premium p-20 text-center text-secondary-400 font-bold italic bg-white border border-secondary-100 col-span-2">
                        No active goals or KPIs set for the team.
                    </div>
                ) : goals.map((goal: any) => (
                    <div key={goal.id} className="card-premium bg-white p-8 border border-secondary-100 hover:border-primary-300 transition-all group shadow-sm hover:shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-50 rotate-45 -mr-16 -mt-16 group-hover:bg-primary-50 transition-colors"></div>

                        <div className="flex items-center gap-4 mb-6 relative">
                            <div className="w-12 h-12 rounded-2xl bg-secondary-900 text-white flex items-center justify-center font-black group-hover:bg-primary-600 transition-all">
                                {goal.employeeProfile.user.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-black text-secondary-900">{goal.employeeProfile.user.name}</h3>
                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">{goal.employeeProfile.designation}</p>
                            </div>
                        </div>

                        <div className="space-y-6 relative">
                            <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-100">
                                <h4 className="text-xs font-black text-secondary-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Target size={14} className="text-primary-600" />
                                    {goal.name}
                                </h4>
                                <p className="text-xs text-secondary-500 font-medium leading-relaxed italic">
                                    &ldquo;{goal.description || 'Focus on strategic execution and quality delivery.'}&rdquo;
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Progress to Target</p>
                                    <p className="text-sm font-black text-secondary-900">{goal.currentValue || 0} / {goal.targetValue || 100}</p>
                                </div>
                                <div className="w-full h-3 bg-secondary-100 rounded-full overflow-hidden p-0.5">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${(goal.currentValue / goal.targetValue) >= 0.8 ? 'bg-emerald-500' :
                                                (goal.currentValue / goal.targetValue) >= 0.5 ? 'bg-primary-500' :
                                                    'bg-amber-500'
                                            }`}
                                        style={{ width: `${Math.min(100, (goal.currentValue / goal.targetValue) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-secondary-50">
                                <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-[0.15em] ${goal.priority === 'HIGH' ? 'bg-rose-50 text-rose-600' : 'bg-secondary-50 text-secondary-600'
                                    }`}>
                                    {goal.priority || 'NORMAL'} PRIORITY
                                </span>
                                <span className="text-[10px] font-bold text-secondary-400 uppercase">Due: Dec 2024</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TeamGoalTrackingView;
