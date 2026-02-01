'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface LeaveManagementProps {
    filters: any;
}

export default function LeaveManagement({ filters }: LeaveManagementProps) {
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

    useEffect(() => {
        const fetchLeaves = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (filters.companyId !== 'all') params.append('companyId', filters.companyId);
                if (filters.teamId !== 'all') params.append('departmentId', filters.teamId);
                if (filters.employeeId !== 'all') params.append('employeeId', filters.employeeId);

                const res = await fetch(`/api/staff-management/leaves?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setLeaves(data);
                }
            } catch (err) {
                console.error('Error fetching leaves:', err);
                toast.error('Failed to fetch leave requests');
            } finally {
                setLoading(false);
            }
        };

        fetchLeaves();
    }, [filters]);

    const handleLeaveAction = async (leaveId: string, action: 'APPROVED' | 'REJECTED', comment?: string) => {
        try {
            const res = await fetch(`/api/staff-management/leaves/${leaveId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: action, managerComment: comment })
            });

            if (res.ok) {
                toast.success(`Leave ${action.toLowerCase()} successfully`);
                setLeaves(leaves.map(l =>
                    l.id === leaveId ? { ...l, status: action } : l
                ));
            } else {
                toast.error('Failed to update leave request');
            }
        } catch (err) {
            console.error('Error updating leave:', err);
            toast.error('An error occurred');
        }
    };

    const filteredLeaves = leaves.filter(leave => {
        if (activeTab === 'pending') return leave.status === 'PENDING';
        if (activeTab === 'approved') return leave.status === 'APPROVED';
        if (activeTab === 'rejected') return leave.status === 'REJECTED';
        return true;
    });

    const summary = {
        pending: leaves.filter(l => l.status === 'PENDING').length,
        approved: leaves.filter(l => l.status === 'APPROVED').length,
        rejected: leaves.filter(l => l.status === 'REJECTED').length,
        total: leaves.length
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-secondary-900">Leave Management</h2>
                    <p className="text-sm text-secondary-500">Review and manage employee leave requests</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`bg-white rounded-xl shadow-sm border p-4 text-left hover:shadow-md transition-shadow ${activeTab === 'pending' ? 'border-primary-500 ring-2 ring-primary-100' : 'border-secondary-200'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Pending</p>
                            <p className="text-2xl font-bold text-orange-600">{summary.pending}</p>
                        </div>
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">⏳</div>
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('approved')}
                    className={`bg-white rounded-xl shadow-sm border p-4 text-left hover:shadow-md transition-shadow ${activeTab === 'approved' ? 'border-primary-500 ring-2 ring-primary-100' : 'border-secondary-200'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Approved</p>
                            <p className="text-2xl font-bold text-green-600">{summary.approved}</p>
                        </div>
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">✅</div>
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('rejected')}
                    className={`bg-white rounded-xl shadow-sm border p-4 text-left hover:shadow-md transition-shadow ${activeTab === 'rejected' ? 'border-primary-500 ring-2 ring-primary-100' : 'border-secondary-200'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Rejected</p>
                            <p className="text-2xl font-bold text-red-600">{summary.rejected}</p>
                        </div>
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">❌</div>
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('all')}
                    className={`bg-white rounded-xl shadow-sm border p-4 text-left hover:shadow-md transition-shadow ${activeTab === 'all' ? 'border-primary-500 ring-2 ring-primary-100' : 'border-secondary-200'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Total</p>
                            <p className="text-2xl font-bold text-secondary-900">{summary.total}</p>
                        </div>
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">📋</div>
                    </div>
                </button>
            </div>

            {/* Leave Requests List */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Leave Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Duration</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Days</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Reason</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-200">
                                {filteredLeaves.map((leave) => (
                                    <tr key={leave.id} className="hover:bg-secondary-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-sm">
                                                    {leave.employee?.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="ml-2">
                                                    <p className="text-sm font-medium text-secondary-900">{leave.employee?.name}</p>
                                                    <p className="text-xs text-secondary-500">{leave.employee?.department?.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                {leave.leaveType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            <div className="flex items-center gap-1">
                                                <span>{new Date(leave.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                                <span>-</span>
                                                <span>{new Date(leave.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600 font-medium">
                                            {leave.totalDays} days
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600 max-w-xs truncate">
                                            {leave.reason}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${leave.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                    leave.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {leave.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {leave.status === 'PENDING' && (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleLeaveAction(leave.id, 'APPROVED')}
                                                        className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleLeaveAction(leave.id, 'REJECTED')}
                                                        className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                            {leave.status !== 'PENDING' && (
                                                <span className="text-xs text-secondary-500">
                                                    {leave.managerComment || 'No comment'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredLeaves.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-secondary-500">No leave requests found</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
