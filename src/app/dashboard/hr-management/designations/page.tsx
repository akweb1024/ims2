'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Plus, Edit2, Trash2, Search, Briefcase, Target, Info, AlertCircle, Zap, GraduationCap, TrendingUp, ArrowRight } from 'lucide-react';
import RichTextEditor from '@/components/common/RichTextEditor';
import SafeHTML from '@/components/common/SafeHTML';

export default function DesignationsPage() {
    const [designations, setDesignations] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [searchTerm, setSearchTerm] = useState('');
    const [levelFilter, setLevelFilter] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [selectedDesignation, setSelectedDesignation] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        jobDescription: '',
        kra: '',
        expectedExperience: 0,
        promotionWaitPeriod: 12,
        incrementGuidelines: '',
        level: 1,
        departmentIds: [] as string[]
    });

    const fetchDepartments = useCallback(async () => {
        try {
            const res = await fetch('/api/hr/departments');
            if (res.ok) setDepartments(await res.json());
        } catch (error) {
            console.error('Failed to fetch departments');
        }
    }, []);

    const fetchDesignations = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/hr/designations');
            if (res.ok) {
                const data = await res.json();
                setDesignations(data);
            }
        } catch (error) {
            console.error('Failed to fetch designations');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUserRole(JSON.parse(userData).role);
        }
        fetchDesignations();
        fetchDepartments();
    }, [fetchDesignations, fetchDepartments]);

    const handleEdit = (des: any) => {
        setSelectedDesignation(des);
        setFormData({
            name: des.name,
            code: des.code || '',
            jobDescription: des.jobDescription || '',
            kra: des.kra || '',
            expectedExperience: des.expectedExperience || 0,
            promotionWaitPeriod: des.promotionWaitPeriod || 12,
            incrementGuidelines: des.incrementGuidelines || '',
            level: des.level || 1,
            departmentIds: des.departments ? des.departments.map((d: any) => d.id) : []
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this designation? This may affect employees linked to it.')) return;
        try {
            const res = await fetch(`/api/hr/designations/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchDesignations();
            }
        } catch (error) {
            alert('Failed to delete');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const method = selectedDesignation ? 'PATCH' : 'POST';
        const url = selectedDesignation ? `/api/hr/designations/${selectedDesignation.id}` : '/api/hr/designations';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setShowModal(false);
                fetchDesignations();
                setSelectedDesignation(null);
                setFormData({
                    name: '', code: '', jobDescription: '', kra: '',
                    expectedExperience: 0, promotionWaitPeriod: 12,
                    incrementGuidelines: '', level: 1, departmentIds: []
                });
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to save');
            }
        } catch (error) {
            alert('System error occurred');
        }
    };

    const filtered = designations.filter(d => {
        const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.code?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLevel = levelFilter === 'ALL' || d.level.toString() === levelFilter;
        return matchesSearch && matchesLevel;
    });

    const uniqueLevels = Array.from(new Set(designations.map(d => d.level))).sort((a, b) => a - b);

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-8 pb-20">
                {/* Hero Header */}
                <div className="relative overflow-hidden bg-secondary-900 rounded-[2.5rem] p-10 md:p-14 text-white shadow-2xl">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary-500/20 to-transparent pointer-events-none" />
                    <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-primary-500/10 rounded-full blur-[100px]" />

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div className="space-y-4 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-primary-300 border border-white/10 backdrop-blur-md">
                                <GraduationCap size={14} /> Talent Framework
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-none">
                                Designation <span className="text-primary-400">Mastery</span>
                            </h1>
                            <p className="text-secondary-300 text-lg font-medium max-w-xl">
                                Define professional roles, establish hierarchy benchmarks, and configure career progression metrics across your organization.
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                setSelectedDesignation(null);
                                setFormData({
                                    name: '', code: '', jobDescription: '', kra: '',
                                    expectedExperience: 0, promotionWaitPeriod: 12,
                                    incrementGuidelines: '', level: 1, departmentIds: []
                                });
                                setShowModal(true);
                            }}
                            className="group bg-primary-500 hover:bg-primary-600 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl hover:-translate-y-1 active:translate-y-0"
                        >
                            <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                            New Designation
                        </button>
                    </div>

                    <div className="flex gap-8 mt-12 border-t border-white/10 pt-8 overflow-x-auto no-scrollbar">
                        <div>
                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Active Roles</p>
                            <p className="text-3xl font-black">{designations.length}</p>
                        </div>
                        <div className="w-px h-12 bg-white/10" />
                        <div>
                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Hierarchy Deep</p>
                            <p className="text-3xl font-black text-primary-400">{uniqueLevels.length} Levels</p>
                        </div>
                        <div className="w-px h-12 bg-white/10" />
                        <div>
                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Avg Promotion</p>
                            <p className="text-3xl font-black">12.4m</p>
                        </div>
                    </div>
                </div>

                {/* Search & Filter */}
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 relative group w-full">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-secondary-400 group-focus-within:text-primary-500 transition-colors" size={22} />
                        <label htmlFor="search-desig" className="sr-only">Search roles</label>
                        <input
                            id="search-desig"
                            type="text"
                            placeholder="Search roles by name or code..."
                            className="input-premium pl-14 h-16 rounded-[1.5rem] bg-white border-secondary-200 focus:ring-8 focus:ring-primary-500/5 font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            title="Search roles"
                        />
                    </div>
                    <div className="w-full md:w-64 relative">
                        <label htmlFor="level-filter" className="sr-only">Filter by level</label>
                        <select
                            id="level-filter"
                            className="input-premium h-16 rounded-[1.5rem] bg-white border-secondary-200 pl-6 pr-12 font-bold appearance-none cursor-pointer"
                            value={levelFilter}
                            onChange={(e) => setLevelFilter(e.target.value)}
                            title="Filter by Level"
                        >
                            <option value="ALL">All Levels</option>
                            {uniqueLevels.map(lvl => (
                                <option key={lvl} value={lvl}>Level {lvl}</option>
                            ))}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-secondary-400">
                            <TrendingUp size={18} />
                        </div>
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex justify-center py-40">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 border-4 border-primary-100 rounded-full" />
                            <div className="absolute inset-0 border-4 border-primary-500 rounded-full border-t-transparent animate-spin" />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {filtered.map((des) => (
                            <div key={des.id} className="group bg-white rounded-[2.5rem] p-8 border border-secondary-200 hover:border-primary-400 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-500 relative flex flex-col">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-500 group-hover:text-white transition-colors duration-500">
                                        <Briefcase size={28} />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(des)}
                                            className="p-3 bg-secondary-50 hover:bg-primary-500 text-secondary-400 hover:text-white rounded-xl transition-all shadow-sm"
                                            title="Edit Designation"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(des.id)}
                                            className="p-3 bg-secondary-50 hover:bg-danger-500 text-secondary-400 hover:text-white rounded-xl transition-all shadow-sm"
                                            title="Delete Designation"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4 flex-1">
                                    <div>
                                        <h3 className="text-2xl font-black text-secondary-900 group-hover:text-primary-700 transition-colors uppercase tracking-tight">{des.name}</h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2 py-0.5 bg-primary-50 text-primary-600 text-[10px] font-black rounded uppercase tracking-widest">{des.code || 'NO-CODE'}</span>
                                            <span className="w-1 h-1 bg-secondary-200 rounded-full" />
                                            <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest flex items-center gap-1">
                                                <Zap size={10} className="text-warning-500" /> Level {des.level}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                                        {des.departments?.map((dept: any) => (
                                            <span key={dept.id} className="text-[9px] font-black bg-secondary-100 text-secondary-500 px-2 py-1 rounded-full uppercase tracking-tighter">
                                                {dept.name}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-secondary-100">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-secondary-50 flex items-center justify-center text-secondary-400 group-hover:bg-primary-50 group-hover:text-primary-400 transition-colors shrink-0">
                                                <Target size={20} />
                                            </div>
                                            <div className="text-sm text-secondary-600 line-clamp-2 font-medium leading-relaxed italic">
                                                <SafeHTML html={des.jobDescription || 'Baseline objective not defined.'} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-secondary-100 flex justify-between items-center bg-secondary-50/50 -mx-8 -mb-8 px-8 rounded-b-[2.5rem]">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">Experience</span>
                                        <span className="text-xs font-black text-secondary-900">{des.expectedExperience}+ Years</span>
                                    </div>
                                    <div className="text-right flex flex-col">
                                        <span className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">Promotion Review</span>
                                        <span className="text-xs font-black text-primary-600">{des.promotionWaitPeriod} Months Cycle</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filtered.length === 0 && (
                            <div className="col-span-full py-32 text-center space-y-6 bg-secondary-50/50 rounded-[4rem] border-2 border-dashed border-secondary-200">
                                <div className="w-24 h-24 bg-secondary-100 rounded-full flex items-center justify-center mx-auto text-secondary-300">
                                    <Briefcase size={48} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-secondary-900 uppercase">Vault Empty</h3>
                                    <p className="text-secondary-500 font-medium">No roles match your search filters.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Premium Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-10 border-b border-secondary-100 bg-secondary-50/50 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-3xl font-black text-secondary-900 tracking-tighter uppercase">
                                    {selectedDesignation ? 'Refine' : 'Blueprint'} Designation
                                </h2>
                                <p className="text-secondary-500 font-medium text-sm mt-1">Configure professional standards and growth metrics for this role.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-secondary-400 hover:text-danger-500 transition-all hover:rotate-90">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 overflow-y-auto max-h-[calc(90vh-160px)] custom-scrollbar space-y-10">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="col-span-2 md:col-span-1">
                                    <label htmlFor="desig-name" className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1 mb-2 block">Official Role Title *</label>
                                    <input
                                        id="desig-name"
                                        required
                                        type="text"
                                        className="input-premium"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Lead Enterprise Architect"
                                        title="Role Name"
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label htmlFor="desig-code" className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1 mb-2 block">System Code / Alias</label>
                                    <input
                                        id="desig-code"
                                        type="text"
                                        className="input-premium"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        placeholder="e.g. ARCH-T1"
                                        title="Role Code"
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label htmlFor="desig-exp" className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1 mb-2 block">Experience Threshold (Years)</label>
                                    <input
                                        id="desig-exp"
                                        type="number"
                                        step="0.5"
                                        className="input-premium"
                                        value={formData.expectedExperience}
                                        onChange={e => setFormData({ ...formData, expectedExperience: parseFloat(e.target.value) })}
                                        title="Expected Experience"
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label htmlFor="desig-level" className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1 mb-2 block">Hierarchy Priority (1 = Top)</label>
                                    <input
                                        id="desig-level"
                                        type="number"
                                        className="input-premium"
                                        value={formData.level}
                                        onChange={e => setFormData({ ...formData, level: parseInt(e.target.value) })}
                                        title="Hierarchy Level"
                                    />
                                </div>
                            </div>

                            <div className="bg-secondary-50 rounded-[2rem] p-8 border border-secondary-200">
                                <label className="text-[10px] font-black text-secondary-500 uppercase tracking-[0.2em] mb-4 block">Unit Allocation</label>
                                <div className="flex flex-wrap gap-3">
                                    {departments.map((dept) => (
                                        <button
                                            key={dept.id}
                                            type="button"
                                            onClick={() => {
                                                const current = formData.departmentIds;
                                                const updated = current.includes(dept.id)
                                                    ? current.filter(id => id !== dept.id)
                                                    : [...current, dept.id];
                                                setFormData({ ...formData, departmentIds: updated });
                                            }}
                                            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all border-2 ${formData.departmentIds.includes(dept.id)
                                                ? 'bg-primary-900 border-primary-900 text-white shadow-lg'
                                                : 'bg-white border-white text-secondary-400 hover:border-secondary-300'
                                                }`}
                                            title={`Toggle ${dept.name}`}
                                        >
                                            {dept.name}
                                        </button>
                                    ))}
                                    {departments.length === 0 && <span className="text-sm text-secondary-400 italic">No operational units found.</span>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1 block">Full Job Description</label>
                                    <RichTextEditor
                                        value={formData.jobDescription}
                                        onChange={val => setFormData({ ...formData, jobDescription: val })}
                                        placeholder="Detail the core expectations and role scope..."
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1 block">Key Performance Areas (KRAs)</label>
                                    <RichTextEditor
                                        value={formData.kra}
                                        onChange={val => setFormData({ ...formData, kra: val })}
                                        placeholder="Identify primary success metrics and KPIs..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label htmlFor="promotion-cycle" className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1 block">Promotion Audit Cycle (Months)</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            id="promotion-cycle"
                                            type="number"
                                            className="input-premium flex-1"
                                            value={formData.promotionWaitPeriod}
                                            onChange={e => setFormData({ ...formData, promotionWaitPeriod: parseInt(e.target.value) })}
                                            title="Promotion Wait Period"
                                        />
                                        <div className="w-14 h-14 bg-secondary-900 rounded-2xl flex items-center justify-center text-primary-400 text-xs font-black">
                                            {formData.promotionWaitPeriod}M
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1 block">Pay & Increment Framework</label>
                                    <RichTextEditor
                                        value={formData.incrementGuidelines}
                                        onChange={val => setFormData({ ...formData, incrementGuidelines: val })}
                                        placeholder="Standard increase rules, multipliers etc..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-6 pt-10 border-t border-secondary-100">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1 h-16 rounded-[1.5rem] font-black uppercase tracking-widest">Cancel</button>
                                <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white flex-1 h-16 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl hover:shadow-primary-600/30">
                                    <ArrowRight size={22} />
                                    {selectedDesignation ? 'Commit Master Record' : 'Deploy Role Profile'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
