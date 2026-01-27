'use client';

import React from 'react';
import { useWorkReports } from '@/hooks/useHR';
import { Clipboard, CheckCircle, Clock, AlertTriangle, User } from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';

const TeamTaskMasterView: React.FC = () => {
    // Fetch recent work reports for the team
    const { data: reports = [], isLoading: loading } = useWorkReports();

    if (loading) {
        return <div className="p-20 text-center text-secondary-400 font-bold animate-pulse">Loading team task matrix...</div>;
    }

    // Flatten tasks from reports for a "Task Master" view
    const allTasks = reports.flatMap((report: any) =>
        (report.tasks || []).map((task: any) => ({
            ...task,
            employeeName: report.employee.user.name,
            reportDate: report.date
        }))
    ).sort((a: any, b: any) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h2 className="text-3xl font-black text-secondary-900 tracking-tight">Task Master</h2>
                <p className="text-secondary-500 font-medium">Real-time oversight of daily team activities and assignments</p>
            </div>

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
