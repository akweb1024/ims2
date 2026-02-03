import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Edit } from 'lucide-react'; // Import Edit icon

export default function MonitoringDashboard() {
    const [monitors, setMonitors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkLoad, setCheckLoad] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    // Edit Mode State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingMonitor, setEditingMonitor] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        category: '',
        frequency: '5',
        notifyEmail: true,
        notifyWhatsapp: true
    });
    const [submitting, setSubmitting] = useState(false);

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

    const handleEdit = (monitor: any) => {
        setEditingMonitor(monitor);
        setFormData({
            name: monitor.name,
            url: monitor.url,
            category: monitor.category || '',
            frequency: String(monitor.frequency),
            notifyEmail: monitor.notifyEmail,
            notifyWhatsapp: monitor.notifyWhatsapp
        });
        setShowEditModal(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMonitor) return;
        setSubmitting(true);

        try {
            const res = await fetch(`/api/it/monitoring/websites/${editingMonitor.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setShowEditModal(false);
                setEditingMonitor(null);
                fetchMonitors();
            } else {
                alert('Failed to update monitor');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
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
                                <tr><td colSpan={6} className="p-8 text-center text-sm text-secondary-500">Loading monitors...</td></tr>
                            ) : monitors.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-sm text-secondary-500">No websites tracked. Add one to start monitoring.</td></tr>
                            ) : (
                                filteredMonitors.map(m => (
                                    <tr key={m.id} className="hover:bg-secondary-50/50 transition-colors group">
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
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <Link href={`/dashboard/monitoring/logs?monitorId=${m.id}`} className="text-xs font-bold text-primary-600 hover:text-primary-700">
                                                View Logs
                                            </Link>
                                            <button
                                                onClick={() => handleEdit(m)}
                                                className="text-secondary-400 hover:text-secondary-600 transition-colors"
                                                title="Edit Monitor"
                                            >
                                                <Edit size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Edit Modal */}
                {showEditModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/50">
                                <h3 className="text-xl font-black text-secondary-900">Edit Monitor</h3>
                                <button onClick={() => setShowEditModal(false)} className="text-secondary-400 hover:text-secondary-600">✕</button>
                            </div>
                            <form onSubmit={handleUpdate} className="p-6 space-y-4">
                                <div>
                                    <label className="label-premium">Website Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="input-premium"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label-premium">URL</label>
                                    <input
                                        type="url"
                                        required
                                        className="input-premium"
                                        value={formData.url}
                                        onChange={e => setFormData({ ...formData, url: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label-premium">Category</label>
                                    <input
                                        type="text"
                                        className="input-premium"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label-premium">Check Frequency</label>
                                    <select
                                        className="input-premium"
                                        value={formData.frequency}
                                        onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                                    >
                                        <option value="1">Every 1 Minute</option>
                                        <option value="5">Every 5 Minutes</option>
                                        <option value="15">Every 15 Minutes</option>
                                        <option value="30">Every 30 Minutes</option>
                                        <option value="60">Every Hour</option>
                                        <option value="1440">1 Day</option>
                                        <option value="10080">7 Days</option>
                                        <option value="43200">1 Month</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="label-premium mb-1 block">Notifications</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 text-sm text-secondary-600">
                                            <input
                                                type="checkbox"
                                                checked={formData.notifyEmail}
                                                onChange={e => setFormData({ ...formData, notifyEmail: e.target.checked })}
                                                className="rounded text-primary-600 focus:ring-primary-500"
                                            />
                                            Email
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-secondary-600">
                                            <input
                                                type="checkbox"
                                                checked={formData.notifyWhatsapp}
                                                onChange={e => setFormData({ ...formData, notifyWhatsapp: e.target.checked })}
                                                className="rounded text-primary-600 focus:ring-primary-500"
                                            />
                                            WhatsApp
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="flex-1 py-3 text-sm font-bold text-secondary-500 hover:bg-secondary-50 rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-3 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all shadow-lg shadow-primary-600/20"
                                    >
                                        {submitting ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
