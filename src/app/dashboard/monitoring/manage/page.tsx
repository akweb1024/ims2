'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, ArrowLeft } from 'lucide-react';

import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function ManageMonitorsPage() {
    const router = useRouter();
    const [monitors, setMonitors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        frequency: '5',
        notifyEmail: true,
        notifyWhatsapp: true
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchMonitors = async () => {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/it/monitoring/websites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setFormData({ name: '', url: '', frequency: '5', notifyEmail: true, notifyWhatsapp: true });
                fetchMonitors();
                // Optionally show success toast
            } else {
                alert('Failed to add monitor');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this monitor?')) return;
        try {
            await fetch(`/api/it/monitoring/websites/${id}`, { method: 'DELETE' });
            fetchMonitors();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto p-6 space-y-8 pb-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-secondary-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-secondary-600" />
                    </button>
                    <h1 className="text-2xl font-black text-secondary-900">Manage Websites</h1>
                    <div className="flex-1" />
                    <div className="flex gap-3">
                        <button
                            onClick={() => window.open('/api/it/monitoring/import-export', '_blank')}
                            className="px-4 py-2 bg-white border border-secondary-200 text-secondary-700 font-bold rounded-xl hover:bg-secondary-50 transition-colors text-sm"
                        >
                            Export CSV
                        </button>
                        <button
                            onClick={() => document.getElementById('import-file')?.click()}
                            className="px-4 py-2 bg-white border border-secondary-200 text-secondary-700 font-bold rounded-xl hover:bg-secondary-50 transition-colors text-sm"
                        >
                            Import CSV
                        </button>
                        <input
                            type="file"
                            id="import-file"
                            accept=".csv"
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                const formData = new FormData();
                                formData.append('file', file);

                                try {
                                    const res = await fetch('/api/it/monitoring/import-export', {
                                        method: 'POST',
                                        body: formData
                                    });
                                    const data = await res.json();
                                    if (res.ok) {
                                        alert(`Imported ${data.count} monitors successfully.`);
                                        // Refresh the list
                                        try {
                                            const refreshRes = await fetch('/api/it/monitoring/websites');
                                            if (refreshRes.ok) {
                                                const newMonitors = await refreshRes.json();
                                                // We need to update the state. Since 'setMonitors' is not directly accessible here 
                                                // without refactoring, we'll reload the page or trigger a refresh another way.
                                                // But wait, we are inside the component render, so we can't access setMonitors easily 
                                                // if we define this inline.
                                                // Let's refactor this handler to be a named function outside the JSX but inside the component.
                                            }
                                        } catch { }
                                        window.location.reload(); // Simple reload to refresh list
                                    } else {
                                        alert('Import failed: ' + (data.error || 'Unknown error'));
                                    }
                                } catch (err) {
                                    console.error(err);
                                    alert('Import failed');
                                }
                                e.target.value = '';
                            }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Add Form */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="card-premium p-6">
                            <h2 className="text-lg font-bold text-secondary-900 mb-4">Add New Website</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="label-premium">Website Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="input-premium"
                                        placeholder="e.g. Corporate Site"
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
                                        placeholder="https://example.com"
                                        value={formData.url}
                                        onChange={e => setFormData({ ...formData, url: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label-premium">Check Frequency (Minutes)</label>
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
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="label-premium mb-1 block">Notifications</label>
                                    <label className="flex items-center gap-2 text-sm text-secondary-600">
                                        <input
                                            type="checkbox"
                                            checked={formData.notifyEmail}
                                            onChange={e => setFormData({ ...formData, notifyEmail: e.target.checked })}
                                            className="rounded text-primary-600 focus:ring-primary-500"
                                        />
                                        Email Alerts
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-secondary-600">
                                        <input
                                            type="checkbox"
                                            checked={formData.notifyWhatsapp}
                                            onChange={e => setFormData({ ...formData, notifyWhatsapp: e.target.checked })}
                                            className="rounded text-primary-600 focus:ring-primary-500"
                                        />
                                        WhatsApp Alerts
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full btn-primary"
                                >
                                    {submitting ? 'Adding...' : 'Add Monitor'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* List */}
                    <div className="lg:col-span-2 space-y-4">
                        <h2 className="text-lg font-bold text-secondary-900">Existing Monitors</h2>
                        <div className="space-y-3">
                            {loading && <div className="text-center p-4">Loading...</div>}
                            {!loading && monitors.length === 0 && (
                                <div className="text-center p-8 bg-secondary-50 rounded-xl text-secondary-500 text-sm">
                                    No monitors added yet.
                                </div>
                            )}
                            {monitors.map(m => (
                                <div key={m.id} className="card-premium p-4 flex justify-between items-center group">
                                    <div>
                                        <h3 className="font-bold text-secondary-900">{m.name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-secondary-500">
                                            <a href={m.url} target="_blank" className="hover:underline">{m.url}</a>
                                            <span>•</span>
                                            <span>Every {m.frequency} mins</span>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            {m.notifyEmail && <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-bold">Email</span>}
                                            {m.notifyWhatsapp && <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-bold">WhatsApp</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(m.id)}
                                        className="p-2 text-secondary-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
