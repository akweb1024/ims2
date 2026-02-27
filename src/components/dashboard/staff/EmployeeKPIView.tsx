'use client';

import { useKPIs } from '@/hooks/useHR';
import { Target, TrendingUp, BarChart3, Award, Star, Briefcase, Zap, AlertCircle, CheckCircle2, Clock, Activity } from 'lucide-react';
import { formatToISTDate } from '@/lib/date-utils';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip
} from 'recharts';

interface EmployeeKPIViewProps {
    snapshots?: any[];
    reviews?: any[];
    increments?: any[];
    insights?: any[];
    kpis?: any[];  // Pass KPIs from parent to avoid auth issues in hook
}

export default function EmployeeKPIView({ snapshots = [], reviews = [], increments = [], insights = [], kpis: kpisProp }: EmployeeKPIViewProps) {
    const { data: kpisHook, isLoading } = useKPIs();
    // Prefer prop-passed KPIs (from self-scoped API call) over hook's company-wide query
    const kpis = (kpisProp && kpisProp.length > 0) ? kpisProp : (kpisHook || []);

    // API returns monthly snapshots sorted desc (newest first), so index 0 is the MOST RECENT
    const currentSnapshot = snapshots && snapshots.length > 0 ? snapshots[0] : null;

    // Derived Data for Radar Chart
    const skillsData = currentSnapshot ? [
        { subject: 'Quality', A: (currentSnapshot.averageTaskQuality || 0) * 10, fullMark: 100 }, // Assuming 0-10 scale
        { subject: 'Attendance', A: currentSnapshot.attendanceScore || 0, fullMark: 100 },
        { subject: 'Reporting', A: currentSnapshot.reportSubmissionRate || 0, fullMark: 100 },
        { subject: 'Completion', A: currentSnapshot.taskCompletionRate || 0, fullMark: 100 }, // Note: might be 0 if tasks not assigned
        { subject: 'Communication', A: currentSnapshot.communicationScore || 0, fullMark: 100 },
        { subject: 'Punctuality', A: Math.max(0, 100 - ((currentSnapshot.totalLateMinutes || 0) / 10)), fullMark: 100 }, // Rough calc
    ] : [
        // Fallback or empty state if no snapshot
        { subject: 'Quality', A: 0, fullMark: 100 },
        { subject: 'Attendance', A: 0, fullMark: 100 },
        { subject: 'Reporting', A: 0, fullMark: 100 },
        { subject: 'Completion', A: 0, fullMark: 100 },
        { subject: 'Communication', A: 0, fullMark: 100 },
        { subject: 'Punctuality', A: 0, fullMark: 100 },
    ];

    // Data for Trend Chart (Last 6 months — already sorted desc, reverse to show oldest→newest)
    const performanceHistory = (snapshots?.length > 0
        ? [...snapshots].reverse().slice(-6)
        : []
    ).map(s => ({
        month: new Date(s.year, s.month - 1).toLocaleString('default', { month: 'short' }) + ` '${String(s.year).slice(-2)}`,
        score: parseFloat((s.overallScore / 10).toFixed(1)),
        rawScore: parseFloat((s.overallScore || 0).toFixed(1)),
    }));

    // Quick metric chips for header
    const metricChips = currentSnapshot ? [
        { label: 'Attendance', value: `${currentSnapshot.daysPresent || 0}/${currentSnapshot.totalWorkingDays || 0}d`, ok: (currentSnapshot.attendanceScore || 0) >= 70 },
        { label: 'Reports Filed', value: `${currentSnapshot.reportsSubmitted || 0}/${currentSnapshot.reportsExpected || 0}`, ok: (currentSnapshot.reportSubmissionRate || 0) >= 70 },
        { label: 'Tasks Done', value: `${currentSnapshot.tasksCompleted || 0}/${currentSnapshot.tasksAssigned || 0}`, ok: (currentSnapshot.taskCompletionRate || 0) >= 70 },
        { label: 'Pts Earned', value: `${currentSnapshot.totalPointsEarned || 0} pts`, ok: (currentSnapshot.totalPointsEarned || 0) > 0 },
        { label: 'Avg Rating', value: currentSnapshot.averageManagerRating > 0 ? `${currentSnapshot.averageManagerRating.toFixed(1)}/10` : 'N/A', ok: currentSnapshot.averageManagerRating >= 6 },
        { label: 'Grade', value: currentSnapshot.performanceGrade || 'N/A', ok: !['F', 'D'].includes(currentSnapshot.performanceGrade || 'F') },
    ] : [];

    // Overall Rating (Using Manager Rating or Overall Score)
    const overallRatingNum = currentSnapshot ? (currentSnapshot.overallScore / 10) : 0;
    const overallRating = overallRatingNum.toFixed(1);

    const getRatingTheme = (score: number) => {
        if (score >= 9) return { color: 'from-emerald-600 to-teal-500', text: 'Outstanding', summary: 'You are an exceptional performer, exceeding all mission targets significantly.' };
        if (score >= 8) return { color: 'from-indigo-600 to-blue-500', text: 'Strong', summary: 'Consistent performance with high quality. You are reliably meeting and exceeding most goals.' };
        if (score >= 7) return { color: 'from-blue-600 to-indigo-500', text: 'Good', summary: 'Solid performance. You are meeting expectations and maintaining good consistency.' };
        if (score >= 6) return { color: 'from-amber-600 to-orange-500', text: 'Fair', summary: 'Meeting basic requirements but there is room for growth in specific skills.' };
        return { color: 'from-rose-600 to-red-500', text: 'Needs Improvement', summary: 'Performance is currently below target. Focus on consistency and peer collaboration.' };
    };

    const theme = getRatingTheme(overallRatingNum);
    
    const getChartColor = (score: number) => {
        if (score >= 9) return { stroke: '#059669', fill: '#10b981' }; 
        if (score >= 8) return { stroke: '#4f46e5', fill: '#6366f1' }; 
        if (score >= 7) return { stroke: '#2563eb', fill: '#3b82f6' }; 
        if (score >= 6) return { stroke: '#d97706', fill: '#f59e0b' }; 
        return { stroke: '#e11d48', fill: '#f43f5e' }; 
    };
    const chartColors = getChartColor(overallRatingNum);

    if (isLoading && !currentSnapshot) return (
        <div className="flex items-center justify-center p-20 text-indigo-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
        </div>
    );

    // No data at all
    if (!currentSnapshot && snapshots.length === 0) {
        return (
            <div className="text-center py-20 space-y-4">
                <div className="text-6xl">📊</div>
                <h3 className="text-xl font-black text-secondary-700">No Performance Data Yet</h3>
                <p className="text-secondary-500 text-sm max-w-sm mx-auto">
                    Your monthly performance snapshot will appear here once it has been calculated by HR. Keep submitting daily reports!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Summary Card */}
            <div className={`relative bg-gradient-to-r ${theme.color} rounded-[2rem] p-8 text-white shadow-xl overflow-hidden`}>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            {overallRatingNum >= 8 && (
                                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                    Top Performer
                                </span>
                            )}
                            <span className="flex items-center gap-1 text-xs font-bold text-white/80">
                                <Award size={14} /> Performance Score
                            </span>
                        </div>
                        <h1 className="text-4xl font-black mb-2">{theme.text}</h1>
                        <p className="text-white/90 max-w-xl">{theme.summary}</p>
                        {/* Metric Chips */}
                        {metricChips.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {metricChips.map((chip, i) => (
                                    <span key={i} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${
                                        chip.ok ? 'bg-white/20 text-white' : 'bg-red-500/30 text-white border border-red-300/40'
                                    }`}>
                                        {chip.ok ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                                        {chip.label}: {chip.value}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xs uppercase tracking-widest opacity-80 font-bold">Overall Rating</p>
                        <div className="text-5xl font-black mt-1">{overallRating}<span className="text-2xl opacity-60">/10</span></div>
                        {currentSnapshot && (
                            <p className="text-[10px] text-white/70 mt-1 font-bold">
                                {new Date(currentSnapshot.year, currentSnapshot.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </p>
                        )}
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
                        <Zap className="text-amber-500" size={20} /> Metrics Analysis
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillsData}>
                                <PolarGrid stroke="#e5e7eb" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 700 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Me"
                                    dataKey="A"
                                    stroke={chartColors.stroke}
                                    strokeWidth={3}
                                    fill={chartColors.fill}
                                    fillOpacity={0.3}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-center text-xs text-gray-500 font-medium mt-2">
                        Based on monthly performance snapshots
                    </p>

                    {insights.length > 0 && (
                        <div className="mt-6 space-y-4">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Performance Insights</h4>
                            {insights.map((insight, idx) => (
                                <div key={insight.id || idx} className={`p-4 rounded-2xl text-xs border ${
                                    insight.type === 'STRENGTH' 
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                                    : 'bg-amber-50 border-amber-100 text-amber-800'
                                }`}>
                                    <div className="flex items-center gap-2 mb-1 font-bold">
                                        {insight.type === 'STRENGTH' ? '⭐ Strength' : '💡 Area for Growth'}
                                    </div>
                                    {insight.content}
                                </div>
                            ))}
                        </div>
                    )}
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
                                            <p className="text-xs text-gray-500 mt-1">Due: {kpi.period}</p>
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
                        <TrendingUp className="text-green-500" size={20} /> Performance Trend (Last 6 Months)
                    </h3>
                    <div className="h-60">
                        {performanceHistory.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={performanceHistory}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                    <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                    <RechartsTooltip
                                        cursor={{ fill: '#f9fafb' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                        formatter={(value: any) => [`${value}/10`, 'Score']}
                                    />
                                    <Bar dataKey="score" fill={chartColors.fill} radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center text-gray-400 gap-2">
                                <Activity size={32} className="opacity-30" />
                                <p className="text-sm">No snapshot history yet</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[2rem] p-8 border border-emerald-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-white rounded-xl shadow-sm text-emerald-600">
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-emerald-900">Career Trajectory</h3>
                            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Growth Path</p>
                        </div>
                    </div>

                    <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-200">
                        {/* Dynamic Career Path */}
                        {increments.length > 0 ? increments.map((inc, idx) => (
                            <div key={inc.id || idx} className="relative">
                                <div className="absolute -left-[29px] top-1 h-3 w-3 bg-emerald-500 rounded-full ring-4 ring-emerald-100"></div>
                                <h4 className="font-bold text-emerald-900">
                                    {inc.type === 'PROMOTION' ? 'Promotion' : 'Salary Increment'}
                                </h4>
                                <p className="text-[10px] text-emerald-600 font-black uppercase">{formatToISTDate(inc.effectiveDate)}</p>
                                <p className="text-xs text-emerald-600 mt-1">{inc.reason || 'Performance-based adjustment'}</p>
                                {inc.newDesignation && (
                                    <div className="mt-2 flex gap-2">
                                        <span className="bg-white px-2 py-0.5 rounded text-[10px] font-bold text-emerald-700 shadow-sm border border-emerald-100">
                                            New Role: {inc.newDesignation}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="relative">
                                <div className="absolute -left-[29px] top-1 h-3 w-3 bg-emerald-500 rounded-full ring-4 ring-emerald-100"></div>
                                <h4 className="font-bold text-emerald-900">Current Role</h4>
                                <p className="text-xs text-emerald-600 mt-1">Focus on excelling in current KRA</p>
                                <div className="mt-3 flex gap-2">
                                    <span className="bg-white px-2 py-1 rounded text-[10px] font-bold text-emerald-700 shadow-sm border border-emerald-100">
                                        Performance: {Number(overallRating) >= 8 ? 'High' : 'Normal'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
