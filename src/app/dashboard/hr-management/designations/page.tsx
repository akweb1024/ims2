'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Plus, Edit2, Trash2, Search, Briefcase, Target, Info, AlertCircle } from 'lucide-react';

export default function DesignationsPage() {
    const [designations, setDesignations] = useState<any[]>([]);
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
        level: 1
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUserRole(JSON.parse(userData).role);
        }
        fetchDesignations();
    }, []);

    const fetchDesignations = async () => {
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
    };

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
            level: des.level || 1
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
                    incrementGuidelines: '', level: 1
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
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Designation Master</h1>
                        <p className="text-secondary-500">Manage Job Descriptions, KRAs and promotion metrics</p>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedDesignation(null);
                            setFormData({
                                name: '', code: '', jobDescription: '', kra: '',
                                expectedExperience: 0, promotionWaitPeriod: 12,
                                incrementGuidelines: '', level: 1
                            });
                            setShowModal(true);
                        }}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Create New Designation
                    </button>
                </div>

                {/* Stats & Search */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3 relative flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by name or code..."
                                className="input pl-12 h-14"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="input w-40 h-14 font-bold"
                            value={levelFilter}
                            onChange={(e) => setLevelFilter(e.target.value)}
                        >
                            <option value="ALL">All Levels</option>
                            {uniqueLevels.map(lvl => (
                                <option key={lvl} value={lvl}>Level {lvl}</option>
                            ))}
                        </select>
                    </div>
                    <div className="card-premium p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-secondary-400 uppercase">Total Roles</p>
                            <p className="text-2xl font-black text-primary-600">{designations.length}</p>
                        </div>
                        <Briefcase className="text-primary-200" size={32} />
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filtered.map((des) => (
                            <div key={des.id} className="card-premium group hover:border-primary-300 transition-all p-6 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-bold text-secondary-900">{des.name}</h3>
                                            <span className="badge badge-primary text-[10px]">{des.code || 'N/A'}</span>
                                        </div>
                                        <p className="text-sm text-secondary-500">Level {des.level}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(des)} className="p-2 hover:bg-primary-50 text-secondary-400 hover:text-primary-600 rounded-lg transition-colors">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(des.id)} className="p-2 hover:bg-danger-50 text-secondary-400 hover:text-danger-600 rounded-lg transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <Info size={16} className="mt-1 text-secondary-400" />
                                        <p className="text-sm text-secondary-600 line-clamp-2">{des.jobDescription || 'No description provided'}</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Target size={16} className="mt-1 text-primary-400" />
                                        <p className="text-sm text-secondary-600 line-clamp-2">KRA: {des.kra || 'No KRAs defined'}</p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t flex justify-between items-center text-xs font-bold text-secondary-400">
                                    <span>Experience: {des.expectedExperience}y+</span>
                                    <span>Review: Every {des.promotionWaitPeriod}m</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                        <div className="bg-primary-600 text-white p-6 flex justify-between items-center">
                            <h2 className="text-2xl font-black">{selectedDesignation ? 'Edit' : 'Create'} Designation</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-full">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="label">Role Name*</label>
                                    <input required type="text" className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Senior Software Engineer" />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="label">Role Code</label>
                                    <input type="text" className="input" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="e.g. SE-II" />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="label">Expected Experience (Years)</label>
                                    <input type="number" step="0.5" className="input" value={formData.expectedExperience} onChange={e => setFormData({ ...formData, expectedExperience: parseFloat(e.target.value) })} />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="label">Hierarchy Level (1=Top)</label>
                                    <input type="number" className="input" value={formData.level} onChange={e => setFormData({ ...formData, level: parseInt(e.target.value) })} />
                                </div>
                            </div>

                            <div>
                                <label className="label">Job Description</label>
                                <textarea rows={4} className="input" value={formData.jobDescription} onChange={e => setFormData({ ...formData, jobDescription: e.target.value })} placeholder="What does this role entail?" />
                            </div>

                            <div>
                                <label className="label">Key Responsibility Areas (KRAs)</label>
                                <textarea rows={3} className="input" value={formData.kra} onChange={e => setFormData({ ...formData, kra: e.target.value })} placeholder="List primary goals and KPIs..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="label">Promotion Review (Months)</label>
                                    <input type="number" className="input" value={formData.promotionWaitPeriod} onChange={e => setFormData({ ...formData, promotionWaitPeriod: parseInt(e.target.value) })} />
                                </div>
                            </div>

                            <div>
                                <label className="label">Increment Guidelines</label>
                                <textarea rows={2} className="input" value={formData.incrementGuidelines} onChange={e => setFormData({ ...formData, incrementGuidelines: e.target.value })} placeholder="Standard yearly percentage, performance multipliers etc." />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                                <button type="submit" className="btn btn-primary flex-1">Save Designation</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
