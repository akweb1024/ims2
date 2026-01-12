'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function HolidayCalendarPage() {
    const [holidays, setHolidays] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', date: '', type: 'PUBLIC', description: '' });
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [search, setSearch] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchHolidays();
    }, []);

    const fetchHolidays = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/holidays', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setHolidays(await res.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const headers = ['Name', 'Date', 'Type', 'Description'];
        const csvContent = [
            headers.join(','),
            ...holidays.map(h => {
                const date = new Date(h.date).toISOString().split('T')[0];
                const cleanDesc = (h.description || '').replace(/"/g, '""').replace(/,/g, ';'); // Simple escape
                return `"${h.name}","${date}","${h.type}","${cleanDesc}"`;
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'holidays_export.csv');
            link.setAttribute('target', '_blank'); // fallback
            link.click();
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const rows = text.split('\n').map(r => r.trim()).filter(r => r);
            const dataToImport = [];

            // Skip header if detected
            let startIdx = 0;
            if (rows[0].toLowerCase().includes('name') && rows[0].toLowerCase().includes('date')) {
                startIdx = 1;
            }

            for (let i = startIdx; i < rows.length; i++) {
                // Simple CSV parse: assumes quoted strings logic or comma separation
                // Safe basic parse: split by comma, remove quotes
                const cols = rows[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                if (cols.length >= 2) {
                    dataToImport.push({
                        name: cols[0],
                        date: cols[1],
                        type: cols[2] || 'PUBLIC',
                        description: cols[3] || ''
                    });
                }
            }

            if (dataToImport.length > 0) {
                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch('/api/hr/holidays', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify(dataToImport)
                    });
                    if (res.ok) {
                        fetchHolidays();
                    }
                } catch (err) {
                    console.error('Import failed', err);
                }
            }
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/holidays', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                fetchHolidays();
                setShowModal(false);
                setForm({ name: '', date: '', type: 'PUBLIC', description: '' });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'].includes(userRole);

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-wrap items-center justify-between gap-6 bg-white p-6 rounded-[2rem] border border-secondary-100 shadow-sm relative overflow-hidden">
                    <div className="relative z-10 flex-1">
                        <div className="flex items-center gap-4 mb-4">
                            <input
                                type="text"
                                placeholder="Search by event name..."
                                className="input h-11 text-sm flex-1 max-w-md bg-secondary-50/50"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            <div className="flex gap-1 p-1 bg-secondary-100 rounded-xl">
                                <button onClick={() => setViewMode('grid')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'grid' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-400'}`}>Grid</button>
                                <button onClick={() => setViewMode('table')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'table' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-400'}`}>Table</button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-secondary-500">
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600"></span> Public</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-600"></span> Optional</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-pink-600"></span> Company</span>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="flex items-center gap-2 relative z-10">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv"
                                onChange={handleImport}
                            />
                            <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-secondary-50 text-secondary-700 hover:bg-secondary-100 rounded-xl transition-all" title="Import CSV">
                                📤
                            </button>
                            <button onClick={handleExport} className="p-3 bg-secondary-50 text-secondary-700 hover:bg-secondary-100 rounded-xl transition-all" title="Export CSV">
                                📥
                            </button>
                            <button onClick={() => setShowModal(true)} className="btn btn-primary px-8 rounded-2xl h-11 font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-200 ml-4">
                                + Add Event
                            </button>
                        </div>
                    )}
                </div>

                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            <div className="col-span-full py-20 text-center">Consulting the calendar...</div>
                        ) : holidays.filter(h => h.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                            <div className="col-span-full py-20 card-premium text-center border-dashed">
                                <div className="text-4xl mb-4">📅</div>
                                <p className="font-bold text-secondary-400">No events found for your search.</p>
                            </div>
                        ) : (
                            holidays.filter(h => h.name.toLowerCase().includes(search.toLowerCase())).map((h) => (
                                <div key={h.id} className="card-premium group hover:border-primary-500 transition-all border-l-4" style={{ borderColor: h.type === 'PUBLIC' ? '#2563eb' : h.type === 'OPTIONAL' ? '#7c3aed' : '#db2777' }}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-secondary-50 rounded-2xl flex flex-col items-center min-w-[60px] group-hover:bg-primary-50 transition-colors">
                                            <span className="text-[10px] font-black uppercase text-secondary-400 group-hover:text-primary-600">{new Date(h.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                                            <span className="text-2xl font-black text-secondary-900">{new Date(h.date).getDate()}</span>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${h.type === 'PUBLIC' ? 'bg-blue-50 text-blue-600' :
                                            h.type === 'OPTIONAL' ? 'bg-purple-50 text-purple-600' : 'bg-pink-50 text-pink-600'
                                            }`}>
                                            {h.type}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black text-secondary-900 mb-2 truncate group-hover:text-primary-600 transition-colors">{h.name}</h3>
                                    <p className="text-xs text-secondary-500 line-clamp-2 leading-relaxed">{h.description || 'No description provided.'}</p>
                                    <div className="mt-6 pt-6 border-t border-secondary-50 flex justify-between items-center text-[10px] font-bold text-secondary-400 uppercase tracking-widest">
                                        <span>{new Date(h.date).toLocaleDateString(undefined, { weekday: 'long' })}</span>
                                        <span>Added {new Date(h.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="card-premium p-0 overflow-hidden border border-secondary-100">
                        <table className="table w-full text-left">
                            <thead>
                                <tr className="bg-secondary-50/50 text-[10px] font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100">
                                    <th className="p-6">Date</th>
                                    <th className="p-6">Holiday Event</th>
                                    <th className="p-6">Type</th>
                                    <th className="p-6">Description</th>
                                    <th className="p-6">Added On</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-50">
                                {holidays.filter(h => h.name.toLowerCase().includes(search.toLowerCase())).map(h => (
                                    <tr key={h.id} className="hover:bg-secondary-50/30 transition-all">
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="text-lg font-black text-secondary-900">{new Date(h.date).getDate()} {new Date(h.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                                                <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-tighter">{new Date(h.date).getFullYear()} • {new Date(h.date).toLocaleDateString(undefined, { weekday: 'long' })}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-sm font-black text-secondary-800">{h.name}</span>
                                        </td>
                                        <td className="p-6">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${h.type === 'PUBLIC' ? 'bg-blue-50 text-blue-600' :
                                                h.type === 'OPTIONAL' ? 'bg-purple-50 text-purple-600' : 'bg-pink-50 text-pink-600'
                                                }`}>
                                                {h.type}
                                            </span>
                                        </td>
                                        <td className="p-6 max-w-sm">
                                            <p className="text-xs text-secondary-500 italic leading-relaxed truncate">{h.description || '--'}</p>
                                        </td>
                                        <td className="p-6 text-xs font-bold text-secondary-400">
                                            {new Date(h.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {showModal && (
                    <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                            <div className="p-8 bg-secondary-900 text-white">
                                <h2 className="text-2xl font-black tracking-tighter uppercase">New Holiday Event</h2>
                                <p className="text-white/60 text-xs font-medium mt-1 uppercase tracking-widest">Update company-wide schedule</p>
                            </div>
                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Event Name</label>
                                    <input
                                        required
                                        className="input w-full font-bold text-secondary-900"
                                        placeholder="e.g. Independence Day"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Effective Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="input w-full font-bold"
                                            value={form.date}
                                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Event Type</label>
                                        <select
                                            className="input w-full font-bold"
                                            value={form.type}
                                            onChange={(e) => setForm({ ...form, type: e.target.value })}
                                        >
                                            <option value="PUBLIC">Public Holiday</option>
                                            <option value="OPTIONAL">Optional</option>
                                            <option value="COMPANY_SPECIFIC">Company Event</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Brief Memorandum</label>
                                    <textarea
                                        className="input w-full font-medium h-24"
                                        placeholder="Brief description of the significance..."
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1 py-4 font-black uppercase text-xs tracking-widest rounded-2xl">Abort</button>
                                    <button type="submit" className="btn btn-primary flex-1 py-4 font-black uppercase text-xs tracking-widest rounded-2xl shadow-lg shadow-primary-200">Confirm & Post</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
