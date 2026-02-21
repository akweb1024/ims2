import { useState } from 'react';
import { Wallet, Info, Calendar, BookOpen, X } from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';
import LeaveGuidelines from '@/components/dashboard/staff/LeaveGuidelines';

interface StaffLeaveManagementProps {
    leaves: any[];
    fullProfile: any;
    onLeaveSubmitted: () => void;
}

export default function StaffLeaveManagement({ leaves, fullProfile, onLeaveSubmitted }: StaffLeaveManagementProps) {
    const [submitting, setSubmitting] = useState(false);
    const [showGuidelines, setShowGuidelines] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const form = e.currentTarget;
            const formData = new FormData(form);
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/leave-requests', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(formData))
            });
            if (res.ok) {
                alert('Leave request submitted successfully');
                form.reset();
                onLeaveSubmitted();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to submit leave request');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
                <div className="grid grid-cols-1 gap-4">
                    {/* Primary Pool Card */}
                    <div className="card-premium p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Wallet size={48} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1 opacity-80">Total Available Pool</h3>
                                    <p className="text-4xl font-black mb-2">{fullProfile?.leaveBalance || 0} <span className="text-sm font-bold opacity-70">Days</span></p>
                                </div>
                                <button onClick={() => setShowGuidelines(true)} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all backdrop-blur-sm">
                                    <BookOpen size={14} /> Guidelines
                                </button>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg text-[10px] font-bold mt-2">
                                <Info size={12} />
                                <span>Main balance used for all leave types</span>
                            </div>
                        </div>
                    </div>

                    {/* Breakdown Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-4 rounded-xl border border-secondary-200 shadow-sm">
                            <p className="text-[10px] font-bold text-secondary-500 uppercase mb-1">Annual</p>
                            <p className="text-xl font-bold text-blue-600">
                                {Math.max(0, (fullProfile?.metrics?.leaveBalances?.annual?.total || 20) - (fullProfile?.metrics?.leaveBalances?.annual?.used || 0))}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-secondary-200 shadow-sm">
                            <p className="text-[10px] font-bold text-secondary-500 uppercase mb-1">Sick</p>
                            <p className="text-xl font-bold text-green-600">
                                {Math.max(0, (fullProfile?.metrics?.leaveBalances?.sick?.total || 10) - (fullProfile?.metrics?.leaveBalances?.sick?.used || 0))}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-secondary-200 shadow-sm">
                            <p className="text-[10px] font-bold text-secondary-500 uppercase mb-1">Casual</p>
                            <p className="text-xl font-bold text-yellow-600">
                                {Math.max(0, (fullProfile?.metrics?.leaveBalances?.casual?.total || 7) - (fullProfile?.metrics?.leaveBalances?.casual?.used || 0))}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-secondary-200 shadow-sm">
                            <p className="text-[10px] font-bold text-secondary-500 uppercase mb-1">Comp.</p>
                            <p className="text-xl font-bold text-purple-600">
                                {Math.max(0, (fullProfile?.metrics?.leaveBalances?.compensatory?.total || 5) - (fullProfile?.metrics?.leaveBalances?.compensatory?.used || 0))}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="card-premium p-6">
                    <h3 className="text-xl font-bold text-secondary-900 mb-6">Request Leave</h3>

                    {/* Reporting Info */}
                    {fullProfile?.manager && (
                        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-xs">
                            <p className="font-bold text-indigo-800 mb-1">Request will be sent to:</p>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
                                    {fullProfile.manager.name?.[0] || 'M'}
                                </div>
                                <div>
                                    <span className="font-bold text-indigo-900">{fullProfile.manager.name || fullProfile.manager.email}</span>
                                    {fullProfile.manager.company && (
                                        <span className="text-[10px] ml-1 opacity-70">
                                            (📍 {fullProfile.manager.company.name})
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="label">Leave Type</label>
                            <select name="type" className="input" required title="Leave Category Selection">
                                <option value="SICK">Sick Leave</option>
                                <option value="CASUAL">Casual Leave</option>
                                <option value="EARNED">Earned Leave (EL)</option>
                                <option value="UNPAID">Unpaid Leave (LWP)</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">Start Date</label>
                                <input name="startDate" type="date" className="input" required title="Leave start date" />
                            </div>
                            <div>
                                <label className="label">End Date</label>
                                <input name="endDate" type="date" className="input" required title="Leave end date" />
                            </div>
                        </div>
                        <div>
                            <label className="label">Reason</label>
                            <textarea name="reason" className="input h-32" required placeholder="Describe the reason for leave..." title="Reason for leave request" />
                        </div>
                        <button type="submit" disabled={submitting} className="btn btn-primary w-full py-3 rounded-xl font-bold shadow-lg">
                            {submitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="card-premium overflow-hidden">
                    <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/30">
                        <h3 className="font-bold text-secondary-900 flex items-center gap-2">
                            <Calendar size={18} className="text-primary-600" />
                            Request History
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Duration</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaves.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-10 text-secondary-500">No leave requests found</td></tr>
                                ) : leaves.map(l => {
                                    const start = new Date(l.startDate);
                                    const end = new Date(l.endDate);
                                    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

                                    return (
                                        <tr key={l.id}>
                                            <td><span className="badge badge-secondary">{l.type}</span></td>
                                            <td>
                                                <div className="font-bold text-secondary-900">{diffDays} Days</div>
                                                <div className="text-[10px] text-secondary-400 font-bold uppercase">
                                                    {start.toLocaleDateString()} - {end.toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="max-w-[200px] truncate" title={l.reason}>{l.reason}</td>
                                            <td>
                                                <span className={`badge ${l.status === 'APPROVED' ? 'badge-success' :
                                                    l.status === 'REJECTED' ? 'badge-danger' :
                                                        'badge-warning'
                                                    }`}>
                                                    {l.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Guidelines Modal */}
            {showGuidelines && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-secondary-100 animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/50 sticky top-0 z-10">
                            <div>
                                <h3 className="text-xl font-black text-secondary-900 flex items-center gap-2">
                                    <BookOpen className="text-indigo-600" size={24} />
                                    Leave Policies & Guidelines
                                </h3>
                                <p className="text-[10px] text-secondary-500 font-black uppercase tracking-widest mt-1">
                                    Official Employee Reference
                                </p>
                            </div>
                            <button
                                onClick={() => setShowGuidelines(false)}
                                className="p-2 text-secondary-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors"
                            >
                                <X size={20} strokeWidth={3} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <LeaveGuidelines />
                        </div>
                        <div className="px-6 py-4 border-t border-secondary-100 bg-secondary-50 flex justify-end">
                            <button
                                onClick={() => setShowGuidelines(false)}
                                className="btn-premium px-6 py-2.5 bg-primary-600 text-white rounded-xl shadow-lg shadow-primary-200 hover:bg-primary-700 font-bold"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
