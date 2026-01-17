'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, CheckCircle, Globe, Building } from 'lucide-react';

export default function GlobalSetupPage() {
    const [departments, setDepartments] = useState<any[]>([]);
    const [designations, setDesignations] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'departments' | 'designations'>('departments');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [form, setForm] = useState({
        name: '',
        code: '',
        description: '',
        level: 1,
        syncCompanyIds: [] as string[]
    });

    useEffect(() => {
        fetchData();
        fetchCompanies();
    }, []);

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        const [deptRes, desigRes] = await Promise.all([
            fetch('/api/hr/global/departments', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/hr/global/designations', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        if (deptRes.ok) setDepartments(await deptRes.json());
        if (desigRes.ok) setDesignations(await desigRes.json());
    };

    const fetchCompanies = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/companies', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setCompanies(await res.json());
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const endpoint = activeTab === 'departments'
            ? '/api/hr/global/departments'
            : '/api/hr/global/designations';

        try {
            const body = {
                ...(editItem ? { id: editItem.id } : {}),
                ...form
            };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setShowModal(false);
                setEditItem(null);
                setForm({ name: '', code: '', description: '', level: 1, syncCompanyIds: [] });
                fetchData();
                alert(`Global ${activeTab === 'departments' ? 'Department' : 'Designation'} saved & synced!`);
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to save');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const toggleCompanySync = (id: string) => {
        setForm(prev => {
            const exists = prev.syncCompanyIds.includes(id);
            return {
                ...prev,
                syncCompanyIds: exists ? prev.syncCompanyIds.filter(x => x !== id) : [...prev.syncCompanyIds, id]
            };
        });
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-secondary-900 flex items-center gap-2">
                        <Globe className="text-primary-500" /> Global Organization Setup
                    </h1>
                    <p className="text-secondary-500">Define master departments & designations and sync them to companies.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-secondary-200">
                <button
                    onClick={() => setActiveTab('departments')}
                    className={`pb-2 px-4 font-bold border-b-2 transition-colors ${activeTab === 'departments' ? 'border-primary-500 text-primary-600' : 'border-transparent text-secondary-400'}`}
                >
                    Master Departments
                </button>
                <button
                    onClick={() => setActiveTab('designations')}
                    className={`pb-2 px-4 font-bold border-b-2 transition-colors ${activeTab === 'designations' ? 'border-primary-500 text-primary-600' : 'border-transparent text-secondary-400'}`}
                >
                    Master Designations
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
                <div className="flex justify-between mb-4">
                    <h3 className="font-bold text-lg text-secondary-800">
                        {activeTab === 'departments' ? 'Global Departments' : 'Global Designations'}
                    </h3>
                    <button
                        onClick={() => {
                            setEditItem(null);
                            setForm({ name: '', code: '', description: '', level: 1, syncCompanyIds: [] });
                            setShowModal(true);
                        }}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Plus size={18} /> Add New
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(activeTab === 'departments' ? departments : designations).map(item => (
                        <div key={item.id} className="p-4 rounded-xl border border-secondary-200 hover:shadow-md transition-shadow relative group">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => {
                                        setEditItem(item);
                                        setForm({
                                            name: item.name,
                                            code: item.code || '',
                                            description: item.description || '',
                                            level: item.level || 1,
                                            syncCompanyIds: [] // Do not pre-fill sync as it's an action, not state? Or fetch existing? For now blank.
                                        });
                                        setShowModal(true);
                                    }}
                                    className="p-1 rounded bg-secondary-100 text-secondary-600 hover:text-primary-600"
                                >
                                    <Edit2 size={16} />
                                </button>
                            </div>
                            <h4 className="font-black text-secondary-900">{item.name}</h4>
                            <p className="text-secondary-500 text-xs uppercase tracking-wider mb-2">{item.code || 'NO CODE'}</p>
                            {activeTab === 'designations' && (
                                <span className="badge badge-secondary mb-2">Level {item.level}</span>
                            )}
                            {item.description && (
                                <p className="text-sm text-secondary-600 line-clamp-2">{item.description}</p>
                            )}
                        </div>
                    ))}
                    {(activeTab === 'departments' ? departments : designations).length === 0 && (
                        <p className="col-span-full text-center text-secondary-400 py-8">No global data found.</p>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50">
                            <h3 className="font-black text-xl text-secondary-900">
                                {editItem ? 'Edit' : 'Create'} Global {activeTab === 'departments' ? 'Department' : 'Designation'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-secondary-400 hover:text-secondary-900">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="label">Name</label>
                                    <input
                                        required
                                        className="input"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder={`e.g. ${activeTab === 'departments' ? 'Sales' : 'Sales Manager'}`}
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="label">Code</label>
                                    <input
                                        className="input"
                                        value={form.code}
                                        onChange={e => setForm({ ...form, code: e.target.value })}
                                        placeholder="Optional short code"
                                    />
                                </div>

                                {activeTab === 'designations' && (
                                    <div>
                                        <label className="label">Level (Hierarchy)</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={form.level}
                                            onChange={e => setForm({ ...form, level: parseInt(e.target.value) })}
                                            min="1"
                                        />
                                    </div>
                                )}

                                <div className="col-span-2">
                                    <label className="label">Description / Details</label>
                                    <textarea
                                        className="input"
                                        rows={2}
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Company Sync Section */}
                            <div className="bg-primary-50 p-4 rounded-xl border border-primary-100">
                                <h4 className="font-bold text-primary-900 flex items-center gap-2 mb-2">
                                    <Building size={16} /> Sync to Companies
                                </h4>
                                <p className="text-xs text-primary-700 mb-3">
                                    Select companies to automatically create/ensure this {activeTab === 'departments' ? 'Department' : 'Designation'} exists there.
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (form.syncCompanyIds.length === companies.length) {
                                                setForm({ ...form, syncCompanyIds: [] });
                                            } else {
                                                setForm({ ...form, syncCompanyIds: companies.map(c => c.id) });
                                            }
                                        }}
                                        className="col-span-full text-left text-xs font-bold text-primary-600 hover:underline mb-1"
                                    >
                                        {form.syncCompanyIds.length === companies.length ? 'Deselect All' : 'Select All Companies'}
                                    </button>

                                    {companies.map(comp => (
                                        <label key={comp.id} className="flex items-center gap-2 p-2 bg-white rounded border border-primary-100 cursor-pointer hover:bg-primary-50 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={form.syncCompanyIds.includes(comp.id)}
                                                onChange={() => toggleCompanySync(comp.id)}
                                                className="checkbox checkbox-primary w-4 h-4"
                                            />
                                            <span className="text-xs font-medium truncate" title={comp.name}>{comp.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                                <button type="submit" className="btn btn-primary flex-1 font-bold">
                                    {editItem ? 'Update & Sync' : 'Create & Sync'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
