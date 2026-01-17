'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Plus, Edit2, Trash2, Search, Building, User, Info } from 'lucide-react';

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]); // For context if needed in future
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

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUserRole(JSON.parse(userData).role);
        }
        fetchDepartments();
        fetchUsers();
    }, []);

    const fetchDepartments = async () => {
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
    };

    const fetchUsers = async () => {
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
    };

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
        // Note: DELETE uses query param, PATCH uses body ID, POST uses body. 
        // My previous API reads:
        // PATCH: body { id, name... }
        // POST: body { name ... }

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
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Department Master</h1>
                        <p className="text-secondary-500">Manage organizational structure and functional units</p>
                    </div>
                    {['SUPER_ADMIN', 'ADMIN'].includes(userRole) && (
                        <button
                            onClick={() => {
                                setSelectedDept(null);
                                setFormData({ name: '', code: '', description: '', parentDepartmentId: '', headUserId: '' });
                                setShowModal(true);
                            }}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Create New Department
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search departments..."
                        className="input pl-12 h-12"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filtered.map((dept) => (
                            <div key={dept.id} className="card-premium group hover:border-primary-300 transition-all p-6 space-y-4 relative">
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(dept)} className="p-1.5 bg-secondary-100 hover:bg-white text-secondary-500 hover:text-primary-600 rounded shadow-sm">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(dept.id)} className="p-1.5 bg-secondary-100 hover:bg-white text-secondary-500 hover:text-danger-600 rounded shadow-sm">
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-xl font-bold text-secondary-900">{dept.name}</h3>
                                        {dept.code && <span className="badge badge-secondary text-[10px]">{dept.code}</span>}
                                    </div>
                                    <p className="text-xs text-secondary-500 uppercase tracking-widest font-bold">
                                        {dept.company?.name || 'Local Company'}
                                    </p>
                                </div>

                                {dept.description && (
                                    <div className="flex items-start gap-2">
                                        <Info size={16} className="text-secondary-400 mt-0.5 shrink-0" />
                                        <p className="text-sm text-secondary-600 line-clamp-2">{dept.description}</p>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-secondary-100 space-y-2">
                                    {dept.headUser ? (
                                        <div className="flex items-center gap-2 text-sm text-secondary-700">
                                            <User size={16} className="text-primary-500" />
                                            <span className="font-bold">Head:</span> {dept.headUser.name || dept.headUser.email}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm text-secondary-400 italic">
                                            <User size={16} /> No Department Head
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-xs font-bold text-secondary-400">
                                        <span>Parent: {dept.parentDepartment?.name || 'None'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div className="col-span-full py-12 text-center text-secondary-400">
                                No departments found matching your search.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
                        <div className="bg-primary-600 text-white p-6 flex justify-between items-center rounded-t-3xl">
                            <h2 className="text-xl font-black">{selectedDept ? 'Edit' : 'Create'} Department</h2>
                            <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="label">Department Name *</label>
                                <input required type="text" className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Engineering" />
                            </div>
                            <div>
                                <label className="label">Department Code</label>
                                <input type="text" className="input" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="e.g. ENG" />
                            </div>
                            <div>
                                <label className="label">Description</label>
                                <textarea className="input" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Role of this department..." />
                            </div>
                            <div>
                                <label className="label">Department Head</label>
                                <select className="input" value={formData.headUserId} onChange={e => setFormData({ ...formData, headUserId: e.target.value })}>
                                    <option value="">Select Head...</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name || u.email}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Parent Department</label>
                                <select className="input" value={formData.parentDepartmentId} onChange={e => setFormData({ ...formData, parentDepartmentId: e.target.value })}>
                                    <option value="">None (Top Level)</option>
                                    {departments.filter(d => d.id !== selectedDept?.id).map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                                <button type="submit" className="btn btn-primary flex-1">Save Department</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
