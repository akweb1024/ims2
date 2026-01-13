'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

function LogsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const monitorId = searchParams.get('monitorId');
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                let url = '/api/it/monitoring/logs?limit=100';
                if (monitorId) url += `&monitorId=${monitorId}`;
                const res = await fetch(url);
                if (res.ok) {
                    setLogs(await res.json());
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [monitorId]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 hover:bg-secondary-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-secondary-600" />
                </button>
                <h1 className="text-2xl font-black text-secondary-900">
                    {monitorId ? 'Website Logs' : 'All Monitoring Logs'}
                </h1>
            </div>

            <div className="card-premium overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-secondary-50 border-b border-secondary-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-black text-secondary-400 uppercase tracking-widest">Time</th>
                            <th className="px-6 py-4 text-xs font-black text-secondary-400 uppercase tracking-widest">Website</th>
                            <th className="px-6 py-4 text-xs font-black text-secondary-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-xs font-black text-secondary-400 uppercase tracking-widest">Response Time</th>
                            <th className="px-6 py-4 text-xs font-black text-secondary-400 uppercase tracking-widest">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-sm text-secondary-500">Loading logs...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-sm text-secondary-500">No logs found.</td></tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id} className="hover:bg-secondary-50/50">
                                    <td className="px-6 py-4 text-sm text-secondary-600">
                                        {new Date(log.checkedAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-secondary-900">{log.monitor?.name}</span>
                                        <div className="text-xs text-secondary-400">{log.monitor?.url}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${log.status === 'UP' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                            }`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-secondary-600">
                                        {log.responseTime}ms
                                    </td>
                                    <td className="px-6 py-4 text-sm text-secondary-500">
                                        {log.reason !== 'OK' && log.reason ? <span className="text-rose-600 font-medium">{log.reason}</span> : 'OK'}
                                        {log.statusCode > 0 && <span className="ml-2 text-xs bg-secondary-100 px-1.5 py-0.5 rounded">HTTP {log.statusCode}</span>}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function LogsPage() {
    return (
        <DashboardLayout>
            <div className="p-6 pb-20">
                <Suspense fallback={<div>Loading...</div>}>
                    <LogsContent />
                </Suspense>
            </div>
        </DashboardLayout>
    );
}
