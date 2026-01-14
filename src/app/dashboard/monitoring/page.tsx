'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function MonitoringDashboard() {
    const [monitors, setMonitors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkLoad, setCheckLoad] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    const fetchMonitors = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/it/monitoring/websites');
            if (res.ok) {
                setMonitors(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMonitors();
    }, []);

    const handleCheckNow = async () => {
        setCheckLoad(true);
        try {
            await fetch('/api/it/monitoring/check', { method: 'POST' });
            fetchMonitors();
        } catch (err) {
            alert('Check failed');
        } finally {
            setCheckLoad(false);
        }
    };

    const upCount = monitors.filter(m => m.status === 'UP').length;
    const downCount = monitors.filter(m => m.status === 'DOWN').length;

    const categories = ['All', ...Array.from(new Set(monitors.map(m => m.category).filter(Boolean)))];
    const filteredMonitors = selectedCategory === 'All'
        ? monitors
        : monitors.filter(m => m.category === selectedCategory);

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6 pb-20">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-black text-secondary-900">Web Monitor Overview</h1>
                    <div className="flex gap-4">
                        <button
                            onClick={handleCheckNow}
                            disabled={checkLoad}
                            className="px-4 py-2 bg-white border border-secondary-200 text-secondary-700 font-bold rounded-xl hover:bg-secondary-50 disabled:opacity-50 transition-colors"
                        >
                            {checkLoad ? 'Checking...' : 'Run Checks Now'}
                        </button>
                        <Link href="/dashboard/monitoring/manage" className="px-4 py-2 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20">
                            Manage Sites
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="card-premium p-6 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black text-secondary-900">{monitors.length}</span>
                        <span className="text-xs font-bold text-secondary-500 uppercase">Total Sites</span>
                    </div>
                    <div className="card-premium p-6 flex flex-col items-center justify-center border-emerald-100 bg-emerald-50/50">
                        <span className="text-4xl font-black text-emerald-600">{upCount}</span>
                        <span className="text-xs font-bold text-emerald-600 uppercase">Online</span>
                    </div>
                    <div className="card-premium p-6 flex flex-col items-center justify-center border-rose-100 bg-rose-50/50">
                        <span className="text-4xl font-black text-rose-600">{downCount}</span>
                        <span className="text-xs font-bold text-rose-600 uppercase">Offline</span>
                    </div>
                    <div className="card-premium p-6 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black text-secondary-900">-</span>
                        <span className="text-xs font-bold text-secondary-500 uppercase">Avg Uptime</span>
                    </div>
                </div>

                <div className="card-premium overflow-hidden">
                    <div className="p-4 border-b border-secondary-100 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-secondary-800">Live Status</h3>
                        <div className="flex gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${selectedCategory === cat
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-secondary-50 border-b border-secondary-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-black text-secondary-400 uppercase tracking-widest">Website</th>
                                <th className="px-6 py-4 text-xs font-black text-secondary-400 uppercase tracking-widest">Category</th>
                                <th className="px-6 py-4 text-xs font-black text-secondary-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-xs font-black text-secondary-400 uppercase tracking-widest">Last Check</th>
                                <th className="px-6 py-4 text-xs font-black text-secondary-400 uppercase tracking-widest">Response</th>
                                <th className="px-6 py-4 text-xs font-black text-secondary-400 uppercase tracking-widest">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-sm text-secondary-500">Loading monitors...</td></tr>
                            ) : monitors.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-sm text-secondary-500">No websites tracked. Add one to start monitoring.</td></tr>
                            ) : (
                                filteredMonitors.map(m => (
                                    <tr key={m.id} className="hover:bg-secondary-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-secondary-900">{m.name}</span>
                                                <a href={m.url} target="_blank" className="text-xs text-primary-600 hover:underline">{m.url}</a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {m.category ? (
                                                <span className="text-[10px] px-2 py-0.5 bg-secondary-100 text-secondary-600 rounded-md font-bold uppercase">
                                                    {m.category}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-secondary-400 italic">Uncategorized</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wide border ${m.status === 'UP' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                m.status === 'DOWN' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                                                    'bg-secondary-100 text-secondary-600 border-secondary-200'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'UP' ? 'bg-emerald-500' :
                                                    m.status === 'DOWN' ? 'bg-rose-500' :
                                                        'bg-secondary-400'
                                                    }`} />
                                                {m.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            {m.lastCheck ? new Date(m.lastCheck).toLocaleString() : 'Never'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            {m.logs?.[0] ? `${m.logs[0].responseTime || 0}ms` : '-'}
                                            {m.logs?.[0]?.reason && m.logs[0].reason !== 'OK' && (
                                                <div className="text-[10px] text-rose-500 font-bold mt-0.5">{m.logs[0].reason}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link href={`/dashboard/monitoring/logs?monitorId=${m.id}`} className="text-xs font-bold text-primary-600 hover:text-primary-700">
                                                View Logs
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
