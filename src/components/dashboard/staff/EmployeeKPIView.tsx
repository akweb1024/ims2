'use client';

import { useState } from 'react';
import { useKPIs } from '@/hooks/useHR';
import {
    Target, TrendingUp, BarChart3, Award, Star, Briefcase, Zap,
    AlertCircle, CheckCircle2, Clock, Activity, ChevronDown, ChevronUp,
    BookOpen, Info, AlertTriangle, TrendingDown, Lightbulb, ArrowUpRight
} from 'lucide-react';
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
    kpis?: any[];
}

// Score breakdown config — matches the monthly API formula exactly
const SCORE_COMPONENTS = [
    {
        key: 'attendance',
        label: 'Attendance',
        weight: 25,
        icon: '📅',
        color: 'blue',
        description: 'Based on days present vs. working days, punctuality, and overtime.',
        getValue: (s: any) => s?.attendanceScore || 0,
        getDetail: (s: any) => s ? `${s.daysPresent || 0}/${s.totalWorkingDays || 0} days present, ${s.daysLate || 0} late days` : '—',
        tip: 'Be present every working day and check in on time. Overtime adds a small bonus.',
    },
    {
        key: 'points',
        label: 'Points Earned',
        weight: 25,
        icon: '⚡',
        color: 'amber',
        description: 'Gamification points earned through completed tasks and activities (capped at 1000 pts = 100 score).',
        getValue: (s: any) => Math.min(100, (s?.totalPointsEarned || 0) / 10),
        getDetail: (s: any) => s ? `${s.totalPointsEarned || 0} pts earned` : '—',
        tip: 'Complete assigned tasks and activities to earn more points.',
    },
    {
        key: 'reporting',
        label: 'Report Submission',
        weight: 15,
        icon: '📝',
        color: 'green',
        description: 'How consistently you submit daily work reports. 1 report per working day is expected.',
        getValue: (s: any) => s?.reportSubmissionRate || 0,
        getDetail: (s: any) => s ? `${s.reportsSubmitted || 0}/${s.reportsExpected || 0} reports filed` : '—',
        tip: 'Submit your daily work report every single working day without fail.',
    },
    {
        key: 'managerRating',
        label: 'Manager Rating',
        weight: 15,
        icon: '⭐',
        color: 'purple',
        description: 'Average rating given by your manager on daily work reports (1–10 scale multiplied ×10).',
        getValue: (s: any) => s?.averageManagerRating ? s.averageManagerRating * 10 : 0,
        getDetail: (s: any) => s ? (s.averageManagerRating > 0 ? `${s.averageManagerRating.toFixed(1)}/10 avg rating` : 'No ratings yet') : '—',
        tip: 'Deliver high quality work every day. Manager ratings directly affect 15% of your score.',
    },
    {
        key: 'tasks',
        label: 'Task Completion',
        weight: 10,
        icon: '✅',
        color: 'teal',
        description: 'Ratio of completed tasks vs. assigned tasks logged in daily reports.',
        getValue: (s: any) => s?.taskCompletionRate || 0,
        getDetail: (s: any) => s ? `${s.tasksCompleted || 0}/${s.tasksAssigned || 0} tasks done` : '—',
        tip: 'Log all completed tasks in your daily reports. Unlogged work is not counted.',
    },
    {
        key: 'communication',
        label: 'Communication',
        weight: 10,
        icon: '💬',
        color: 'rose',
        description: 'Based on communication evaluation fields in work reports (−3 to +3 mapped to 0–100).',
        getValue: (s: any) => s?.communicationScore || 0,
        getDetail: (s: any) => s ? `Score: ${(s.communicationScore || 0).toFixed(0)}/100` : '—',
        tip: 'Maintain professional, clear communication and log your follow-ups and chats.',
    },
];

const COLOR_MAP: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-amber-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    teal: 'from-teal-500 to-teal-600',
    rose: 'from-rose-500 to-rose-600',
};

