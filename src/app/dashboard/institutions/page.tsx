'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import { Building2, Users, BookOpen, TrendingUp, Plus, Search, Edit, Trash2, Eye } from 'lucide-react';

export default function InstitutionsPage() {
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [selectedInstitution, setSelectedInstitution] = useState<any>(null);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        type: 'UNIVERSITY',
        category: '',
        establishedYear: '',
        accreditation: '',
        primaryEmail: '',
        secondaryEmail: '',
        primaryPhone: '',
        secondaryPhone: '',
        website: '',
        address: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
        totalStudents: '',
        totalFaculty: '',
        totalStaff: '',
        libraryBudget: '',
        ipRange: '',
        notes: '',
        logo: ''
    });

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            setUserRole(JSON.parse(user).role);
        }
        fetchInstitutions();
    }, []);

    const fetchInstitutions = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/institutions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInstitutions(data);
            }
        } catch (error) {
            console.error('Error fetching institutions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const method = selectedInstitution ? 'PATCH' : 'POST';
            const body = selectedInstitution
                ? { id: selectedInstitution.id, ...formData }
                : formData;

            const res = await fetch('/api/institutions', {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setShowModal(false);
                setSelectedInstitution(null);
                resetForm();
                fetchInstitutions();
            }
        } catch (error) {
            console.error('Error saving institution:', error);
        }
    };

    const handleEdit = (institution: any) => {
        setSelectedInstitution(institution);
        setFormData({
            name: institution.name || '',
            code: institution.code || '',
            type: institution.type || 'UNIVERSITY',
            category: institution.category || '',
            establishedYear: institution.establishedYear || '',
            accreditation: institution.accreditation || '',
            primaryEmail: institution.primaryEmail || '',
            secondaryEmail: institution.secondaryEmail || '',
            primaryPhone: institution.primaryPhone || '',
            secondaryPhone: institution.secondaryPhone || '',
            website: institution.website || '',
            address: institution.address || '',
            city: institution.city || '',
            state: institution.state || '',
            country: institution.country || 'India',
            pincode: institution.pincode || '',
            totalStudents: institution.totalStudents || '',
            totalFaculty: institution.totalFaculty || '',
            totalStaff: institution.totalStaff || '',
            libraryBudget: institution.libraryBudget || '',
            ipRange: institution.ipRange || '',
            notes: institution.notes || '',
            logo: institution.logo || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this institution?')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/institutions?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchInstitutions();
            }
        } catch (error) {
            console.error('Error deleting institution:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            type: 'UNIVERSITY',
            category: '',
            establishedYear: '',
            accreditation: '',
            primaryEmail: '',
            secondaryEmail: '',
            primaryPhone: '',
            secondaryPhone: '',
            website: '',
            address: '',
            city: '',
            state: '',
            country: 'India',
            pincode: '',
            totalStudents: '',
            totalFaculty: '',
            totalStaff: '',
            libraryBudget: '',
            ipRange: '',
            notes: '',
            logo: ''
        });
    };

    const filteredInstitutions = institutions.filter(inst => {
        const matchesSearch = inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inst.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'ALL' || inst.type === filterType;
        return matchesSearch && matchesType;
    });

    const institutionTypes = ['UNIVERSITY', 'COLLEGE', 'SCHOOL', 'RESEARCH_INSTITUTE', 'CORPORATE', 'LIBRARY', 'GOVERNMENT', 'HOSPITAL', 'NGO', 'OTHER'];

    const totalCustomers = institutions.reduce((sum, inst) => sum + (inst._count?.customers || 0), 0);
    const totalSubscriptions = institutions.reduce((sum, inst) => sum + (inst._count?.subscriptions || 0), 0);

    if (loading) {
        return (
            <DashboardLayout userRole={userRole}>
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-4 text-secondary-500 font-bold">Loading institutions...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Institution Management</h1>
                        <p className="text-secondary-600 mt-1">Manage educational and corporate institutions</p>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedInstitution(null);
                            resetForm();
                            setShowModal(true);
                        }}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Add Institution
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="card-premium p-6 border-l-4 border-primary-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-secondary-400 uppercase tracking-widest">Total Institutions</p>
                                <p className="text-3xl font-black text-secondary-900 mt-2">{institutions.length}</p>
                            </div>
                            <Building2 className="text-primary-500" size={40} />
                        </div>
                    </div>
                    <div className="card-premium p-6 border-l-4 border-success-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-secondary-400 uppercase tracking-widest">Total Customers</p>
                                <p className="text-3xl font-black text-secondary-900 mt-2">{totalCustomers}</p>
                            </div>
                            <Users className="text-success-500" size={40} />
                        </div>
                    </div>
                    <div className="card-premium p-6 border-l-4 border-warning-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-secondary-400 uppercase tracking-widest">Active Subscriptions</p>
                                <p className="text-3xl font-black text-secondary-900 mt-2">{totalSubscriptions}</p>
                            </div>
                            <BookOpen className="text-warning-500" size={40} />
                        </div>
                    </div>
                    <div className="card-premium p-6 border-l-4 border-accent-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-secondary-400 uppercase tracking-widest">Avg. Customers/Inst</p>
                                <p className="text-3xl font-black text-secondary-900 mt-2">
                                    {institutions.length > 0 ? Math.round(totalCustomers / institutions.length) : 0}
                                </p>
                            </div>
                            <TrendingUp className="text-accent-500" size={40} />
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="card-premium p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by name or code..."
                                className="input pl-10 w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="input w-full md:w-64"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="ALL">All Types</option>
                            {institutionTypes.map(type => (
                                <option key={type} value={type}>{type.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Institutions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredInstitutions.map((institution) => (
                        <div key={institution.id} className="card-premium hover:shadow-xl transition-all group">
                            <div className="p-6">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        {institution.logo ? (
                                            <img src={institution.logo} alt={institution.name} className="w-12 h-12 rounded-lg object-cover" />
                                        ) : (
                                            <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
                                                <Building2 className="text-primary-600" size={24} />
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-black text-secondary-900 text-lg">{institution.name}</h3>
                                            <p className="text-xs font-bold text-secondary-500">{institution.code}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Type Badge */}
                                <div className="mb-4">
                                    <span className="px-3 py-1 bg-primary-50 text-primary-700 text-xs font-black rounded-full">
                                        {institution.type.replace('_', ' ')}
                                    </span>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-secondary-100">
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-secondary-900">{institution._count?.customers || 0}</p>
                                        <p className="text-xs text-secondary-500 font-bold">Customers</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-secondary-900">{institution._count?.subscriptions || 0}</p>
                                        <p className="text-xs text-secondary-500 font-bold">Subscriptions</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-secondary-900">{institution._count?.communications || 0}</p>
                                        <p className="text-xs text-secondary-500 font-bold">Communications</p>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                {institution.primaryEmail && (
                                    <p className="text-xs text-secondary-600 mb-2 truncate">📧 {institution.primaryEmail}</p>
                                )}
                                {institution.city && (
                                    <p className="text-xs text-secondary-600 mb-4">📍 {institution.city}, {institution.state}</p>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Link
                                        href={`/dashboard/institutions/${institution.id}`}
                                        className="flex-1 btn btn-sm bg-secondary-100 hover:bg-secondary-200 text-secondary-900 flex items-center justify-center gap-2"
                                    >
                                        <Eye size={16} />
                                        View
                                    </Link>
                                    <button
                                        onClick={() => handleEdit(institution)}
                                        className="btn btn-sm bg-primary-100 hover:bg-primary-200 text-primary-700 flex items-center gap-2"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(institution.id)}
                                        className="btn btn-sm bg-danger-100 hover:bg-danger-200 text-danger-700 flex items-center gap-2"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredInstitutions.length === 0 && (
                    <div className="card-premium p-20 text-center">
                        <Building2 className="mx-auto text-secondary-300 mb-4" size={64} />
                        <h3 className="text-xl font-black text-secondary-400 mb-2">No Institutions Found</h3>
                        <p className="text-secondary-500">Start by adding your first institution</p>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6">
                            <h2 className="text-2xl font-black">{selectedInstitution ? 'Edit Institution' : 'Add New Institution'}</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                            <div className="space-y-6">
                                {/* Basic Information */}
                                <div>
                                    <h3 className="text-lg font-black text-secondary-900 mb-4 pb-2 border-b">Basic Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Institution Name *</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Code *</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.code}
                                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                                placeholder="e.g., MIT, HARVARD"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Type *</label>
                                            <select
                                                className="input"
                                                value={formData.type}
                                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                                required
                                            >
                                                {institutionTypes.map(type => (
                                                    <option key={type} value={type}>{type.replace('_', ' ')}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Category</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                placeholder="e.g., Engineering College"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Established Year</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.establishedYear}
                                                onChange={(e) => setFormData({ ...formData, establishedYear: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Accreditation</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.accreditation}
                                                onChange={(e) => setFormData({ ...formData, accreditation: e.target.value })}
                                                placeholder="e.g., NAAC A++"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div>
                                    <h3 className="text-lg font-black text-secondary-900 mb-4 pb-2 border-b">Contact Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Primary Email</label>
                                            <input
                                                type="email"
                                                className="input"
                                                value={formData.primaryEmail}
                                                onChange={(e) => setFormData({ ...formData, primaryEmail: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Secondary Email</label>
                                            <input
                                                type="email"
                                                className="input"
                                                value={formData.secondaryEmail}
                                                onChange={(e) => setFormData({ ...formData, secondaryEmail: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Primary Phone</label>
                                            <input
                                                type="tel"
                                                className="input"
                                                value={formData.primaryPhone}
                                                onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Secondary Phone</label>
                                            <input
                                                type="tel"
                                                className="input"
                                                value={formData.secondaryPhone}
                                                onChange={(e) => setFormData({ ...formData, secondaryPhone: e.target.value })}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="label">Website</label>
                                            <input
                                                type="url"
                                                className="input"
                                                value={formData.website}
                                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Address */}
                                <div>
                                    <h3 className="text-lg font-black text-secondary-900 mb-4 pb-2 border-b">Address</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="label">Address</label>
                                            <textarea
                                                className="input"
                                                rows={2}
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">City</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.city}
                                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">State</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.state}
                                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Country</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.country}
                                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Pincode</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.pincode}
                                                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Statistics */}
                                <div>
                                    <h3 className="text-lg font-black text-secondary-900 mb-4 pb-2 border-b">Statistics</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Total Students</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.totalStudents}
                                                onChange={(e) => setFormData({ ...formData, totalStudents: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Total Faculty</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.totalFaculty}
                                                onChange={(e) => setFormData({ ...formData, totalFaculty: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Total Staff</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.totalStaff}
                                                onChange={(e) => setFormData({ ...formData, totalStaff: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Library Budget (₹)</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.libraryBudget}
                                                onChange={(e) => setFormData({ ...formData, libraryBudget: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Additional */}
                                <div>
                                    <h3 className="text-lg font-black text-secondary-900 mb-4 pb-2 border-b">Additional Information</h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="label">IP Range</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.ipRange}
                                                onChange={(e) => setFormData({ ...formData, ipRange: e.target.value })}
                                                placeholder="e.g., 192.168.1.0/24"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Logo URL</label>
                                            <input
                                                type="url"
                                                className="input"
                                                value={formData.logo}
                                                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Notes</label>
                                            <textarea
                                                className="input"
                                                rows={3}
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn btn-secondary px-6"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary px-8"
                                >
                                    {selectedInstitution ? 'Update' : 'Create'} Institution
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
