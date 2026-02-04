
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
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-secondary-100">
                <div className="flex gap-2 p-1 bg-secondary-50 rounded-xl">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-2xl border border-indigo-200">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-black text-indigo-400 uppercase tracking-wider">Presence</span>
                        <Calendar className="text-indigo-500" size={20} />
                    </div>
                    <div className="text-3xl font-black text-indigo-900">{summary.present} <span className="text-sm font-medium text-indigo-500">/ {summary.totalRecords}</span></div>
                    <div className="text-xs font-bold text-indigo-600 mt-1">Days Present</div>
                </div>

                <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-6 rounded-2xl border border-rose-200">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-black text-rose-400 uppercase tracking-wider">Issues</span>
                        <AlertTriangle className="text-rose-500" size={20} />
                    </div>
                    <div className="flex gap-4">
                        <div>
                            <div className="text-2xl font-black text-rose-900">{summary.absent}</div>
                            <div className="text-[10px] font-bold text-rose-600">Absent</div>
                        </div>
                        <div>
                            <div className="text-2xl font-black text-amber-900">{summary.late}</div>
                            <div className="text-[10px] font-bold text-amber-600">Late</div>
                        </div>
                        <div>
                            <div className="text-2xl font-black text-orange-900">{summary.short}</div>
                            <div className="text-[10px] font-bold text-orange-600">Short</div>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border border-emerald-200">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">Utilization</span>
                        <Clock className="text-emerald-500" size={20} />
                    </div>
                    <div className="text-3xl font-black text-emerald-900">{(summary.present / (summary.totalRecords || 1) * 100).toFixed(0)}%</div>
                    <div className="text-xs font-bold text-emerald-600 mt-1">Attendance Rate</div>
                </div>

                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Avg Late</span>
                        <Clock className="text-slate-500" size={20} />
                    </div>
                    <div className="text-3xl font-black text-slate-900">{summary.avgLateMinutes} <span className="text-sm">min</span></div>
                    <div className="text-xs font-bold text-slate-600 mt-1">Per Late Arrival</div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Trend Chart */}
                <div className="bg-white p-6 rounded-3xl border border-secondary-100 shadow-sm">
                    <h3 className="text-lg font-black text-secondary-800 mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600"><Calendar size={18} /></span>
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
                <div className="bg-white p-6 rounded-3xl border border-secondary-100 shadow-sm">
                    <h3 className="text-lg font-black text-secondary-800 mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600"><Building size={18} /></span>
                        {scope === 'SELF' ? 'My Leave Balance' : 'Team Leave Balances (Top 10)'}
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
