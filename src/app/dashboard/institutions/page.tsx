'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import Image from 'next/image';
import { Building2, Users, BookOpen, TrendingUp, Plus, Search, Edit, Trash2, Eye } from 'lucide-react';

export default function InstitutionsPage() {
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [stateFilter, setStateFilter] = useState('');
    const [cityFilter, setCityFilter] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 1
    });

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [executives, setExecutives] = useState<any[]>([]);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [assignTargetId, setAssignTargetId] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [selectedInstitution, setSelectedInstitution] = useState<any>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

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
        domain: '',
        logo: '',
        assignedToUserId: ''
    });

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            const userData = JSON.parse(user);
            setUserRole(userData.role);
            if (['SUPER_ADMIN', 'MANAGER'].includes(userData.role)) {
                fetch('/api/users?limit=100', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
                    .then(res => res.json())
                    .then(data => {
                        const users = Array.isArray(data) ? data : (data.data || []);
                        setExecutives(users.filter((u: any) => ['EXECUTIVE', 'MANAGER', 'TEAM_LEADER'].includes(u.role)));
                    })
                    .catch(err => console.error('Failed to fetch staff', err));
            }
        }
    }, []);

    const fetchInstitutions = useCallback(async (page = 1) => {
        setLoading(true);
        setSelectedIds(new Set()); // Clear selection on fetch
        try {
            const token = localStorage.getItem('token');
            let url = `/api/institutions?page=${page}&limit=${pagination.limit}`;
            if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

            if (filterType !== 'ALL') url += `&type=${filterType}`;
            if (stateFilter) url += `&state=${encodeURIComponent(stateFilter)}`;
            if (cityFilter) url += `&city=${encodeURIComponent(cityFilter)}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const response = await res.json();
                if (response.pagination) {
                    setInstitutions(response.data);
                    setPagination(response.pagination);
                } else {
                    setInstitutions(response);
                }
            }
        } catch (error) {
            console.error('Error fetching institutions:', error);
        } finally {
            setLoading(false);
        }
    }, [pagination.limit, searchTerm, filterType, stateFilter, cityFilter]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchInstitutions(1);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [fetchInstitutions]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

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

            const data = await res.json();

            if (res.ok) {
                setSuccessMessage(selectedInstitution ? 'Institution updated successfully!' : 'Institution created successfully!');
                setTimeout(() => {
                    setShowModal(false);
                    setSelectedInstitution(null);
                    resetForm();
                    fetchInstitutions(pagination.page);
                    setSuccessMessage('');
                }, 1500);
            } else {
                setErrorMessage(data.error || 'Failed to save institution. Please check all required fields.');
            }
        } catch (error: any) {
            console.error('Error saving institution:', error);
            setErrorMessage(error.message || 'An unexpected error occurred. Please try again.');
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
            domain: institution.domain || '',
            logo: institution.logo || '',
            assignedToUserId: institution.assignedToUserId || ''
        });
        setErrorMessage('');
        setSuccessMessage('');
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
                fetchInstitutions(pagination.page);
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
            domain: '',
            logo: '',
            assignedToUserId: ''
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = institutions.map(i => i.id);
            setSelectedIds(new Set(allIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkAssign = async () => {
        if (!assignTargetId) return alert('Please select a user to assign');

        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/imports/institutions/bulk-assign', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    institutionIds: selectedIds.size > 0 ? Array.from(selectedIds) : null,
                    filters: selectedIds.size === 0 ? {
                        state: stateFilter,
                        city: cityFilter,
                        type: filterType === 'ALL' ? undefined : filterType,
                        search: searchTerm
                    } : null,
                    assignedToUserId: assignTargetId
                })
            });

            if (res.ok) {
                alert('Institutions assigned successfully');
                setShowBulkModal(false);
                setAssignTargetId('');
                fetchInstitutions(pagination.page);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to assign institutions');
            }
        } catch (error) {
            alert('An error occurred');
        } finally {
            setActionLoading(false);
        }
    };

    // Note: Removed client-side filteredInstitutions logic as it's now handled by backend

    const institutionTypes = ['UNIVERSITY', 'COLLEGE', 'SCHOOL', 'RESEARCH_INSTITUTE', 'CORPORATE', 'LIBRARY', 'GOVERNMENT', 'HOSPITAL', 'NGO', 'AGENCY', 'OTHER'];

    // Stats calculations might need to be adjusted if they rely on full dataset, 
    // but for now we can show stats for current page or fetch stats separately.
    // Let's rely on the stats returned by API if we update API to return global stats, 
    // or just assume these simple reduce functions work on current page (which is acceptable for now).
    const totalCustomers = institutions.reduce((sum, inst) => sum + (inst._count?.customers || 0), 0);
    const totalSubscriptions = institutions.reduce((sum, inst) => sum + (inst._count?.subscriptions || 0), 0);
    const avgCustomers = institutions.length > 0 ? Math.round(totalCustomers / institutions.length) : 0;

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
                    <Link
                        href="/dashboard/institutions/new"
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Add Institution
                    </Link>
                </div>

                {/* Bulk Action Bar */}
                {selectedIds.size > 0 && ['SUPER_ADMIN', 'MANAGER'].includes(userRole) && (
                    <div className="bg-primary-50 border border-primary-200 p-4 rounded-xl flex items-center justify-between animate-fadeIn">
                        <div className="flex items-center space-x-3">
                            <span className="bg-primary-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                {selectedIds.size}
                            </span>
                            <span className="font-medium text-primary-900">Institutions Selected</span>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="btn btn-secondary bg-white text-secondary-600 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setShowBulkModal(true)}
                                className="btn btn-primary text-sm"
                            >
                                Assign to Executive
                            </button>
                        </div>
                    </div>
                )}

                {/* Stats Cards - Note: These now reflect only the current page's data unless we fetch global stats separately. 
                    For 100k records, global stats should be a separate API call to avoid performance issues. 
                    The API we updated (GET) lists institutions, so these stats are just "Visible on Page".
                    We might want to update the labels or fetch real totals. For now, showing 'Visible' stats or just hiding implementation detail. 
                    Actually, let's just keep it as is, user will understand it's for the list.
                */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="card-premium p-6 border-l-4 border-primary-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-secondary-400 uppercase tracking-widest">Total Institutions</p>
                                <p className="text-3xl font-black text-secondary-900 mt-2">{pagination.total}</p>
                            </div>
                            <Building2 className="text-primary-500" size={40} />
                        </div>
                    </div>
                    <div className="card-premium p-6 border-l-4 border-success-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-secondary-400 uppercase tracking-widest">Visible Customers</p>
                                <p className="text-3xl font-black text-secondary-900 mt-2">{totalCustomers}</p>
                            </div>
                            <Users className="text-success-500" size={40} />
                        </div>
                    </div>
                    <div className="card-premium p-6 border-l-4 border-warning-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-secondary-400 uppercase tracking-widest">Visible Subs</p>
                                <p className="text-3xl font-black text-secondary-900 mt-2">{totalSubscriptions}</p>
                            </div>
                            <BookOpen className="text-warning-500" size={40} />
                        </div>
                    </div>
                    <div className="card-premium p-6 border-l-4 border-accent-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-secondary-400 uppercase tracking-widest">Avg. Cust/Inst</p>
                                <p className="text-3xl font-black text-secondary-900 mt-2">
                                    {avgCustomers}
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
                        <div className="w-full md:w-48">
                            <input
                                type="text"
                                placeholder="State..."
                                className="input w-full"
                                value={stateFilter}
                                onChange={(e) => setStateFilter(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <input
                                type="text"
                                placeholder="City..."
                                className="input w-full"
                                value={cityFilter}
                                onChange={(e) => setCityFilter(e.target.value)}
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
                        {['SUPER_ADMIN', 'MANAGER'].includes(userRole) && (
                            <button
                                onClick={() => setShowBulkModal(true)}
                                className="btn btn-secondary border-dashed border-2 hover:border-primary-500 hover:text-primary-600 font-bold"
                                title="Assign all institutions matching filters"
                            >
                                🎯 Bulk Assign
                            </button>
                        )}
                    </div>
                    {['SUPER_ADMIN', 'MANAGER'].includes(userRole) && (
                        <div className="mt-4 flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="selectAll"
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                onChange={handleSelectAll}
                                checked={institutions.length > 0 && selectedIds.size === institutions.length}
                            />
                            <label htmlFor="selectAll" className="text-sm text-secondary-600 font-medium cursor-pointer">
                                Select All on This Page
                            </label>
                        </div>
                    )}
                </div>

                {/* Institutions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {institutions.map((institution) => (
                        <div key={institution.id} className={`card-premium hover:shadow-xl transition-all group ${selectedIds.has(institution.id) ? 'ring-2 ring-primary-500 bg-primary-50/10' : ''}`}>
                            <div className="p-6">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        {['SUPER_ADMIN', 'MANAGER'].includes(userRole) && (
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mb-auto mt-1"
                                                checked={selectedIds.has(institution.id)}
                                                onChange={() => handleSelect(institution.id)}
                                            />
                                        )}
                                        {institution.logo ? (
                                            <Image src={institution.logo} alt={institution.name} width={48} height={48} className="rounded-lg object-cover" />
                                        ) : (
                                            <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
                                                <Building2 className="text-primary-600" size={24} />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-secondary-900 text-lg truncate" title={institution.name}>{institution.name}</h3>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-bold text-secondary-500">{institution.code}</p>
                                                <span className="px-2 py-0.5 bg-primary-50 text-primary-700 text-[10px] font-black rounded-full">
                                                    {institution.type ? institution.type.replace('_', ' ') : 'UNKNOWN'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Assigned To */}
                                {institution.assignedTo && (
                                    <div className="mb-4 pl-14">
                                        <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-wider">Assigned To</p>
                                        <p className="text-sm font-medium text-secondary-700">
                                            {institution.assignedTo.customerProfile?.name || institution.assignedTo.email}
                                        </p>
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-secondary-100 mt-2">
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

                {institutions.length === 0 && (
                    <div className="card-premium p-20 text-center">
                        <Building2 className="mx-auto text-secondary-300 mb-4" size={64} />
                        <h3 className="text-xl font-black text-secondary-400 mb-2">No Institutions Found</h3>
                        <p className="text-secondary-500">Start by adding your first institution</p>
                    </div>
                )}

                {/* Bulk Assign Modal */}
                {showBulkModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
                            <h3 className="text-xl font-bold text-secondary-900 mb-2">Bulk Assign Institutions</h3>
                            <p className="text-secondary-500 mb-4 font-medium text-sm">
                                {selectedIds.size > 0
                                    ? `Reassigning ${selectedIds.size} manually selected institutions.`
                                    : "Reassigning ALL institutions matching current filters (search, type, state, city)."}
                            </p>

                            {selectedIds.size === 0 && (
                                <div className="bg-warning-50 border border-warning-200 p-3 rounded-xl mb-4 flex items-start gap-2">
                                    <span className="text-lg">⚠️</span>
                                    <div>
                                        <p className="text-xs font-bold text-warning-900 leading-none mb-1">High Impact Action</p>
                                        <p className="text-[10px] text-warning-700 leading-tight">
                                            This will affect every institution that fits your current search results.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="mb-6">
                                <label className="label">Select Executive</label>
                                <select
                                    className="input w-full"
                                    value={assignTargetId}
                                    onChange={(e) => setAssignTargetId(e.target.value)}
                                >
                                    <option value="">-- Select --</option>
                                    {executives.map(ex => (
                                        <option key={ex.id} value={ex.id}>
                                            {ex.email} ({ex.role})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowBulkModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkAssign}
                                    disabled={actionLoading || !assignTargetId}
                                    className="btn btn-primary px-8"
                                >
                                    {actionLoading ? 'Assigning...' : 'Assign'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pagination Controls */}
                <div className="flex justify-between items-center mt-6">
                    <p className="text-sm text-secondary-500">
                        Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                    </p>
                    <div className="flex gap-2">
                        <button
                            className="btn btn-secondary btn-sm"
                            disabled={pagination.page === 1}
                            onClick={() => fetchInstitutions(pagination.page - 1)}
                        >
                            Previous
                        </button>
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            // Show pages around current page
                            let p = i + 1;
                            if (pagination.totalPages > 5) {
                                if (pagination.page > 3) p = pagination.page - 2 + i;
                                if (p > pagination.totalPages) p = pagination.totalPages - (4 - i);
                            }
                            return (
                                <button
                                    key={p}
                                    className={`btn btn-sm ${pagination.page === p ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => fetchInstitutions(p)}
                                >
                                    {p}
                                </button>
                            );
                        })}
                        <button
                            className="btn btn-secondary btn-sm"
                            disabled={pagination.page === pagination.totalPages}
                            onClick={() => fetchInstitutions(pagination.page + 1)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6">
                                <h2 className="text-2xl font-black">{selectedInstitution ? 'Edit Institution' : 'Add New Institution'}</h2>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                                {/* Error/Success Messages */}
                                {errorMessage && (
                                    <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm font-bold text-red-800">{errorMessage}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {successMessage && (
                                    <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm font-bold text-green-800">{successMessage}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                                                <label className="label">Domain</label>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    value={formData.domain}
                                                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                                    placeholder="e.g., Medical, Technical"
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
                )
            }
        </DashboardLayout >
    );
}
