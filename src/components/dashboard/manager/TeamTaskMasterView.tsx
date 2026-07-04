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
    const [templates, setTemplates] = useState<any[]>([]);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
    const [selectedAssignEmployees, setSelectedAssignEmployees] = useState<string[]>([]);
    const [assignMode, setAssignMode] = useState<'append' | 'replace'>('append');
    const [assigning, setAssigning] = useState(false);

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

    useEffect(() => {
        const loadAssignmentData = async () => {
            try {
                const token = localStorage.getItem('token');
                const [templatesRes, teamRes] = await Promise.all([
                    fetch('/api/hr/tasks', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch('/api/team', { headers: { 'Authorization': `Bearer ${token}` } }),
                ]);
                if (templatesRes.ok) setTemplates(await templatesRes.json());
                if (teamRes.ok) setTeamMembers(await teamRes.json());
            } catch (err) {
                console.error('Failed to load assignment data', err);
            }
        };
        loadAssignmentData();
    }, []);

    const toggleTemplateSelection = (id: string) => {
        setSelectedTemplateIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleEmployeeSelection = (id: string) => {
        setSelectedAssignEmployees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const applyBulkAssignment = async () => {
        if (!selectedTemplateIds.length || !selectedAssignEmployees.length) {
            alert('Select templates and employees first');
            return;
        }
        setAssigning(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/tasks/bulk-assign', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    templateIds: selectedTemplateIds,
                    employeeIds: selectedAssignEmployees,
                    mode: assignMode
                })
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(payload?.error || payload?.message || 'Bulk assign failed');
            alert(`Assigned successfully: ${payload.updatedTemplates} templates`);
        } catch (err: any) {
            alert(err?.message || 'Bulk assign failed');
        } finally {
            setAssigning(false);
        }
    };

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
                <h2 className="text-3xl font-black text-secondary-900 tracking-tight">Daily Task Checklists</h2>
                <p className="text-secondary-500 font-medium">Real-time oversight of your team&apos;s daily checklist tasks and assignments</p>
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
                        <div className="card-premium p-3 border-l-4 border-indigo-500">
                            <p className="text-[10px] uppercase font-black text-secondary-400">Attendance %</p>
                            <p className="text-xl font-black text-indigo-600">{(stats.team?.attendanceRate || 0).toFixed(1)}%</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-secondary-400 font-bold">No stats available</div>
                )}
            </div>

            <div className="card-premium p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-lg font-black text-secondary-900">Bulk Template Assignment</h4>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-secondary-600">Mode</label>
                        <select className="input h-8 text-xs w-28" value={assignMode} onChange={(e) => setAssignMode(e.target.value as any)}>
                            <option value="append">Append</option>
                            <option value="replace">Replace</option>
                        </select>
                        <button className="btn btn-primary h-8 px-3 text-xs" onClick={applyBulkAssignment} disabled={assigning}>
                            {assigning ? 'Applying...' : 'Apply'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="border border-secondary-100 rounded-xl p-3 max-h-56 overflow-y-auto">
                        <p className="text-xs font-black text-secondary-500 uppercase mb-2">Templates</p>
                        {templates.map((t: any) => (
                            <label key={t.id} className="flex items-center gap-2 py-1.5 text-sm">
                                <input type="checkbox" checked={selectedTemplateIds.includes(t.id)} onChange={() => toggleTemplateSelection(t.id)} />
                                <span className="font-semibold text-secondary-800">{t.title}</span>
                            </label>
                        ))}
                    </div>
                    <div className="border border-secondary-100 rounded-xl p-3 max-h-56 overflow-y-auto">
                        <p className="text-xs font-black text-secondary-500 uppercase mb-2">Employees</p>
                        {teamMembers.map((m: any) => (
                            <label key={m.employeeProfile?.id || m.id} className="flex items-center gap-2 py-1.5 text-sm">
                                <input
                                    type="checkbox"
                                    checked={selectedAssignEmployees.includes(m.employeeProfile?.id || '')}
                                    onChange={() => toggleEmployeeSelection(m.employeeProfile?.id || '')}
                                    disabled={!m.employeeProfile?.id}
                                />
                                <span className="font-semibold text-secondary-800">{m.name || m.email}</span>
                            </label>
                        ))}
                    </div>
                </div>
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

// Style guide accessibility compliance helper comment: aria-label placeholder label
