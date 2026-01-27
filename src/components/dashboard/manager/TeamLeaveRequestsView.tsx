'use client';

import React from 'react';
import { useLeaveRequests, useUpdateLeaveRequest } from '@/hooks/useHR';
import { Clock, CheckCircle, XCircle, User, Calendar, MessageSquare } from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';
import { toast } from 'react-hot-toast';

const TeamLeaveRequestsView: React.FC = () => {
    // 'all=true' for team-wide requests
    const { data: requests = [], isLoading: loading } = useLeaveRequests(undefined, true);
    const updateMutation = useUpdateLeaveRequest();

    const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            await updateMutation.mutateAsync({ leaveId: id, status });
            toast.success(`Leave request ${status.toLowerCase()}`);
        } catch (err) {
            toast.error('Failed to update request');
        }
    };

    if (loading) {
        return <div className="p-20 text-center text-secondary-400 font-bold animate-pulse">Processing leave requests...</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h2 className="text-3xl font-black text-secondary-900 tracking-tight">Team Leave Requests</h2>
                <p className="text-secondary-500 font-medium">Review and approve time-off for your team</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {requests.length === 0 ? (
                    <div className="card-premium p-20 text-center text-secondary-400 font-bold italic bg-white border border-secondary-100">
                        No pending or recent leave requests found.
                    </div>
                ) : requests.map((req: any) => (
                    <div key={req.id} className="card-premium bg-white p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border border-secondary-100 hover:border-primary-200 transition-all group shadow-sm hover:shadow-xl">
                        <div className="flex gap-6 items-start flex-1 min-w-0">
                            <div className="w-14 h-14 rounded-2xl bg-secondary-900 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-secondary-200 group-hover:scale-110 transition-transform">
                                {req.employee.user.name?.[0]?.toUpperCase()}
                            </div>
                            <div className="space-y-2 min-w-0 flex-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-black text-secondary-900 truncate">
                                        {req.employee.user.name}
                                    </h3>
                                    <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-wider ${req.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                            req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                'bg-rose-50 text-rose-600 border border-rose-100'
                                        }`}>
                                        {req.status}
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-4 text-xs font-bold text-secondary-400 uppercase tracking-wider">
                                    <div className="flex items-center gap-1.5 pt-1">
                                        <Calendar size={12} />
                                        <span><FormattedDate date={req.startDate} /> → <FormattedDate date={req.endDate} /></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 pt-1">
                                        <Clock size={12} />
                                        <span>{req.type.replace('_', ' ')}</span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 bg-secondary-50 p-3 rounded-xl mt-2 max-w-2xl">
                                    <MessageSquare size={14} className="text-secondary-300 mt-0.5" />
                                    <p className="text-xs text-secondary-600 italic leading-relaxed whitespace-pre-wrap">
                                        &ldquo;{req.reason || 'No reason provided'}&rdquo;
                                    </p>
                                </div>
                            </div>
                        </div>

                        {req.status === 'PENDING' && (
                            <div className="flex gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => handleAction(req.id, 'REJECTED')}
                                    className="btn btn-outline border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200 flex-1 md:flex-none py-2.5 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest"
                                >
                                    <XCircle size={16} className="mr-2" />
                                    Deny
                                </button>
                                <button
                                    onClick={() => handleAction(req.id, 'APPROVED')}
                                    className="btn btn-primary bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-200 flex-1 md:flex-none py-2.5 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest"
                                >
                                    <CheckCircle size={16} className="mr-2" />
                                    Approve
                                </button>
                            </div>
                        )}

                        {req.status !== 'PENDING' && (
                            <div className="text-right">
                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Processed By</p>
                                <p className="text-xs font-bold text-secondary-900">{req.approvedBy?.name || 'System'}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TeamLeaveRequestsView;
