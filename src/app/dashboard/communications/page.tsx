'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import Link from 'next/link';

export default function CommunicationsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1
    });

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/communications?page=${page}&limit=${pagination.limit}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.pagination) {
                    setLogs(data.data);
                    setPagination(data.pagination);
                } else {
                    setLogs(data.data || data);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [pagination.limit]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }
        fetchLogs();
    }, [fetchLogs]);

    const getChannelIcon = (channel: string) => {
        switch (channel.toUpperCase()) {
            case 'EMAIL': return '📧';
            case 'PHONE': return '📞';
            case 'WHATSAPP': return '📱';
            case 'MEETING': return '🤝';
            default: return '💬';
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">Communication History</h1>
                        <p className="text-secondary-600 mt-1">Global audit trail of all customer interactions</p>
                    </div>
                    {['SUPER_ADMIN', 'MANAGER'].includes(userRole) && (
                        <Link href="/dashboard/communications/bulk" className="btn btn-primary flex items-center gap-2">
                            <span className="text-xl">🚀</span> Send Bulk Message
                        </Link>
                    )}
                </div>

                <div className="card-premium overflow-hidden">
                    <div className="divide-y divide-secondary-100">
                        {loading ? (
                            <div className="p-12 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="p-12 text-center text-secondary-400">
                                No communication logs found.
                            </div>
                        ) : (
                            logs.map(log => (
                                <div key={log.id} className="p-6 hover:bg-secondary-50 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white border border-secondary-200 flex items-center justify-center text-2xl shadow-sm">
                                                {getChannelIcon(log.channel)}
                                            </div>
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <h4 className="font-bold text-secondary-900">{log.subject}</h4>
                                                    <span className="text-secondary-300">|</span>
                                                    <Link
                                                        href={`/dashboard/customers/${log.customerProfileId}`}
                                                        className="text-sm font-bold text-primary-600 hover:underline"
                                                    >
                                                        {log.customerProfile.name}
                                                    </Link>
                                                    {log.customerProfile.institution ? (
                                                        <Link href={`/dashboard/institutions/${log.customerProfile.institution.id}`} className="text-xs text-secondary-500 hover:text-primary-600">
                                                            ({log.customerProfile.institution.name})
                                                        </Link>
                                                    ) : log.customerProfile.organizationName && (
                                                        <span className="text-xs text-secondary-400">({log.customerProfile.organizationName})</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-secondary-600 mt-1">{log.notes}</p>
                                                <div className="flex items-center mt-3 space-x-4 text-[10px] font-black uppercase tracking-widest text-secondary-400">
                                                    <div className="flex items-center">
                                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                        Logged By: {log.user.role}
                                                    </div>
                                                    <div className="flex items-center">
                                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        Date: <span className="ml-1"><FormattedDate date={log.date} /></span>
                                                    </div>
                                                    {log.outcome && (
                                                        <div className="flex items-center text-success-600">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-success-600 mr-1.5"></span>
                                                            Outcome: {log.outcome}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {log.nextFollowUpDate && !log.isFollowUpCompleted && (
                                            <div className="text-right">
                                                <div className="inline-flex flex-col items-end gap-2">
                                                    <div className="inline-flex items-center px-3 py-1 bg-warning-50 text-warning-700 rounded-full text-xs font-bold border border-warning-100">
                                                        <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        Follow-up: <span className="ml-1 italic"><FormattedDate date={log.nextFollowUpDate} /></span>
                                                    </div>
                                                    {['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE'].includes(userRole) && (
                                                        <Link
                                                            href={`/dashboard/customers/${log.customerProfileId}?followUpId=${log.id}#communication-form`}
                                                            className="text-[10px] bg-primary-600 text-white px-3 py-1 rounded-full font-bold hover:bg-primary-700 transition-colors shadow-sm"
                                                        >
                                                            Respond to Task
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {log.nextFollowUpDate && log.isFollowUpCompleted && (
                                            <div className="text-right">
                                                <div className="inline-flex items-center px-3 py-1 bg-success-50 text-success-700 rounded-full text-xs font-bold border border-success-100 opacity-60">
                                                    <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Follow-up Completed
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {!loading && logs.length > 0 && (
                        <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-100 flex items-center justify-between">
                            <div className="text-sm text-secondary-500">
                                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> logs
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    className="px-3 py-1 bg-white border border-secondary-200 rounded-md text-sm disabled:opacity-50 hover:bg-secondary-50"
                                    disabled={pagination.page === 1}
                                    onClick={() => fetchLogs(pagination.page - 1)}
                                >
                                    Previous
                                </button>
                                <button
                                    className="px-3 py-1 bg-white border border-secondary-200 rounded-md text-sm disabled:opacity-50 hover:bg-secondary-50"
                                    disabled={pagination.page === pagination.totalPages}
                                    onClick={() => fetchLogs(pagination.page + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
