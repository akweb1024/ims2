'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Building, Layout, Layers, ArrowRight } from 'lucide-react';
import { useDepartments, useDepartmentMutations } from '@/hooks/useHR';

const EMPTY_FORM = { name: '', code: '', description: '', parentDepartmentId: '', headUserId: '' };

/**
 * The single departments CRUD surface. Rendered full-page (with hero) at
 * /dashboard/hr-management/departments and compact inside the HR Command
 * Center's Departments & Hierarchy tab.
 */
export default function DepartmentsBoard({ userRole, variant = 'page' }: { userRole?: string; variant?: 'page' | 'tab' }) {
    const { data: departments = [], isLoading } = useDepartments();
    const { create, update, remove } = useDepartmentMutations();

    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedDept, setSelectedDept] = useState<any>(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [users, setUsers] = useState<any[]>([]);

    const isAuthorized = ['SUPER_ADMIN', 'ADMIN'].includes(userRole || '');

    // Candidates for the head-of-department select
    useEffect(() => {
        if (!isAuthorized) return;
        const token = localStorage.getItem('token');
        fetch('/api/users?limit=200', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => (res.ok ? res.json() : null))
            .then(data => {
                if (!data) return;
                setUsers(Array.isArray(data) ? data : data.data || []);
            })
            .catch(() => { /* head select stays empty; form still works */ });
    }, [isAuthorized]);

    const openCreate = () => {
        setSelectedDept(null);
        setFormData(EMPTY_FORM);
        setShowModal(true);
    };

    const openEdit = (dept: any) => {
        setSelectedDept(dept);
        setFormData({
            name: dept.name,
            code: dept.code || '',
            description: dept.description || '',
            parentDepartmentId: dept.parentDepartmentId || '',
            headUserId: dept.headUserId || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (selectedDept) {
                await update.mutateAsync({ ...formData, id: selectedDept.id });
            } else {
                await create.mutateAsync(formData);
            }
            setShowModal(false);
            setSelectedDept(null);
            setFormData(EMPTY_FORM);
        } catch (err: any) {
            alert(err.message || 'Failed to save department');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this department? This only works if no employees are assigned to it.')) return;
        try {
            await remove.mutateAsync(id);
        } catch (err: any) {
            alert(err.message || 'Failed to delete department. Make sure it has no employees.');
        }
    };

    const filtered = departments.filter((d: any) =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={variant === 'page' ? 'space-y-8 pb-20' : 'space-y-6'}>
            {variant === 'page' ? (
                <div className="relative overflow-hidden bg-primary-900 rounded-[2.5rem] p-10 md:p-14 text-white shadow-2xl">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-primary-500/20 rounded-full blur-[100px]" />

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div className="space-y-4 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-primary-200 border border-white/10 backdrop-blur-md">
                                <Layout size={14} /> Structural Intelligence
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-none">
                                Department <span className="text-primary-400">Architecture</span>
                            </h1>
                            <p className="text-primary-100/70 text-lg font-medium max-w-xl">
                                Configure your organizational departments, define hierarchies, and assign leadership roles across the enterprise.
                            </p>
                        </div>

                        {isAuthorized && (
                            <button
                                onClick={openCreate}
                                className="group bg-white hover:bg-primary-50 text-primary-900 px-8 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl hover:-translate-y-1 active:translate-y-0"
                            >
                                <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                                Create Department
                            </button>
                        )}
                    </div>

                    <div className="flex gap-8 mt-12 border-t border-white/10 pt-8 overflow-x-auto no-scrollbar">
                        <div>
                            <p className="text-[10px] font-black text-primary-300 uppercase tracking-widest mb-1">Total Units</p>
                            <p className="text-3xl font-black">{departments.length}</p>
                        </div>
                        <div className="w-px h-12 bg-white/10" />
                        <div>
                            <p className="text-[10px] font-black text-primary-300 uppercase tracking-widest mb-1">Top Level</p>
                            <p className="text-3xl font-black">{departments.filter((d: any) => !d.parentDepartmentId).length}</p>
                        </div>
                        <div className="w-px h-12 bg-white/10" />
                        <div>
                            <p className="text-[10px] font-black text-primary-300 uppercase tracking-widest mb-1">Assigned Heads</p>
                            <p className="text-3xl font-black">{departments.filter((d: any) => d.headUserId).length}</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex justify-between items-end">
                    <div>
                        <h3 className="text-2xl font-black text-secondary-900 tracking-tighter uppercase">Departments &amp; Hierarchy</h3>
                        <p className="text-secondary-500 font-medium">Manage organization structure, leadership, and reporting lines.</p>
                    </div>
                    {isAuthorized && (
                        <button
                            onClick={openCreate}
                            className="btn btn-primary text-xs font-black uppercase tracking-widest shadow-lg"
                        >
                            + Create Department
                        </button>
                    )}
                </div>
            )}

            {/* Search */}
            <div className="max-w-xl relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-secondary-400 group-focus-within:text-primary-500 transition-colors" size={22} />
                <input
                    type="text"
                    placeholder="Search departments by name or code..."
                    className="input-premium pl-14 h-16 rounded-[1.5rem] bg-white border-secondary-200 focus:ring-8 focus:ring-primary-500/5 font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    title="Search Departments"
                />
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="flex justify-center py-40">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-4 border-primary-100 rounded-full" />
                        <div className="absolute inset-0 border-4 border-primary-500 rounded-full border-t-transparent animate-spin" />
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filtered.map((dept: any) => (
                        <div key={dept.id} className="group bg-white rounded-[2.5rem] p-8 border border-secondary-200 hover:border-primary-400 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-500 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-50 group-hover:bg-primary-500 transition-colors duration-500 -translate-y-12 translate-x-12 rotate-45" />

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-14 h-14 bg-secondary-50 rounded-2xl flex items-center justify-center text-secondary-600 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                        <Building size={28} />
                                    </div>
                                    {isAuthorized && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEdit(dept)}
                                                className="p-3 bg-secondary-50 hover:bg-primary-500 text-secondary-400 hover:text-white rounded-xl transition-all shadow-sm"
                                                title="Edit Department"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(dept.id)}
                                                className="p-3 bg-secondary-50 hover:bg-danger-500 text-secondary-400 hover:text-white rounded-xl transition-all shadow-sm"
                                                title="Delete Department"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-2xl font-black text-secondary-900 group-hover:text-primary-700 transition-colors truncate uppercase tracking-tight">{dept.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">{dept.code || 'NO-CODE'}</span>
                                            <span className="w-1 h-1 bg-secondary-200 rounded-full" />
                                            <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">{dept.company?.name || 'MASTER'}</span>
                                        </div>
                                    </div>

                                    {dept.description ? (
                                        <p className="text-sm text-secondary-500 line-clamp-2 min-h-[40px] font-medium leading-relaxed">
                                            {dept.description}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-secondary-300 italic min-h-[40px]">No description defined for this unit.</p>
                                    )}

                                    <div className="pt-6 border-t border-secondary-100 flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-black">
                                                    {(dept.headUser?.name?.[0] || dept.headUser?.email?.[0] || '?').toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Dept Head</p>
                                                    <p className="text-xs font-bold text-secondary-700 truncate max-w-[150px]">
                                                        {dept.headUser ? (dept.headUser.name || dept.headUser.email) : 'Unassigned'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Hierarchy</p>
                                                <div className="flex items-center gap-1 text-xs font-bold text-primary-600">
                                                    <Layers size={12} />
                                                    {dept.parentDepartment?.name || 'Primary'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="col-span-full py-32 text-center space-y-6 bg-secondary-50/50 rounded-[4rem] border-2 border-dashed border-secondary-200">
                            <div className="w-24 h-24 bg-secondary-100 rounded-full flex items-center justify-center mx-auto text-secondary-300">
                                <Building size={48} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-secondary-900 uppercase">No Departments</h3>
                                <p className="text-secondary-500 font-medium">No departments found matching your search criteria.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-secondary-900/40 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-10 border-b border-secondary-100 bg-secondary-50/50 flex justify-between items-center">
                            <div>
                                <h2 className="text-3xl font-black text-secondary-900 tracking-tighter uppercase">
                                    {selectedDept ? 'Edit' : 'Create'} Department
                                </h2>
                                <p className="text-secondary-500 font-medium text-sm mt-1">Define the operational parameters for this functional unit.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-secondary-400 hover:text-danger-500 transition-all hover:rotate-90">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2 md:col-span-1">
                                    <label htmlFor="dept-name" className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1 mb-2 block">Department Name *</label>
                                    <input
                                        id="dept-name"
                                        required
                                        type="text"
                                        className="input-premium"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Creative Engineering"
                                        title="Department Name"
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label htmlFor="dept-code" className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1 mb-2 block">System Identifier</label>
                                    <input
                                        id="dept-code"
                                        type="text"
                                        className="input-premium"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        placeholder="e.g. CORE-ENG"
                                        title="Department Code"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label htmlFor="dept-desc" className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1 mb-2 block">Unit Description</label>
                                    <textarea
                                        id="dept-desc"
                                        className="input-premium"
                                        rows={3}
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Outline the core responsibilities and mission..."
                                        title="Description"
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label htmlFor="dept-head" className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1 mb-2 block">Department Head</label>
                                    <select
                                        id="dept-head"
                                        className="input-premium cursor-pointer"
                                        value={formData.headUserId}
                                        onChange={e => setFormData({ ...formData, headUserId: e.target.value })}
                                        title="Select Head"
                                    >
                                        <option value="">Unassigned</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name || u.email}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label htmlFor="parent-dept" className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1 mb-2 block">Parent Department</label>
                                    <select
                                        id="parent-dept"
                                        className="input-premium cursor-pointer"
                                        value={formData.parentDepartmentId}
                                        onChange={e => setFormData({ ...formData, parentDepartmentId: e.target.value })}
                                        title="Select Parent Department"
                                    >
                                        <option value="">Autonomous (Top Level)</option>
                                        {departments.filter((d: any) => d.id !== selectedDept?.id).map((d: any) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1 h-14 rounded-2xl font-black uppercase tracking-widest">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={create.isPending || update.isPending}
                                    className="bg-primary-600 hover:bg-primary-700 text-white flex-1 h-14 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl hover:shadow-primary-600/20 disabled:opacity-60"
                                >
                                    <ArrowRight size={20} />
                                    {selectedDept ? 'Save Changes' : 'Create Department'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
