'use client';

import React, { useEffect, useState } from 'react';
import { useWorkReports } from '@/hooks/useHR';
import { Clipboard, CheckCircle, Clock, AlertTriangle, User } from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';

const TeamTaskMasterView: React.FC = () => {
    // Fetch recent work reports for the team
    const { data: reports = [], isLoading: loading } = useWorkReports();
    const [period, setPeriod] = useState<'DAILY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('DAILY');
    const [stats, setStats] = useState<any>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState<string>('ALL');

    useEffect(() => {
        const loadStats = async () => {
            setStatsLoading(true);
            try {
                const token = localStorage.getItem('token');
                const query = new URLSearchParams({ period });
                if (selectedEmployee !== 'ALL') query.set('employeeId', selectedEmployee);
                const res = await fetch(`/api/manager/team/task-stats?${query.toString()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    setStats(await res.json());
                }
            } catch (err) {
                console.error('Failed to load task stats', err);
            } finally {
                setStatsLoading(false);
            }
        };
        loadStats();
    }, [period, selectedEmployee]);

    if (loading) {
        return <div className="p-20 text-center text-secondary-400 font-bold animate-pulse">Loading team task matrix...</div>;
    }

    // Flatten tasks from reports for a "Task Master" view
    const allTasks = reports.flatMap((report: any) =>
        (Array.isArray(report.tasksSnapshot) ? report.tasksSnapshot : []).map((task: any) => ({
            ...task,
            employeeName: report.employee?.user?.name,
            reportDate: report.date
        }))
    ).sort((a: any, b: any) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h2 className="text-3xl font-black text-secondary-900 tracking-tight">Task Master</h2>
                <p className="text-secondary-500 font-medium">Real-time oversight of daily team activities and assignments</p>
            </div>

            <div className="card-premium p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    {(['DAILY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`btn h-9 px-4 text-xs font-black ${period === p ? 'btn-primary' : 'border border-secondary-200 bg-white text-secondary-700'}`}
                        >
                            {p === 'DAILY' ? 'Daily' : p === 'MONTHLY' ? 'Monthly' : p === 'QUARTERLY' ? 'Quarterly' : 'Yearly'}
                        </button>
                    ))}
                    <div className="ml-auto">
                        <select
                            className="input h-9 text-xs"
                            value={selectedEmployee}
                            onChange={e => setSelectedEmployee(e.target.value)}
                        >
                            <option value="ALL">All Team Members</option>
                            {stats?.employees?.map((e: any) => (
                                <option key={e.userId} value={e.userId}>{e.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {statsLoading ? (
                    <div className="text-sm text-secondary-400 font-bold">Loading team stats...</div>
                ) : stats ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="card-premium p-3 border-l-4 border-indigo-500">
                            <p className="text-[10px] uppercase font-black text-secondary-400">Target</p>
                            <p className="text-xl font-black text-secondary-900">{Math.round(stats.team?.target || 0)}</p>
                        </div>
                        <div className="card-premium p-3 border-l-4 border-emerald-500">
                            <p className="text-[10px] uppercase font-black text-secondary-400">Achieved</p>
                            <p className="text-xl font-black text-emerald-600">{Math.round(stats.team?.achieved || 0)}</p>
                        </div>
                        <div className="card-premium p-3 border-l-4 border-amber-500">
                            <p className="text-[10px] uppercase font-black text-secondary-400">Achievement %</p>
                            <p className="text-xl font-black text-amber-600">{(stats.team?.achievementRate || 0).toFixed(1)}%</p>
                        </div>
                        <div className="card-premium p-3 border-l-4 border-purple-500">
                            <p className="text-[10px] uppercase font-black text-secondary-400">Attendance %</p>
                            <p className="text-xl font-black text-purple-600">{(stats.team?.attendanceRate || 0).toFixed(1)}%</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-secondary-400 font-bold">No stats available</div>
                )}
            </div>

            {stats?.employees?.length > 0 && (
                <div className="card-premium overflow-hidden border border-secondary-100 bg-white">
                    <table className="table w-full">
                        <thead className="bg-secondary-50/50">
                            <tr className="text-[10px] uppercase font-black text-secondary-400 tracking-[0.2em] border-b border-secondary-100">
                                <th className="px-6 py-4 text-left">Member</th>
                                <th className="px-6 py-4 text-left">Target</th>
                                <th className="px-6 py-4 text-left">Achieved</th>
                                <th className="px-6 py-4 text-left">Attendance</th>
                                <th className="px-6 py-4 text-left">Strong Points</th>
                                <th className="px-6 py-4 text-left">Weak Points</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-50">
                            {stats.employees.map((e: any) => (
                                <tr key={e.userId}>
                                    <td className="px-6 py-4 text-sm font-bold text-secondary-900">{e.name}</td>
                                    <td className="px-6 py-4 text-sm text-secondary-700">{Math.round(e.totals?.target || 0)}</td>
                                    <td className="px-6 py-4 text-sm text-secondary-700">{Math.round(e.totals?.achieved || 0)}</td>
                                    <td className="px-6 py-4 text-sm text-secondary-700">
                                        {e.attendance?.present || 0}/{e.attendance?.total || 0} ({(e.attendance?.rate || 0).toFixed(0)}%)
                                    </td>
                                    <td className="px-6 py-4 text-xs text-emerald-700">
                                        {e.strongPoints?.length ? e.strongPoints.map((t: any) => t.title).join(', ') : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-rose-600">
                                        {e.weakPoints?.length ? e.weakPoints.map((t: any) => t.title).join(', ') : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="card-premium overflow-hidden border border-secondary-100 bg-white">
                <table className="table w-full">
                    <thead className="bg-secondary-50/50">
                        <tr className="text-[10px] uppercase font-black text-secondary-400 tracking-[0.2em] border-b border-secondary-100">
                            <th className="px-8 py-6 text-left">Task Description</th>
                            <th className="px-8 py-6 text-left">Assigned To</th>
                            <th className="px-8 py-6 text-center">Duration</th>
                            <th className="px-8 py-6 text-center">Status</th>
                            <th className="px-8 py-6 text-right">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-50">
                        {allTasks.length === 0 ? (
                            <tr><td colSpan={5} className="px-8 py-20 text-center text-secondary-400 font-bold italic">No daily tasks reported by the team recently.</td></tr>
                        ) : allTasks.map((task: any, idx: number) => (
                            <tr key={idx} className="hover:bg-secondary-50/30 transition-colors group">
                                <td className="px-8 py-5 max-w-md">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-xl mt-0.5 ${task.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' :
                                                task.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-600' :
                                                    'bg-secondary-50 text-secondary-400'
                                            }`}>
                                            <Clipboard size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-secondary-900 leading-tight">{task.description}</p>
                                            <p className="text-[10px] text-secondary-400 font-black uppercase tracking-widest mt-1">{task.category || 'General'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-secondary-900 text-white flex items-center justify-center text-[10px] font-black">
                                            {task.employeeName?.[0]}
                                        </div>
                                        <span className="text-xs font-bold text-secondary-700">{task.employeeName}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <span className="text-xs font-black text-secondary-900">{task.duration || 0} hrs</span>
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-wider ${task.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' :
                                            task.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-600' :
                                                'bg-secondary-50 text-secondary-400'
                                        }`}>
                                        {task.status || 'REPORTED'}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <p className="text-xs font-black text-secondary-900"><FormattedDate date={task.reportDate} /></p>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TeamTaskMasterView;
