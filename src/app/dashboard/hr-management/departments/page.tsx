'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Plus, Edit2, Trash2, Search, Building, User, Info, Layout, Layers, Users, ArrowRight } from 'lucide-react';

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedDept, setSelectedDept] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        parentDepartmentId: '',
        headUserId: ''
    });

    // Users for Head selection
    const [users, setUsers] = useState<any[]>([]);

    const fetchDepartments = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/departments', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setDepartments(await res.json());
        } catch (error) {
            console.error('Failed to fetch departments');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(Array.isArray(data) ? data : data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch users');
        }
    }, []);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUserRole(JSON.parse(userData).role);
        }
        fetchDepartments();
        fetchUsers();
    }, [fetchDepartments, fetchUsers]);

    const handleEdit = (dept: any) => {
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

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this department? This action cannot be undone.')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/departments?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchDepartments();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to delete');
            }
        } catch (error) {
            alert('Failed to delete');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const method = selectedDept ? 'PATCH' : 'POST';
        const url = '/api/hr/departments';

        const payload: any = { ...formData };
        if (selectedDept) payload.id = selectedDept.id;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowModal(false);
                fetchDepartments();
                setSelectedDept(null);
                setFormData({ name: '', code: '', description: '', parentDepartmentId: '', headUserId: '' });
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to save');
            }
        } catch (error) {
            alert('System error occurred');
        }
    };

    // Filter departments
    const filtered = departments.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-8 pb-20">
                {/* Hero Header */}
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

                        {['SUPER_ADMIN', 'ADMIN'].includes(userRole) && (
                            <button
                                onClick={() => {
                                    setSelectedDept(null);
                                    setFormData({ name: '', code: '', description: '', parentDepartmentId: '', headUserId: '' });
                                    setShowModal(true);
                                }}
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
                            <p className="text-3xl font-black">{departments.filter(d => !d.parentDepartmentId).length}</p>
                        </div>
                        <div className="w-px h-12 bg-white/10" />
                        <div>
                            <p className="text-[10px] font-black text-primary-300 uppercase tracking-widest mb-1">Assigned Heads</p>
                            <p className="text-3xl font-black">{departments.filter(d => d.headUserId).length}</p>
                        </div>
                    </div>
                </div>

                {/* Controls */}
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
                {loading ? (
                    <div className="flex justify-center py-40">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 border-4 border-primary-100 rounded-full" />
                            <div className="absolute inset-0 border-4 border-primary-500 rounded-full border-t-transparent animate-spin" />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filtered.map((dept) => (
                            <div key={dept.id} className="group bg-white rounded-[2.5rem] p-8 border border-secondary-200 hover:border-primary-400 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-500 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary-50 group-hover:bg-primary-500 transition-colors duration-500 -translate-y-12 translate-x-12 rotate-45" />

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-14 h-14 bg-secondary-50 rounded-2xl flex items-center justify-center text-secondary-600 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                            <Building size={28} />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(dept)}
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
                                    <h3 className="text-2xl font-black text-secondary-900 uppercase">Architecture Empty</h3>
                                    <p className="text-secondary-500 font-medium">No departments found matching your search criteria.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Premium Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-secondary-900/40 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-10 border-b border-secondary-100 bg-secondary-50/50 flex justify-between items-center">
                            <div>
                                <h2 className="text-3xl font-black text-secondary-900 tracking-tighter uppercase">
                                    {selectedDept ? 'Refine' : 'Initialize'} Department
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
                                    <label htmlFor="dept-head" className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1 mb-2 block">Departmental Leadership</label>
                                    <select
                                        id="dept-head"
                                        className="input-premium cursor-pointer"
                                        value={formData.headUserId}
                                        onChange={e => setFormData({ ...formData, headUserId: e.target.value })}
                                        title="Select Head"
                                    >
                                        <option value="">Search for Leader...</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name || u.email}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label htmlFor="parent-dept" className="text-[10px] font-black text-secondary-400 uppercase tracking-widest ml-1 mb-2 block">Parent Hierarchy</label>
                                    <select
                                        id="parent-dept"
                                        className="input-premium cursor-pointer"
                                        value={formData.parentDepartmentId}
                                        onChange={e => setFormData({ ...formData, parentDepartmentId: e.target.value })}
                                        title="Select Parent Department"
                                    >
                                        <option value="">Autonomous (Top Level)</option>
                                        {departments.filter(d => d.id !== selectedDept?.id).map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1 h-14 rounded-2xl font-black uppercase tracking-widest">Cancel</button>
                                <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white flex-1 h-14 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl hover:shadow-primary-600/20">
                                    <ArrowRight size={20} />
                                    {selectedDept ? 'Apply Updates' : 'Deploy Department'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
