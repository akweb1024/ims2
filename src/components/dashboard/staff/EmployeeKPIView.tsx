'use client';

import { useKPIs } from '@/hooks/useHR';
import { Target, TrendingUp, BarChart3, Award, Star, Briefcase, Zap, AlertCircle } from 'lucide-react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip
} from 'recharts';

export default function EmployeeKPIView() {
    const { data: kpis, isLoading } = useKPIs();

    // Mock data for visualizations (since API might be limited)
    const skillsData = [
        { subject: 'Technical', A: 120, fullMark: 150 },
        { subject: 'Leadership', A: 98, fullMark: 150 },
        { subject: 'Comm.', A: 86, fullMark: 150 },
        { subject: 'Delivery', A: 99, fullMark: 150 },
        { subject: 'Punctuality', A: 85, fullMark: 150 },
        { subject: 'Teamwork', A: 65, fullMark: 150 },
    ];

    const performanceHistory = [
        { month: 'Q1', score: 8.5 },
        { month: 'Q2', score: 8.8 },
        { month: 'Q3', score: 9.2 },
        { month: 'Q4', score: 9.5 },
    ];

    if (isLoading) return (
        <div className="flex items-center justify-center p-20 text-indigo-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Summary Card */}
            <div className="relative bg-gradient-to-r from-violet-600 to-indigo-600 rounded-[2rem] p-8 text-white shadow-xl overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                Top Performer
                            </span>
                            <span className="flex items-center gap-1 text-xs font-bold text-amber-300">
                                <Award size={14} /> Only 15% of staff here
                            </span>
                        </div>
                        <h1 className="text-4xl font-black mb-2">Excellent Performance</h1>
                        <p className="text-indigo-100 max-w-xl">
                            You are currently performing in the top percentile of your department.
                            Keep up this velocity to be eligible for the upcoming evaluation cycle.
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs uppercase tracking-widest opacity-80 font-bold">Overall Rating</p>
                        <div className="text-5xl font-black mt-1">9.2<span className="text-2xl opacity-60">/10</span></div>
                    </div>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-purple-500 opacity-20 rounded-full blur-2xl"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Skills Radar */}
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-lg text-gray-900 mb-6 flex items-center gap-2">
                        <Zap className="text-amber-500" size={20} /> Skills Assessment
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillsData}>
                                <PolarGrid stroke="#e5e7eb" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 700 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                                <Radar
                                    name="Me"
                                    dataKey="A"
                                    stroke="#6366f1"
                                    strokeWidth={3}
                                    fill="#818cf8"
                                    fillOpacity={0.3}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-center text-xs text-gray-500 font-medium mt-2">
                        Based on manager reviews & project outcomes
                    </p>
                </div>

                {/* KPI List */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                        <Target className="text-indigo-500" size={20} /> Active Goals (OKRs)
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {kpis?.map((kpi: any) => {
                            const percentage = Math.min((kpi.current / kpi.target) * 100, 100);
                            return (
                                <div key={kpi.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">{kpi.title}</h4>
                                            <p className="text-xs text-gray-500 mt-1">Due: {new Date().toLocaleDateString()}</p>
                                        </div>
                                        <div className={`p-2 rounded-xl bg-gray-50 text-gray-600 ${percentage >= 100 ? 'bg-green-50 text-green-600' : ''}`}>
                                            <BarChart3 size={18} />
                                        </div>
                                    </div>

                                    <div className="flex items-end gap-2 mb-2">
                                        <span className="text-2xl font-black text-gray-900">{kpi.current}</span>
                                        <span className="text-xs font-bold text-gray-400 mb-1">/ {kpi.target} {kpi.unit}</span>
                                    </div>

                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${percentage >= 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                        {/* Empty State */}
                        {(kpis?.length === 0 || !kpis) && (
                            <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                                <AlertCircle size={32} className="mb-2 opacity-50" />
                                <p className="text-sm font-medium">No active goals assigned yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Appraisal & Growth Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100">
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-lg text-gray-900 mb-6 flex items-center gap-2">
                        <TrendingUp className="text-green-500" size={20} /> Performance Trend
                    </h3>
                    <div className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performanceHistory}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <RechartsTooltip
                                    cursor={{ fill: '#f9fafb' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="score" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[2rem] p-8 border border-emerald-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-white rounded-xl shadow-sm text-emerald-600">
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-emerald-900">Career Trajectory</h3>
                            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Next Milestone</p>
                        </div>
                    </div>

                    <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-200">
                        <div className="relative">
                            <div className="absolute -left-[29px] top-1 h-3 w-3 bg-emerald-500 rounded-full ring-4 ring-emerald-100"></div>
                            <h4 className="font-bold text-emerald-900">Senior Developer</h4>
                            <p className="text-xs text-emerald-600 mt-1">Projected: Q3 2026</p>
                            <div className="mt-3 flex gap-2">
                                <span className="bg-white px-2 py-1 rounded text-[10px] font-bold text-emerald-700 shadow-sm border border-emerald-100">Mentorship +2</span>
                                <span className="bg-white px-2 py-1 rounded text-[10px] font-bold text-emerald-700 shadow-sm border border-emerald-100">System Design</span>
                            </div>
                        </div>

                        <div className="relative opacity-50">
                            <div className="absolute -left-[29px] top-1 h-3 w-3 bg-emerald-300 rounded-full"></div>
                            <h4 className="font-bold text-emerald-800">Tech Lead</h4>
                            <p className="text-xs text-emerald-600 mt-1">Projected: 2028</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
