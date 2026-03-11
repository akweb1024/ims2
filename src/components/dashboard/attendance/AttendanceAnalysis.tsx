
'use client';
import { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { User, Users, Building, Calendar, Clock, AlertTriangle } from 'lucide-react';

interface AttendanceAnalysisProps {
    userRole: string; // 'ADMIN', 'MANAGER', 'EMPLOYEE'
}

export default function AttendanceAnalysis({ userRole }: AttendanceAnalysisProps) {
    const [scope, setScope] = useState<'SELF' | 'TEAM' | 'COMPANY'>('SELF');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('OVERVIEW'); // OVERVIEW, TRENDS, BALANCES

    // Determine allowed scopes based on role
    const canViewCompany = ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(userRole);
    const canViewTeam = canViewCompany || ['MANAGER', 'HR_MANAGER'].includes(userRole);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/analytics/attendance?scope=${scope}`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error('Failed to fetch attendance analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [scope]);

    if (loading) return <div className="p-8 text-center text-secondary-500 animate-pulse">Loading Analytics...</div>;
    if (!data) return <div className="p-8 text-center text-secondary-500">No Data Available</div>;

    const { summary, trends, balances } = data;

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center glass-card-premium p-3 sm:p-4 rounded-2xl shadow-sm border border-secondary-100">
                <div className="flex gap-2 p-1 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-x-auto w-full md:w-auto">
                    <button
                        onClick={() => setScope('SELF')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${scope === 'SELF' ? 'bg-white shadow text-primary-600' : 'text-secondary-500 hover:text-secondary-700'}`}
                    >
                        <User size={16} /> Me
                    </button>
                    {canViewTeam && (
                        <button
                            onClick={() => setScope('TEAM')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${scope === 'TEAM' ? 'bg-white shadow text-primary-600' : 'text-secondary-500 hover:text-secondary-700'}`}
                        >
                            <Users size={16} /> My Team
                        </button>
                    )}
                    {canViewCompany && (
                        <button
                            onClick={() => setScope('COMPANY')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${scope === 'COMPANY' ? 'bg-white shadow text-primary-600' : 'text-secondary-500 hover:text-secondary-700'}`}
                        >
                            <Building size={16} /> Company
                        </button>
                    )}
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="glass-card-premium bg-gradient-to-br from-indigo-50/50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-indigo-900/20 p-4 sm:p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm transition-all hover:shadow-md">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-wider">Presence</span>
                        <Calendar className="text-indigo-500 h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="text-xl sm:text-3xl font-black text-indigo-900 dark:text-indigo-100">{summary.present} <span className="text-xs sm:text-sm font-medium text-indigo-400">/ {summary.totalRecords}</span></div>
                    <div className="text-[10px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1 uppercase tracking-tighter">Days Present</div>
                </div>

                <div className="glass-card-premium bg-gradient-to-br from-rose-50/50 to-rose-100/50 dark:from-rose-950/20 dark:to-rose-900/20 p-4 sm:p-6 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-sm transition-all hover:shadow-md">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] sm:text-xs font-black text-rose-400 uppercase tracking-wider">Issues</span>
                        <AlertTriangle className="text-rose-500 h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="flex gap-2 sm:gap-4 flex-wrap">
                        <div>
                            <div className="text-lg sm:text-2xl font-black text-rose-900 dark:text-rose-100">{summary.absent}</div>
                            <div className="text-[9px] sm:text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Absent</div>
                        </div>
                        <div>
                            <div className="text-lg sm:text-2xl font-black text-amber-900 dark:text-amber-100">{summary.late}</div>
                            <div className="text-[9px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Late</div>
                        </div>
                        <div>
                            <div className="text-lg sm:text-2xl font-black text-orange-900 dark:text-orange-100">{summary.short}</div>
                            <div className="text-[9px] sm:text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase">Short</div>
                        </div>
                    </div>
                </div>

                <div className="glass-card-premium bg-gradient-to-br from-emerald-50/50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/20 p-4 sm:p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm transition-all hover:shadow-md">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] sm:text-xs font-black text-emerald-400 uppercase tracking-wider">Utilization</span>
                        <Clock className="text-emerald-500 h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="text-xl sm:text-3xl font-black text-emerald-900 dark:text-emerald-100">{(summary.present / (summary.totalRecords || 1) * 100).toFixed(0)}%</div>
                    <div className="text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 uppercase tracking-tighter">Attendance Rate</div>
                </div>

                <div className="glass-card-premium bg-gradient-to-br from-slate-50/50 to-slate-100/50 dark:from-slate-900/20 dark:to-slate-800/20 p-4 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider">Avg Late</span>
                        <Clock className="text-slate-500 h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">{summary.avgLateMinutes} <span className="text-xs sm:text-sm font-medium opacity-60">min</span></div>
                    <div className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 mt-1 uppercase tracking-tighter">Per Late Arrival</div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Trend Chart */}
                <div className="glass-card-premium px-4 py-6 sm:p-6 rounded-3xl border border-secondary-100 shadow-sm">
                    <h3 className="text-base sm:text-lg font-black text-secondary-800 dark:text-gray-200 mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><Calendar size={18} /></span>
                        Attendance Trends
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trends}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="present" stroke="#6366f1" strokeWidth={3} dot={false} name="Present" />
                                <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={3} dot={false} name="Late" />
                                <Line type="monotone" dataKey="short" stroke="#f97316" strokeWidth={3} dot={false} name="Short" />
                                <Line type="monotone" dataKey="absent" stroke="#f43f5e" strokeWidth={3} dot={false} name="Absent" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Balances / Distribution Chart */}
                <div className="glass-card-premium px-4 py-6 sm:p-6 rounded-3xl border border-secondary-100 shadow-sm">
                    <h3 className="text-base sm:text-lg font-black text-secondary-800 dark:text-gray-200 mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400"><Building size={18} /></span>
                        {scope === 'SELF' ? 'My Leave Balance' : 'Team Leave Balances'}
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={balances} layout={scope === 'SELF' ? 'horizontal' : 'vertical'}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={scope === 'SELF'} vertical={scope !== 'SELF'} />
                                {scope === 'SELF' ? (
                                    <>
                                        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                    </>
                                ) : (
                                    <>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="employeeName" type="category" width={100} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                    </>
                                )}
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Bar dataKey="closing" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Balance" barSize={20} />
                                <Bar dataKey="used" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Used" barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}