const TRACK_MAP: Record<string, string> = {
    blue: 'bg-blue-100',
    amber: 'bg-amber-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    teal: 'bg-teal-100',
    rose: 'bg-rose-100',
};

const FILL_MAP: Record<string, string> = {
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    teal: 'bg-teal-500',
    rose: 'bg-rose-500',
};

const TEXT_MAP: Record<string, string> = {
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    teal: 'text-teal-600',
    rose: 'text-rose-600',
};

const GRADE_INFO: Record<string, { label: string; color: string; emoji: string }> = {
    'A+': { label: 'Outstanding', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', emoji: '🏆' },
    'A':  { label: 'Excellent', color: 'bg-blue-100 text-blue-800 border-blue-200', emoji: '🌟' },
    'B+': { label: 'Very Good', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', emoji: '✨' },
    'B':  { label: 'Good', color: 'bg-cyan-100 text-cyan-800 border-cyan-200', emoji: '👍' },
    'C':  { label: 'Average', color: 'bg-amber-100 text-amber-800 border-amber-200', emoji: '📈' },
    'D':  { label: 'Below Average', color: 'bg-orange-100 text-orange-800 border-orange-200', emoji: '⚠️' },
    'F':  { label: 'Needs Improvement', color: 'bg-red-100 text-red-800 border-red-200', emoji: '🔴' },
};

const GRADE_THRESHOLDS = [
    { min: 95, grade: 'A+', label: 'Outstanding' },
    { min: 90, grade: 'A', label: 'Excellent' },
    { min: 85, grade: 'B+', label: 'Very Good' },
    { min: 80, grade: 'B', label: 'Good' },
    { min: 70, grade: 'C', label: 'Average' },
    { min: 60, grade: 'D', label: 'Below Average' },
    { min: 0, grade: 'F', label: 'Needs Improvement' },
];

export default function EmployeeKPIView({ snapshots = [], reviews = [], increments = [], insights = [], kpis: kpisProp }: EmployeeKPIViewProps) {
    const { data: kpisHook, isLoading } = useKPIs();
    const kpis = (kpisProp && kpisProp.length > 0) ? kpisProp : (kpisHook || []);
    const [showGuidebook, setShowGuidebook] = useState(false);
    const [expandedComponent, setExpandedComponent] = useState<string | null>(null);

    const currentSnapshot = snapshots && snapshots.length > 0 ? snapshots[0] : null;

    // Radar chart data
    const skillsData = currentSnapshot ? [
        { subject: 'Quality', A: (currentSnapshot.averageTaskQuality || 0) * 10, fullMark: 100 },
        { subject: 'Attendance', A: currentSnapshot.attendanceScore || 0, fullMark: 100 },
        { subject: 'Reporting', A: currentSnapshot.reportSubmissionRate || 0, fullMark: 100 },
        { subject: 'Completion', A: currentSnapshot.taskCompletionRate || 0, fullMark: 100 },
        { subject: 'Communication', A: currentSnapshot.communicationScore || 0, fullMark: 100 },
        { subject: 'Punctuality', A: Math.max(0, 100 - ((currentSnapshot.totalLateMinutes || 0) / 10)), fullMark: 100 },
    ] : [
        { subject: 'Quality', A: 0, fullMark: 100 },
        { subject: 'Attendance', A: 0, fullMark: 100 },
        { subject: 'Reporting', A: 0, fullMark: 100 },
        { subject: 'Completion', A: 0, fullMark: 100 },
        { subject: 'Communication', A: 0, fullMark: 100 },
        { subject: 'Punctuality', A: 0, fullMark: 100 },
    ];

    // Performance trend (last 6 months)
    const performanceHistory = (snapshots?.length > 0
        ? [...snapshots].reverse().slice(-6)
        : []
    ).map(s => ({
        month: new Date(s.year, s.month - 1).toLocaleString('default', { month: 'short' }) + ` '${String(s.year).slice(-2)}`,
        score: parseFloat((s.overallScore / 10).toFixed(1)),
        rawScore: parseFloat((s.overallScore || 0).toFixed(1)),
    }));

    // Overall score / rating
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

    // Compute score contributions to understand what's dragging score down
    const scoreBreakdown = SCORE_COMPONENTS.map(comp => {
        const rawScore = comp.getValue(currentSnapshot);
        const contribution = (rawScore * comp.weight) / 100;
        const maxContribution = comp.weight;
        const gap = maxContribution - contribution;
        const isWeak = rawScore < 60;
        const isCritical = rawScore < 40;
        return { ...comp, rawScore, contribution, maxContribution, gap, isWeak, isCritical };
    });

    const totalScore = scoreBreakdown.reduce((sum, c) => sum + c.contribution, 0);
    const weakAreas = scoreBreakdown.filter(c => c.isWeak).sort((a, b) => a.rawScore - b.rawScore);
    const gradeInfo = GRADE_INFO[currentSnapshot?.performanceGrade || 'F'];

    // How far to next grade
    const currentGradeIdx = GRADE_THRESHOLDS.findIndex(g => (currentSnapshot?.overallScore || 0) >= g.min);
    const nextGrade = currentGradeIdx > 0 ? GRADE_THRESHOLDS[currentGradeIdx - 1] : null;
    const pointsToNextGrade = nextGrade ? nextGrade.min - (currentSnapshot?.overallScore || 0) : 0;

    // Warning flags from API
    const warningFlags: string[] = currentSnapshot?.warningFlags || [];

    const metricChips = currentSnapshot ? [
        { label: 'Attendance', value: `${currentSnapshot.daysPresent || 0}/${currentSnapshot.totalWorkingDays || 0}d`, ok: (currentSnapshot.attendanceScore || 0) >= 70 },
        { label: 'Reports Filed', value: `${currentSnapshot.reportsSubmitted || 0}/${currentSnapshot.reportsExpected || 0}`, ok: (currentSnapshot.reportSubmissionRate || 0) >= 70 },
        { label: 'Tasks Done', value: `${currentSnapshot.tasksCompleted || 0}/${currentSnapshot.tasksAssigned || 0}`, ok: (currentSnapshot.taskCompletionRate || 0) >= 70 },
        { label: 'Pts Earned', value: `${currentSnapshot.totalPointsEarned || 0} pts`, ok: (currentSnapshot.totalPointsEarned || 0) > 0 },
        { label: 'Avg Rating', value: currentSnapshot.averageManagerRating > 0 ? `${currentSnapshot.averageManagerRating.toFixed(1)}/10` : 'N/A', ok: currentSnapshot.averageManagerRating >= 6 },
        { label: 'Grade', value: currentSnapshot.performanceGrade || 'N/A', ok: !['F', 'D'].includes(currentSnapshot.performanceGrade || 'F') },
    ] : [];

    if (isLoading && !currentSnapshot) return (
        <div className="flex items-center justify-center p-20 text-indigo-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
        </div>
    );

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

            {/* ── 1. HEADER SCORE CARD ── */}
            <div className={`relative bg-gradient-to-r ${theme.color} rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 text-white shadow-xl overflow-hidden`}>
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
                        <h1 className="text-2xl sm:text-4xl font-black mb-2">{theme.text}</h1>
                        <p className="text-white/90 max-w-xl">{theme.summary}</p>
                        {metricChips.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {metricChips.map((chip, i) => (
                                    <span key={i} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${chip.ok ? 'bg-white/20 text-white' : 'bg-red-500/30 text-white border border-red-300/40'}`}>
                                        {chip.ok ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                                        {chip.label}: {chip.value}
                                    </span>
                                ))}
                            </div>
                        )}
                        {/* Next grade hint */}
                        {nextGrade && pointsToNextGrade > 0 && currentSnapshot && (
                            <div className="mt-4 inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold">
                                <ArrowUpRight size={16} />
                                {pointsToNextGrade.toFixed(1)} pts more → Grade {nextGrade.grade} ({nextGrade.label})
                            </div>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[10px] sm:text-xs uppercase tracking-widest opacity-80 font-bold">Overall Rating</p>
                        <div className="text-3xl sm:text-5xl font-black mt-1">{overallRating}<span className="text-xl sm:text-2xl opacity-60">/10</span></div>
                        {currentSnapshot && (
                            <p className="text-[10px] text-white/70 mt-1 font-bold">
                                {new Date(currentSnapshot.year, currentSnapshot.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </p>
                        )}
                        {gradeInfo && (
                            <span className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black border bg-white/20 text-white border-white/30`}>
                                {gradeInfo.emoji} Grade {currentSnapshot?.performanceGrade}
                            </span>
                        )}
                    </div>
                </div>
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-purple-500 opacity-20 rounded-full blur-2xl"></div>
            </div>

            {/* ── 2. SCORE BREAKDOWN (Real Analytics) ── */}
            {currentSnapshot && (
                <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-8 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                            <BarChart3 className="text-indigo-500" size={22} />
                            Score Breakdown
                        </h3>
                        <span className="text-sm font-bold text-gray-500">Total: <span className="text-indigo-600 font-black">{totalScore.toFixed(1)}/100</span></span>
                    </div>

                    <div className="space-y-4">
                        {scoreBreakdown.map((comp) => {
                            const isExpanded = expandedComponent === comp.key;
                            const barWidth = Math.min(100, comp.rawScore);
                            const statusColor = comp.isCritical ? 'text-red-600' : comp.isWeak ? 'text-amber-600' : 'text-green-600';
                            const statusLabel = comp.isCritical ? 'Critical' : comp.isWeak ? 'Needs Work' : 'Good';

                            return (
                                <div key={comp.key} className={`rounded-2xl border transition-all duration-200 ${comp.isCritical ? 'border-red-200 bg-red-50/40' : comp.isWeak ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100 bg-gray-50/30'}`}>
                                    <button
                                        className="w-full p-4 text-left"
                                        onClick={() => setExpandedComponent(isExpanded ? null : comp.key)}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-xl">{comp.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-gray-900 text-sm">{comp.label}</span>
                                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 ml-0 sm:ml-3">
                                                        <span className={`text-[9px] sm:text-[10px] font-black uppercase ${statusColor}`}>{statusLabel}</span>
                                                        <span className="hidden sm:inline text-xs text-gray-500 font-bold">{comp.weight}% weight</span>
                                                        <span className="text-sm font-black text-gray-900">{comp.rawScore.toFixed(0)}<span className="text-gray-400 font-normal">/100</span></span>
                                                        <span className={`text-[9px] sm:text-[10px] font-black tabular-nums px-2 py-0.5 rounded-lg ${comp.contribution >= comp.weight * 0.8 ? 'bg-green-100 text-green-700' : comp.contribution >= comp.weight * 0.5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                            +{comp.contribution.toFixed(1)} pts
                                                        </span>
                                                        {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                                                    </div>
                                                </div>
                                                <div className={`w-full h-2 rounded-full mt-2 ${TRACK_MAP[comp.color]}`}>
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${FILL_MAP[comp.color]}`}
                                                        style={{ width: `${barWidth}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                                            <div className="flex flex-wrap gap-4 text-sm">
                                                <div className="flex-1 min-w-[200px]">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Your Data</p>
                                                    <p className="font-bold text-gray-800">{comp.getDetail(currentSnapshot)}</p>
                                                </div>
                                                <div className="flex-1 min-w-[200px]">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Score Contribution</p>
                                                    <p className="font-bold text-gray-800">
                                                        {comp.contribution.toFixed(2)} / {comp.maxContribution} pts
                                                        <span className="ml-2 text-xs text-gray-500">({((comp.contribution / comp.maxContribution) * 100).toFixed(0)}% efficiency)</span>
                                                    </p>
                                                </div>
                                                <div className="flex-1 min-w-[200px]">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Points Lost</p>
                                                    <p className={`font-black ${comp.gap > 5 ? 'text-red-600' : 'text-gray-600'}`}>
                                                        –{comp.gap.toFixed(2)} pts
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 items-start p-3 bg-blue-50 rounded-xl text-xs text-blue-800">
                                                <Lightbulb size={14} className="shrink-0 mt-0.5 text-blue-500" />
                                                <span><span className="font-bold">How to improve:</span> {comp.tip}</span>
                                            </div>
                                            <p className="text-xs text-gray-500">{comp.description}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Grade Scale */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-2xl">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Grade Scale</p>
                        <div className="flex flex-wrap gap-2">
                            {GRADE_THRESHOLDS.map((g) => {
                                const gi = GRADE_INFO[g.grade];
                                const isCurrent = currentSnapshot?.performanceGrade === g.grade;
                                return (
                                    <span key={g.grade} className={`px-3 py-1 rounded-xl text-xs font-black border ${gi.color} ${isCurrent ? 'ring-2 ring-offset-1 ring-current scale-110' : 'opacity-60'}`}>
                                        {gi.emoji} {g.grade} ≥{g.min}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── 3. WEAK AREAS / WHAT'S DRAGGING YOU DOWN ── */}
            {weakAreas.length > 0 && (
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-red-100">
                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2 mb-6">
                        <AlertTriangle className="text-red-500" size={22} />
                        What&apos;s Dragging Your Score Down
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {weakAreas.map(comp => (
                            <div key={comp.key} className={`p-5 rounded-2xl border ${comp.isCritical ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl mt-0.5">{comp.icon}</span>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className={`font-black text-sm ${comp.isCritical ? 'text-red-800' : 'text-amber-800'}`}>{comp.label}</h4>
                                            <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${comp.isCritical ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'}`}>
                                                {comp.rawScore.toFixed(0)}/100
                                            </span>
                                        </div>
                                        <p className={`text-xs mb-3 ${comp.isCritical ? 'text-red-700' : 'text-amber-700'}`}>
                                            {comp.getDetail(currentSnapshot)} · Losing <strong>–{comp.gap.toFixed(1)} pts</strong> here
                                        </p>
                                        <div className={`text-xs flex gap-2 items-start p-2 rounded-xl ${comp.isCritical ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                            <Lightbulb size={12} className="shrink-0 mt-0.5" />
                                            {comp.tip}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── 4. WARNING FLAGS ── */}
            {warningFlags.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {warningFlags.map((flag: string) => {
                        const flagMap: Record<string, { title: string; msg: string; color: string }> = {
                            LOW_ATTENDANCE: { title: '⚠️ Low Attendance', msg: 'Attendance score is below 70. Being absent frequently will heavily penalise your overall score.', color: 'border-red-200 bg-red-50 text-red-800' },
                            POOR_REPORTING: { title: '📋 Poor Report Submission', msg: 'You\'ve filed less than 60% of expected daily reports. Every missing report costs you points.', color: 'border-orange-200 bg-orange-50 text-orange-800' },
                            FREQUENT_LATE: { title: '🕐 Frequent Late Check-ins', msg: 'More than 30% of your working days had late check-ins. Punctuality is tracked and scored.', color: 'border-amber-200 bg-amber-50 text-amber-800' },
                            LOW_MANAGER_RATING: { title: '⭐ Low Manager Rating', msg: 'Your average manager rating is below 5/10. Work on quality and communication in your daily reports.', color: 'border-purple-200 bg-purple-50 text-purple-800' },
                        };
                        const f = flagMap[flag];
                        if (!f) return null;
                        return (
                            <div key={flag} className={`p-4 rounded-2xl border ${f.color}`}>
                                <h4 className="font-black text-sm mb-1">{f.title}</h4>
                                <p className="text-xs">{f.msg}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── 5. RADAR + KPIs ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Radar Chart */}
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
                                <div key={insight.id || idx} className={`p-4 rounded-2xl text-xs border ${insight.type === 'STRENGTH' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
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
                        {(kpis?.length === 0 || !kpis) && (
                            <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                                <AlertCircle size={32} className="mb-2 opacity-50" />
                                <p className="text-sm font-medium">No active goals assigned yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 6. TREND + CAREER ── */}
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
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                    <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
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
                        {increments.length > 0 ? increments.map((inc, idx) => (
                            <div key={inc.id || idx} className="relative">
                                <div className="absolute -left-[29px] top-1 h-3 w-3 bg-emerald-500 rounded-full ring-4 ring-emerald-100"></div>
                                <h4 className="font-bold text-emerald-900">{inc.type === 'PROMOTION' ? 'Promotion' : 'Salary Increment'}</h4>
                                <p className="text-[10px] text-emerald-600 font-black uppercase">{formatToISTDate(inc.effectiveDate)}</p>
                                <p className="text-xs text-emerald-600 mt-1">{inc.reason || 'Performance-based adjustment'}</p>
                                {inc.newDesignation && (
                                    <div className="mt-2">
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
                                <div className="mt-3">
                                    <span className="bg-white px-2 py-1 rounded text-[10px] font-bold text-emerald-700 shadow-sm border border-emerald-100">
                                        Performance: {Number(overallRating) >= 8 ? 'High' : 'Normal'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 7. SCORE GUIDEBOOK (Collapsible) ── */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-indigo-100 overflow-hidden">
                <button
                    onClick={() => setShowGuidebook(!showGuidebook)}
                    className="w-full p-6 flex items-center justify-between hover:bg-indigo-50/40 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                            <BookOpen className="text-indigo-600" size={20} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-black text-gray-900">📖 Performance Score Guidebook</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Understand exactly how your score is calculated — tap to {showGuidebook ? 'hide' : 'read'}</p>
                        </div>
                    </div>
                    {showGuidebook ? <ChevronUp className="text-indigo-400" size={20} /> : <ChevronDown className="text-indigo-400" size={20} />}
                </button>

                {showGuidebook && (
                    <div className="px-8 pb-8 space-y-8 animate-in slide-in-from-top-4 duration-300">
                        <div className="p-4 bg-indigo-50 rounded-2xl text-sm text-indigo-800 border border-indigo-100">
                            <Info size={16} className="inline mr-2" />
                            Your monthly score is calculated automatically at the end of each month by HR. Every metric is pulled from your attendance records, daily work reports, and point logs.
                        </div>

                        {/* Overall Formula */}
                        <div>
                            <h4 className="font-black text-gray-900 mb-4 text-base">🏆 Overall Score Formula</h4>
                            <div className="overflow-x-auto rounded-2xl border border-gray-100">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Component</th>
                                            <th className="px-4 py-3 text-center">Weight</th>
                                            <th className="px-4 py-3 text-left">What it measures</th>
                                            <th className="px-4 py-3 text-left">How to max it</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {SCORE_COMPONENTS.map(comp => (
                                            <tr key={comp.key} className="hover:bg-gray-50/60">
                                                <td className="px-4 py-3 font-bold text-gray-900">{comp.icon} {comp.label}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black bg-gradient-to-r ${COLOR_MAP[comp.color]} text-white`}>{comp.weight}%</span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 text-xs">{comp.description}</td>
                                                <td className="px-4 py-3 text-xs text-gray-600">{comp.tip}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Each metric explained */}
                        <div>
                            <h4 className="font-black text-gray-900 mb-4 text-base">📐 Metric Calculations in Detail</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    {
                                        title: '📅 Attendance Score',
                                        formula: '(daysPresent ÷ workingDays) × 70\n+ (1 − lateRate) × 20\n+ min(10, overtimeHrs ÷ 10)',
                                        note: '70% is raw presence, 20% is punctuality, up to 10% bonus for overtime. Working days exclude weekends and company holidays.',
                                    },
                                    {
                                        title: '📝 Report Submission',
                                        formula: '(reportsSubmitted ÷ totalWorkingDays) × 100',
                                        note: 'You\'re expected to submit 1 work report per working day. Missing even 1 report reduces your rate and score.',
                                    },
                                    {
                                        title: '✅ Task Completion',
                                        formula: '(tasksCompleted ÷ tasksAssigned) × 100',
                                        note: 'Both numbers are taken from your daily work reports. If no tasks are logged, this defaults to 0.',
                                    },
                                    {
                                        title: '⭐ Manager Rating (×10)',
                                        formula: 'average(managerRating fields) × 10',
                                        note: 'Manager rates your reports on a 1–10 scale. The average is multiplied by 10 to bring it to a 0–100 scale for this component.',
                                    },
                                    {
                                        title: '🏆 Quality Score',
                                        formula: 'managerRating × 0.6\n+ normalizedEvalScore × 0.4',
                                        note: 'Shown on the radar chart × 10. Blends manager\'s direct rating with work quality evaluation sub-fields (mapped from −3..+3 to 0..10).',
                                    },
                                    {
                                        title: '💬 Communication',
                                        formula: '(avgEvalComm + 3) × (100÷6)\nOR (followUps + chats) ÷ 10',
                                        note: 'Uses your communication evaluation field if present. Falls back to follow-up calls + chats handled, divided by 10.',
                                    },
                                    {
                                        title: '⚡ Points Score',
                                        formula: 'min(100, totalPointsEarned ÷ 10)',
                                        note: 'Points are earned through the gamification system when you complete tasks and activities. 1000 points = 100 score.',
                                    },
                                    {
                                        title: '🔵 Punctuality (Radar only)',
                                        formula: 'max(0, 100 − totalLateMinutes ÷ 10)',
                                        note: 'Every 10 minutes of lateness across the month = −1 point. This is shown on the Radar only, not in the main score calculation.',
                                    },
                                ].map(item => (
                                    <div key={item.title} className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                                        <h5 className="font-black text-gray-900 mb-2 text-sm">{item.title}</h5>
                                        <pre className="text-xs font-mono bg-white px-3 py-2 rounded-xl border border-gray-100 text-indigo-700 mb-2 whitespace-pre-wrap">{item.formula}</pre>
                                        <p className="text-xs text-gray-500">{item.note}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Grade Table */}
                        <div>
                            <h4 className="font-black text-gray-900 mb-4 text-base">🎓 Grade Thresholds</h4>
                            <div className="flex flex-wrap gap-3">
                                {GRADE_THRESHOLDS.map(g => {
                                    const gi = GRADE_INFO[g.grade];
                                    return (
                                        <div key={g.grade} className={`px-5 py-3 rounded-2xl border text-center ${gi.color}`}>
                                            <div className="text-2xl mb-1">{gi.emoji}</div>
                                            <div className="font-black text-lg">{g.grade}</div>
                                            <div className="text-[10px] font-bold uppercase tracking-wider">{gi.label}</div>
                                            <div className="text-[10px] opacity-70 mt-1">Score ≥ {g.min}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                            <h4 className="font-black text-gray-900 mb-4">💡 Top Tips to Improve Your Score</h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                                {[
                                    'Submit a detailed work report EVERY working day — even short ones count.',
                                    'Check in on time. Even 10 mins late daily costs you 30+ punctuality minutes/month.',
                                    'Log every completed task in your daily report — unlisted tasks are invisible to the system.',
                                    'Earn gamification points by completing assigned work activities (same 25% weight as attendance).',
                                    'Ask your manager for feedback on reports — their rating directly affects 15% of your score.',
                                    'If you see a warning flag, address it immediately — flags indicate scores below threshold.',
                                ].map((tip, i) => (
                                    <li key={i} className="flex gap-3">
                                        <span className="text-indigo-500 font-black shrink-0">{i + 1}.</span>
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
