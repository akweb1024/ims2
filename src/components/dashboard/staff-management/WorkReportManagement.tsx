'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface WorkReportManagementProps {
    filters: any;
}

interface WorkReport {
    id: string;
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    department: string;
    date: string;
    tasks: {
        id: string;
        description: string;
        hours: number;
        status: string;
    }[];
    totalHours: number;
    status: string;
    managerComment: string | null;
    submittedAt: string;
}

export default function WorkReportManagement({ filters }: WorkReportManagementProps) {
    const [workReports, setWorkReports] = useState<WorkReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

    useEffect(() => {
        const fetchWorkReports = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                params.append('date', selectedDate);
                if (filters.companyId !== 'all') params.append('companyId', filters.companyId);
                if (filters.teamId !== 'all') params.append('departmentId', filters.teamId);
                if (filters.employeeId !== 'all') params.append('employeeId', filters.employeeId);

                const res = await fetch(`/api/staff-management/work-reports?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setWorkReports(data);
                }
            } catch (err) {
                console.error('Error fetching work reports:', err);
                toast.error('Failed to fetch work reports');
            } finally {
                setLoading(false);
            }
        };

        fetchWorkReports();
    }, [filters, selectedDate]);

    const handleReportAction = async (reportId: string, action: 'APPROVED' | 'REJECTED', comment?: string) => {
        try {
            const res = await fetch(`/api/staff-management/work-reports/${reportId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: action, managerComment: comment })
            });

            if (res.ok) {
                toast.success(`Work report ${action.toLowerCase()} successfully`);
                setWorkReports(workReports.map(r =>
                    r.id === reportId ? { ...r, status: action, managerComment: comment || null } : r
                ));
            } else {
                toast.error('Failed to update work report');
            }
        } catch (err) {
            console.error('Error updating work report:', err);
            toast.error('An error occurred');
        }
    };

    const filteredReports = workReports.filter(report => {
        if (activeTab === 'pending') return report.status === 'SUBMITTED' || report.status === 'PENDING';
        if (activeTab === 'approved') return report.status === 'APPROVED';
        if (activeTab === 'rejected') return report.status === 'REJECTED';
        return true;
    });

    const summary = {
        pending: workReports.filter(r => r.status === 'SUBMITTED' || r.status === 'PENDING').length,
        approved: workReports.filter(r => r.status === 'APPROVED').length,
        rejected: workReports.filter(r => r.status === 'REJECTED').length,
        totalHours: workReports.reduce((sum, r) => sum + r.totalHours, 0)
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-secondary-900">Work Reports</h2>
                    <p className="text-sm text-secondary-500">Review and manage employee work reports</p>
                </div>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
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
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Total Hours</p>
                            <p className="text-2xl font-bold text-secondary-900">{summary.totalHours}</p>
                        </div>
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">⏱️</div>
                    </div>
                </div>
            </div>

            {/* Work Reports List */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredReports.map((report) => (
                        <div key={report.id} className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
                            <div className="p-4 border-b border-secondary-200 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold">
                                        {report.employeeName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-secondary-900">{report.employeeName}</p>
                                        <p className="text-sm text-secondary-500">{report.department} • {new Date(report.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-secondary-600">{report.totalHours} hours</span>
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${report.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                        report.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {report.status}
                                    </span>
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="space-y-2 mb-4">
                                    {report.tasks.map((task) => (
                                        <div key={task.id} className="flex items-center justify-between p-2 bg-secondary-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={task.status === 'COMPLETED'}
                                                    readOnly
                                                    className="w-4 h-4 text-primary-600 rounded"
                                                />
                                                <span className={task.status === 'COMPLETED' ? 'text-secondary-500 line-through' : 'text-secondary-700'}>
                                                    {task.description}
                                                </span>
                                            </div>
                                            <span className="text-sm font-medium text-secondary-600">{task.hours}h</span>
                                        </div>
                                    ))}
                                </div>
                                {(report.status === 'SUBMITTED' || report.status === 'PENDING') && (
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleReportAction(report.id, 'REJECTED', 'Please provide more details')}
                                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleReportAction(report.id, 'APPROVED', 'Good work!')}
                                            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                                        >
                                            Approve
                                        </button>
                                    </div>
                                )}
                                {report.managerComment && (
                                    <div className="mt-3 p-2 bg-blue-50 text-blue-700 text-sm rounded-lg">
                                        Manager Comment: {report.managerComment}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {filteredReports.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-secondary-200">
                            <p className="text-secondary-500">No work reports found</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
