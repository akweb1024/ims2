'use client';

import React, { useState } from 'react';
import { useKPIs } from '@/hooks/useHR';
import { Target, Flag, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import Employee360Modal from '@/components/dashboard/Employee360Modal';

const TeamGoalTrackingView: React.FC = () => {
    const { data: goals = [], isLoading: loading } = useKPIs();
    const [viewingEmployeeId, setViewingEmployeeId] = useState<string | null>(null);

    // Calculate aggregated team metrics
    const totalGoals = goals.length;
    const completedGoals = goals.filter((g: any) => g.currentValue >= g.targetValue).length;
    
    // Calculate an overall progress percentage (preventing division by zero)
    let totalTargetSum = 0;
    let totalCurrentSum = 0;
    goals.forEach((g: any) => {
        // Need to use valid numbers, some targets might be 0 which breaks logic, typical target is > 0
        const t = parseFloat(g.targetValue) || parseFloat(g.target) || 0;
        const c = parseFloat(g.currentValue) || parseFloat(g.current) || 0;
        if (t > 0) {
            totalTargetSum += t;
            // Cap current sum to target sum per goal for aggregate accuracy
            totalCurrentSum += Math.min(c, t); 
        }
    });
    
    const teamProgressPercentage = totalTargetSum > 0 ? Math.round((totalCurrentSum / totalTargetSum) * 100) : 0;

    if (loading) {
        return <div className="p-20 text-center text-secondary-400 font-bold animate-pulse">Syncing team objectives...</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h2 className="text-3xl font-black text-secondary-900 tracking-tight">Team Goal Tracking (KRA/KPI)</h2>
                <p className="text-secondary-500 font-medium">Monitoring key results and individual growth targets across the team</p>
            </div>

            {/* Team Aggregate Target Widget */}
            {goals.length > 0 && (
                <div className="card-premium p-8 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white border-none shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div>
                            <h3 className="text-sm font-bold text-indigo-200 uppercase tracking-widest mb-1 flex items-center gap-2">
                                <Target size={16} /> Team Aggregate Progress
                            </h3>
                            <div className="flex items-end gap-3 mt-2">
                                <span className="text-5xl font-black">{teamProgressPercentage}%</span>
                                <span className="text-indigo-200 text-sm font-medium mb-1">Overall Completion</span>
                            </div>
                            <p className="text-indigo-100 text-sm mt-3 max-w-lg">
                                Based on {totalGoals} active OKRs/KPIs tracked across the team. {completedGoals} goals have met or exceeded their target.
                            </p>
                        </div>
                        
                        <div className="w-full md:w-1/3 space-y-2">
                            <div className="flex justify-between text-xs font-bold text-indigo-200">
                                <span>Total Current: {totalCurrentSum.toFixed(1)}</span>
                                <span>Total Target: {totalTargetSum.toFixed(1)}</span>
                            </div>
                            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden p-0.5">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${teamProgressPercentage >= 100 ? 'bg-success-400' : 'bg-white'}`}
                                    style={{ width: `${Math.min(100, teamProgressPercentage)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-end pt-1">
                                <span className="text-[10px] uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded text-white font-bold backdrop-blur-sm">
                                    {teamProgressPercentage >= 80 ? 'On Track 🚀' : teamProgressPercentage >= 50 ? 'In Progress ⏳' : 'Needs Attention ⚠️'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {goals.length === 0 ? (
                    <div className="card-premium p-20 text-center text-secondary-400 font-bold italic bg-white border border-secondary-100 col-span-2">
                        No active goals or KPIs set for the team.
                    </div>
                ) : goals.map((goal: any) => (
                    <div key={goal.id} className="card-premium bg-white p-8 border border-secondary-100 hover:border-primary-300 transition-all group shadow-sm hover:shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-50 rotate-45 -mr-16 -mt-16 group-hover:bg-primary-50 transition-colors"></div>

                        <div 
                            className="flex items-center gap-4 mb-6 relative cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setViewingEmployeeId(goal.employee?.id)}
                        >
                            <div className="w-12 h-12 rounded-2xl bg-secondary-900 text-white flex items-center justify-center font-black group-hover:bg-primary-600 transition-all shadow-lg ring-2 ring-white/10">
                                {goal.employee?.user.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                                <h3 className="font-black text-secondary-900 group-hover:text-primary-600 transition-colors">{goal.employee?.user.name || 'Unknown User'}</h3>
                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">{goal.employee?.designation}</p>
                            </div>
                        </div>

                        <div className="space-y-6 relative">
                            <div className="p-4 bg-secondary-50 rounded-2xl border border-secondary-100">
                                <h4 className="text-xs font-black text-secondary-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Target size={14} className="text-primary-600" />
                                    {goal.title || goal.name}
                                </h4>
                                <p className="text-xs text-secondary-500 font-medium leading-relaxed italic">
                                    &ldquo;{goal.category || goal.description || 'Focus on strategic execution and quality delivery.'}&rdquo;
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Progress to Target</p>
                                    <p className="text-sm font-black text-secondary-900">{goal.currentValue || goal.current || 0} / {goal.targetValue || goal.target || 100} {goal.unit}</p>
                                </div>
                                <div className="w-full h-3 bg-secondary-100 rounded-full overflow-hidden p-0.5">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${((goal.currentValue || goal.current || 0) / (goal.targetValue || goal.target || 100)) >= 0.8 ? 'bg-emerald-500' :
                                                ((goal.currentValue || goal.current || 0) / (goal.targetValue || goal.target || 100)) >= 0.5 ? 'bg-primary-500' :
                                                    'bg-amber-500'
                                            }`}
                                        style={{ width: `${Math.min(100, ((goal.currentValue || goal.current || 0) / (goal.targetValue || goal.target || 100)) * 100)}%` }}
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

            {viewingEmployeeId && (
                <Employee360Modal
                    employeeId={viewingEmployeeId}
                    onClose={() => setViewingEmployeeId(null)}
                    viewAs="manager"
                />
            )}
        </div>
    );
};

export default TeamGoalTrackingView;
