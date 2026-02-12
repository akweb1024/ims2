'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, CheckCircle, Globe, Building, Layout, Target, Users, ArrowRight, Zap, Search } from 'lucide-react';
import CompanyClientLayout from '../CompanyClientLayout';

export default function GlobalSetupPage() {
    const [departments, setDepartments] = useState<any[]>([]);
    const [designations, setDesignations] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'departments' | 'designations'>('departments');
    const [searchTerm, setSearchTerm] = useState('');

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
        if (res.ok) {
            const result = await res.json();
            setCompanies(Array.isArray(result) ? result : result.data || []);
        }
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
                // We'll use a better notification later, for now alert is fine but let's make it look better if we could
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

    const filteredItems = (activeTab === 'departments' ? departments : designations).filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <CompanyClientLayout>
            <div className="space-y-8 pb-20">
                {/* Hero Section */}
                <div className="relative overflow-hidden bg-secondary-900 rounded-[2rem] p-8 md:p-12 text-white shadow-2xl">
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary-500/20 to-transparent pointer-events-none" />
                    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl" />

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-4 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-primary-300 border border-white/10">
                                <Globe size={12} /> Global Infrastructure
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
                                Organization <span className="text-primary-400">Master Setup</span>
                            </h1>
                            <p className="text-secondary-300 text-lg font-medium leading-relaxed">
                                Define centralized departments and designations. Sync your organizational standards across all registered companies with a single click.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setEditItem(null);
                                setForm({ name: '', code: '', description: '', level: 1, syncCompanyIds: [] });
                                setShowModal(true);
                            }}
                            className="group bg-primary-500 hover:bg-primary-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl hover:shadow-primary-500/25 hover:-translate-y-1 active:translate-y-0"
                        >
                            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                            Add Global {activeTab === 'departments' ? 'Dept' : 'Desig'}
                        </button>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-12 bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-sm">
                        <div className="p-4 border-r border-white/10 last:border-0">
                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Total Depts</p>
                            <p className="text-2xl font-black">{departments.length}</p>
                        </div>
                        <div className="p-4 border-r border-white/10 last:border-0">
                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Total Desigs</p>
                            <p className="text-2xl font-black">{designations.length}</p>
                        </div>
                        <div className="p-4 border-r border-white/10 last:border-0">
                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Synced Nodes</p>
                            <p className="text-2xl font-black text-primary-400">{departments.length + designations.length}</p>
                        </div>
                        <div className="p-4">
                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Partner Companies</p>
                            <p className="text-2xl font-black">{companies.length}</p>
                        </div>
                    </div>
                </div>

                {/* Navigation & Controls */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-secondary-200">
                        <button
                            onClick={() => setActiveTab('departments')}
                            className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'departments' ? 'bg-secondary-900 text-white shadow-lg' : 'text-secondary-500 hover:bg-secondary-50'}`}
                        >
                            <Layout size={16} className="inline mr-2" />
                            Departments
                        </button>
                        <button
                            onClick={() => setActiveTab('designations')}
                            className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'designations' ? 'bg-secondary-900 text-white shadow-lg' : 'text-secondary-500 hover:bg-secondary-50'}`}
                        >
                            <Target size={16} className="inline mr-2" />
                            Designations
                        </button>
                    </div>

                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={20} />
                        <label htmlFor="search-global" className="sr-only">Search global {activeTab}</label>
                        <input
                            id="search-global"
                            type="text"
                            placeholder={`Search global ${activeTab}...`}
                            className="input pl-12 h-12 rounded-2xl bg-white border-secondary-200 focus:ring-4 focus:ring-primary-500/10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            title={`Search global ${activeTab}`}
                        />
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.map(item => (
                        <div key={item.id} className="group bg-white rounded-3xl p-6 border border-secondary-200 hover:border-primary-400 hover:shadow-2xl hover:shadow-primary-500/5 transition-all duration-300 relative">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-500 group-hover:text-white transition-colors duration-300">
                                    {activeTab === 'departments' ? <Layout size={24} /> : <Target size={24} />}
                                </div>
                                <button
                                    onClick={() => {
                                        setEditItem(item);
                                        setForm({
                                            name: item.name,
                                            code: item.code || '',
                                            description: item.description || '',
                                            level: item.level || 1,
                                            syncCompanyIds: []
                                        });
                                        setShowModal(true);
                                    }}
                                    className="p-2.5 rounded-xl bg-secondary-50 text-secondary-400 hover:bg-primary-50 hover:text-primary-600 transition-all opacity-0 group-hover:opacity-100"
                                    title={`Edit ${item.name}`}
                                >
                                    <Edit2 size={18} />
                                </button>
                            </div>

                            <div className="space-y-1 mb-4">
                                <h3 className="text-xl font-black text-secondary-900 group-hover:text-primary-700 transition-colors uppercase tracking-tight">{item.name}</h3>
                                <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">{item.code || 'GLOBAL NODE'}</p>
                            </div>

                            {activeTab === 'designations' && (
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-100 rounded-lg text-[10px] font-bold text-secondary-600 mb-4">
                                    <Zap size={12} /> Hierarchy Level {item.level}
                                </div>
                            )}

                            {item.description && (
                                <p className="text-sm text-secondary-500 line-clamp-2 mb-6 font-medium leading-relaxed">
                                    {item.description}
                                </p>
                            )}

                            <div className="pt-6 border-t border-secondary-100 flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    {companies.slice(0, 3).map((c, i) => (
                                        <div key={c.id} className="w-8 h-8 rounded-full border-2 border-white bg-secondary-100 flex items-center justify-center text-[10px] font-bold text-secondary-500 shadow-sm" title={c.name}>
                                            {c.name.charAt(0)}
                                        </div>
                                    ))}
                                    {companies.length > 3 && (
                                        <div className="w-8 h-8 rounded-full border-2 border-white bg-primary-100 flex items-center justify-center text-[10px] font-bold text-primary-600 shadow-sm">
                                            +{companies.length - 3}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                                    {companies.length} Targeted Assets
                                </span>
                            </div>
                        </div>
                    ))}

                    {filteredItems.length === 0 && (
                        <div className="col-span-full py-20 text-center space-y-4 bg-secondary-50/50 rounded-[3rem] border-2 border-dashed border-secondary-200">
                            <div className="w-20 h-20 bg-secondary-100 rounded-full flex items-center justify-center mx-auto text-secondary-400">
                                <Search size={40} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-secondary-900 uppercase">No Matches Found</h3>
                                <p className="text-secondary-500 font-medium">Try adjusting your search or add a new global entry.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Standardized Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-secondary-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-300">
                            <div className="relative p-8 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/50 overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full -translate-y-16 translate-x-16 blur-2xl" />
                                <div className="relative z-10">
                                    <h3 className="font-black text-2xl text-secondary-900 tracking-tighter uppercase">
                                        {editItem ? 'Edit' : 'Create'} Global {activeTab === 'departments' ? 'Department' : 'Designation'}
                                    </h3>
                                    <p className="text-secondary-500 text-sm font-medium">Update master info and trigger company synchronization.</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-secondary-400 hover:text-danger-500 transition-colors relative z-10">✕</button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2 md:col-span-1">
                                        <label htmlFor="display-name" className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1 mb-2 block">Display Name</label>
                                        <input
                                            id="display-name"
                                            required
                                            className="input-premium"
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            placeholder={`e.g. ${activeTab === 'departments' ? 'Human Resources' : 'Senior Specialist'}`}
                                            title="Display Name"
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label htmlFor="system-code" className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1 mb-2 block">System Code</label>
                                        <input
                                            id="system-code"
                                            className="input-premium"
                                            value={form.code}
                                            onChange={e => setForm({ ...form, code: e.target.value })}
                                            placeholder="e.g. ENG_GLOBAL"
                                            title="System Code"
                                        />
                                    </div>

                                    {activeTab === 'designations' && (
                                        <div className="col-span-2">
                                            <label htmlFor="hierarchy-level" className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1 mb-2 block">Hierarchy Level</label>
                                            <div className="flex items-center gap-4">
                                                <input
                                                    id="hierarchy-level"
                                                    type="range"
                                                    min="1"
                                                    max="20"
                                                    className="flex-1 accent-primary-500 h-2 bg-secondary-100 rounded-lg appearance-none cursor-pointer"
                                                    value={form.level}
                                                    onChange={e => setForm({ ...form, level: parseInt(e.target.value) })}
                                                    title="Hierarchy Level"
                                                />
                                                <span className="w-12 h-10 bg-primary-100 rounded-xl flex items-center justify-center font-black text-primary-700">L{form.level}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="col-span-2">
                                        <label htmlFor="brief-description" className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1 mb-2 block">Brief Description</label>
                                        <textarea
                                            id="brief-description"
                                            className="input-premium"
                                            rows={3}
                                            value={form.description}
                                            onChange={e => setForm({ ...form, description: e.target.value })}
                                            placeholder="Define the primary role and scope..."
                                            title="Brief Description"
                                        />
                                    </div>
                                </div>

                                {/* Sync Logic Section */}
                                <div className="bg-secondary-900 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/20 rounded-full blur-2xl group-hover:bg-primary-500/30 transition-all duration-700" />
                                    <div className="relative z-10 space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
                                                    <Building size={20} className="text-primary-400" /> Multi-Company Sync
                                                </h4>
                                                <p className="text-secondary-400 text-xs font-medium">Select client companies to deploy this node automatically.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (form.syncCompanyIds.length === companies.length) {
                                                        setForm({ ...form, syncCompanyIds: [] });
                                                    } else {
                                                        setForm({ ...form, syncCompanyIds: companies.map(c => c.id) });
                                                    }
                                                }}
                                                className="px-3 py-1.5 bg-white/10 hover:bg-white text-white hover:text-secondary-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                {form.syncCompanyIds.length === companies.length ? 'Reset All' : 'Select All'}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                            {Array.isArray(companies) && companies.map(comp => {
                                                const isSelected = form.syncCompanyIds.includes(comp.id);
                                                return (
                                                    <button
                                                        key={comp.id}
                                                        type="button"
                                                        onClick={() => toggleCompanySync(comp.id)}
                                                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all duration-300 text-left ${isSelected ? 'border-primary-500 bg-primary-500/10 text-white' : 'border-white/10 bg-white/5 text-secondary-400 hover:border-white/20'}`}
                                                    >
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-secondary-600'}`}>
                                                            {isSelected && <CheckCircle size={14} className="text-white" />}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-secondary-300'}`}>{comp.name}</p>
                                                            <p className="text-[10px] opacity-60">ID: {comp.id.substring(0, 8)}</p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 flex gap-4">
                                    <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1 h-14 rounded-2xl font-black uppercase tracking-widest">Cancel</button>
                                    <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white flex-1 h-14 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl hover:shadow-primary-600/20 shadow-primary-600/10">
                                        <ArrowRight size={18} />
                                        {editItem ? 'Commit & Sync Changes' : 'Execute Creation & Sync'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </CompanyClientLayout>
    );
}
