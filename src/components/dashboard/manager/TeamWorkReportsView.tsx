'use client';

import React from 'react';
import { useWorkReports, useWorkReportMutations } from '@/hooks/useHR';
import { FileText, CheckCircle, XCircle, Clock, User, MessageSquare } from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';
import { toast } from 'react-hot-toast';

const TeamWorkReportsView: React.FC = () => {
    // Fetch pending work reports for the team
    const { data: reports = [], isLoading: loading } = useWorkReports({ status: 'PENDING' });
    const { updateStatus } = useWorkReportMutations();

    const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            await updateStatus.mutateAsync({ id, status });
            toast.success(`Report ${status.toLowerCase()}`);
        } catch (err) {
            toast.error('Failed to update report');
        }
    };

    if (loading) {
        return <div className="p-20 text-center text-secondary-400 font-bold animate-pulse">Scanning team submissions...</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h2 className="text-3xl font-black text-secondary-900 tracking-tight">Work Report Validation</h2>
                <p className="text-secondary-500 font-medium">Verify and certify daily work submissions from your team</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {reports.length === 0 ? (
                    <div className="card-premium p-20 text-center text-secondary-400 font-bold italic bg-white border border-secondary-100">
                        Zero pending work reports. Your team is up to date!
                    </div>
                ) : reports.map((report: any) => (
                    <div key={report.id} className="card-premium bg-white p-10 border border-secondary-100 hover:border-primary-300 transition-all shadow-xl shadow-secondary-200/20 group relative overflow-hidden">
                        <div className="flex flex-col lg:flex-row gap-10">
                            <div className="flex-1 space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-secondary-900 text-white flex items-center justify-center font-black">
                                        {report.employee.user.name?.[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-secondary-900">{report.employee.user.name}</h3>
                                        <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <Clock size={12} />
                                            Submitted on <FormattedDate date={report.createdAt} />
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em]">Daily Task Logs</h4>
                                    <div className="space-y-3">
                                        {(report.tasks || []).map((task: any, tid: number) => (
                                            <div key={tid} className="p-4 bg-secondary-50 rounded-2xl border border-secondary-100 flex justify-between items-center group/task hover:bg-white hover:border-primary-100 transition-all">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary-600 mt-1.5"></div>
                                                    <div>
                                                        <p className="text-sm font-bold text-secondary-900">{task.description}</p>
                                                        <p className="text-[10px] font-black uppercase text-secondary-400 tracking-wider mt-0.5">{task.category || 'Focus Area'}</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-black text-secondary-700 bg-secondary-100 px-2 py-0.5 rounded-lg">{task.duration || 0}h</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                                    <MessageSquare size={16} className="text-indigo-400 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Employee Notes</p>
                                        <p className="text-xs text-secondary-700 font-medium italic leading-relaxed">
                                            &ldquo;{report.summary || 'Standard daily operations completed as per schedule.'}&rdquo;
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:w-80 flex flex-col gap-4 justify-center border-t lg:border-t-0 lg:border-l border-secondary-100 pt-8 lg:pt-0 lg:pl-10 bg-secondary-50/50 -m-10 mt-0 lg:mt-0 p-10">
                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest text-center mb-4">Verification Action</p>
                                <button
                                    onClick={() => handleAction(report.id, 'APPROVED')}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-3"
                                >
                                    <CheckCircle size={18} />
                                    Certify Report
                                </button>
                                <button
                                    onClick={() => handleAction(report.id, 'REJECTED')}
                                    className="w-full py-4 bg-white hover:bg-rose-50 border border-secondary-200 hover:border-rose-200 text-secondary-600 hover:text-rose-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3"
                                >
                                    <XCircle size={18} />
                                    Request Edit
                                </button>
                                <p className="text-[10px] text-secondary-400 font-medium text-center mt-4">
                                    Approved reports contribute directly to the team&apos;s monthly productivity score.
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TeamWorkReportsView;
