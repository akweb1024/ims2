'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/admin/audit-logs', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) setLogs(await res.json());
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    return (
        <DashboardLayout userRole="SUPER_ADMIN">
            <div className="space-y-8 max-w-7xl mx-auto">
                <div>
                    <h1 className="text-4xl font-extrabold text-secondary-900 tracking-tight">System Audit logs</h1>
                    <p className="text-secondary-600 mt-2 text-lg">Trace every action across the platform for accountability.</p>
                </div>

                <div className="card-premium overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-secondary-50 border-b border-secondary-100 text-[10px] uppercase font-black tracking-widest text-secondary-500">
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Action</th>
                                    <th className="px-6 py-4">Entity</th>
                                    <th className="px-6 py-4">Entity ID</th>
                                    <th className="px-6 py-4">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-50">
                                {loading ? (
                                    [1, 2, 3].map(i => <tr key={i} className="animate-pulse"><td colSpan={5} className="p-8 h-4"></td></tr>)
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-20 text-center text-secondary-400 font-bold italic">No logs recorded yet.</td>
                                    </tr>
                                ) : logs.map(log => (
                                    <tr key={log.id} className="hover:bg-secondary-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-secondary-900">{log.user?.email || 'System'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            <span className={`px-2 py-1 rounded-lg font-black uppercase text-[10px] ${log.action === 'CREATE' ? 'bg-success-100 text-success-700' :
                                                log.action === 'UPDATE' ? 'bg-warning-100 text-warning-700' :
                                                    'bg-danger-100 text-danger-700'
                                                }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-secondary-600 uppercase tracking-widest text-[10px]">{log.entity}</td>
                                        <td className="px-6 py-4 text-[10px] font-mono text-secondary-400">{log.entityId}</td>
                                        <td className="px-6 py-4 text-xs font-medium text-secondary-500">
                                            <FormattedDate date={log.createdAt} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
