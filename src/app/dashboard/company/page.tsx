'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import CompanyClientLayout from '../companies/CompanyClientLayout';
import CompanyAnalyticsOverview from '@/components/dashboard/company/CompanyAnalyticsOverview';
import WorkforceAnalytics from '@/components/dashboard/company/WorkforceAnalytics';
import { DashboardSkeleton } from '@/components/ui/skeletons';

export default function CompanyPage() {
    const [company, setCompany] = useState<any>(null);
    const [departments, setDepartments] = useState<any[]>([]);
    const [designations, setDesignations] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'WORKFORCE' | 'DETAILS'>('OVERVIEW');

    // Original Modals State
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeptModal, setShowDeptModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [actionLoading, setActionLoading] = useState(false);

    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const companyIdParam = searchParams?.get('id');
    const tabParam = searchParams?.get('tab');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            let companyData: any = null;
            if (companyIdParam) {
                const res = await fetch(`/api/companies/${companyIdParam}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    companyData = await res.json();
                }
            } else {
                const res = await fetch('/api/companies', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const response = await res.json();
                    // Handle both direct array and paginated format { data: [], pagination: {} }
                    const companiesList = Array.isArray(response) ? response : (response.data || []);
                    if (companiesList.length > 0) {
                        companyData = companiesList[0];
                    }
                }
            }

            if (companyData) {
                setCompany(companyData);

                // Fetch departments for this company
                const deptRes = await fetch(`/api/departments?companyId=${companyData.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (deptRes.ok) {
                    const deptData = await deptRes.json();
                    setDepartments(deptData);
                }

                // Fetch staff specifically for this company
                const staffRes = await fetch(`/api/users?companyId=${companyData.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (staffRes.ok) {
                    const staffResponse = await staffRes.json();
                    const staffData = Array.isArray(staffResponse) ? staffResponse : (staffResponse.data || []);
                    setStaffList(staffData);
                }
            }

            // Fetch users for department assignment (might be all visible users)
            const usersRes = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (usersRes.ok) {
                const usersResponse = await usersRes.json();
                const usersList = Array.isArray(usersResponse) ? usersResponse : (usersResponse.data || []);
                setUsers(usersList);
            }
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setLoading(false);
        }
    }, [companyIdParam]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }

        // Set active tab from URL parameter
        if (tabParam === 'analytics') {
            setActiveTab('OVERVIEW');
        } else if (tabParam === 'workforce') {
            setActiveTab('WORKFORCE');
        } else if (tabParam === 'details') {
            setActiveTab('DETAILS');
        }

        fetchData();
        fetchDesignations();
    }, [companyIdParam, tabParam, fetchData]);

    const fetchDesignations = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/designations', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                setDesignations(result.data || result || []);
            }
        } catch (err) {
            console.error('Failed to fetch designations', err);
        }
    };

    const handleUpdateCompany = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setActionLoading(true);
        const formData = new FormData(e.currentTarget);
        const payload = {
            name: formData.get('name'),
            domain: formData.get('domain'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            website: formData.get('website'),
            currency: formData.get('currency'),
            timezone: formData.get('timezone')
        };

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/companies/${company.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const updated = await res.json();
                setCompany(updated);
                setShowEditModal(false);
                alert('Company updated successfully!');
            } else {
                alert('Failed to update company');
            }
        } catch (err) {
            alert('Error updating company');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateDepartment = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setActionLoading(true);
        const formData = new FormData(e.currentTarget);
        const payload = {
            companyId: company.id,
            name: formData.get('name'),
            code: formData.get('code'),
            description: formData.get('description'),
            headUserId: formData.get('headUserId') || null,
            parentDepartmentId: formData.get('parentDepartmentId') || null
        };

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/departments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowDeptModal(false);
                fetchData();
                e.currentTarget.reset();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create department');
            }
        } catch (err) {
            alert('Error creating department');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setActionLoading(true);
        const form = e.currentTarget;
        const formData = new FormData(form);
        const payload: any = Object.fromEntries(formData.entries());

        // Force the companyId to be the current company
        payload.companyId = company.id;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowUserModal(false);
                fetchData();
                form.reset();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create user');
            }
        } catch (err) {
            alert('Network error');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <CompanyClientLayout>
                <DashboardSkeleton />
            </CompanyClientLayout>
        );
    }

    if (!company) {
        return (
            <CompanyClientLayout>
                <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-3xl shadow-2xl text-center border border-secondary-100">
                    <div className="w-20 h-20 bg-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl text-secondary-400">🏢</span>
                    </div>
                    <h3 className="text-2xl font-black text-secondary-900 mb-2">No Company Active</h3>
                    <p className="text-secondary-500 mb-8 font-medium">We couldn&apos;t find a company profile associated with your account or the current selection.</p>

                    <div className="space-y-3">
                        {userRole === 'SUPER_ADMIN' ? (
                            <Link href="/dashboard/companies" className="btn btn-primary w-full py-4 uppercase tracking-widest text-xs font-black">
                                Go to System Companies
                            </Link>
                        ) : (
                            <div className="p-4 bg-primary-50 rounded-xl text-primary-700 text-xs font-bold">
                                Please contact your System Administrator to assign you to a company.
                            </div>
                        )}
                        <button onClick={fetchData} className="btn btn-secondary w-full py-4 text-xs font-black uppercase">
                            Retry Sync
                        </button>
                    </div>
                </div>
            </CompanyClientLayout>
        );
    }

    return (
        <CompanyClientLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">{company.name}</h1>
                        <p className="text-secondary-600">Strategic Dashboard</p>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex space-x-1 bg-secondary-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('OVERVIEW')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'OVERVIEW' ? 'bg-white text-primary-600 shadow' : 'text-secondary-500 hover:text-secondary-700'}`}
                    >
                        Growth & Financials
                    </button>
                    <button
                        onClick={() => setActiveTab('WORKFORCE')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'WORKFORCE' ? 'bg-white text-primary-600 shadow' : 'text-secondary-500 hover:text-secondary-700'}`}
                    >
                        Workforce Intelligence
                    </button>
                    <button
                        onClick={() => setActiveTab('DETAILS')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'DETAILS' ? 'bg-white text-primary-600 shadow' : 'text-secondary-500 hover:text-secondary-700'}`}
                    >
                        Company Settings
                    </button>
                </div>

                {/* Tab Content */}
                <div className="mt-6">
                    {activeTab === 'OVERVIEW' && (
                        <CompanyAnalyticsOverview companyId={company.id} />
                    )}

                    {activeTab === 'WORKFORCE' && (
                        <WorkforceAnalytics companyId={company.id} />
                    )}

                    {activeTab === 'DETAILS' && (
                        <div className="space-y-6 animate-fadeIn">
                            {/* Company Overview */}
                            <div className="flex justify-end">
                                {['SUPER_ADMIN', 'ADMIN'].includes(userRole) && (
                                    <button
                                        onClick={() => setShowEditModal(true)}
                                        className="btn btn-primary"
                                    >
                                        Edit Company Details
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="card-premium p-6">
                                    <h2 className="text-xl font-bold mb-4 font-primary">Organization Details</h2>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-secondary-500 uppercase font-bold">Company Name</label>
                                            <p className="text-lg font-medium text-secondary-900">{company.name}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-secondary-500 uppercase font-bold">Domain</label>
                                            <p className="text-secondary-900">{company.domain || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-secondary-500 uppercase font-bold">Website</label>
                                            <a href={company.website} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">
                                                {company.website || 'N/A'}
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-premium p-6">
                                    <h2 className="text-xl font-bold mb-4 font-primary">Contact Information</h2>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-secondary-500 uppercase font-bold">Email</label>
                                            <p className="text-secondary-900">{company.email || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-secondary-500 uppercase font-bold">Phone</label>
                                            <p className="text-secondary-900">{company.phone || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-secondary-500 uppercase font-bold">Address</label>
                                            <p className="text-secondary-900">{company.address || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-premium p-6">
                                    <h2 className="text-xl font-bold mb-4 font-primary">Settings</h2>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-secondary-500 uppercase font-bold">Currency</label>
                                            <p className="text-secondary-900">{company.currency || 'INR'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-secondary-500 uppercase font-bold">Timezone</label>
                                            <p className="text-secondary-900">{company.timezone || 'Asia/Kolkata'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-secondary-500 uppercase font-bold">Employees</label>
                                            <p className="text-secondary-900 text-2xl font-bold">{company._count?.users || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Departments Section */}
                            <div className="card-premium p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold font-primary">Departments</h2>
                                        <p className="text-secondary-600">Organizational structure and hierarchy</p>
                                    </div>
                                    {['SUPER_ADMIN', 'ADMIN'].includes(userRole) && (
                                        <button
                                            onClick={() => setShowDeptModal(true)}
                                            className="btn btn-primary"
                                        >
                                            + Add Department
                                        </button>
                                    )}
                                </div>

                                {departments.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {departments.map(dept => (
                                            <div key={dept.id} className="border border-secondary-200 rounded-xl p-4 hover:shadow-lg transition-shadow">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <h3 className="font-bold text-lg text-secondary-900">{dept.name}</h3>
                                                        {dept.code && (
                                                            <span className="text-xs bg-secondary-100 text-secondary-600 px-2 py-1 rounded">{dept.code}</span>
                                                        )}
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${dept.isActive ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'}`}>
                                                        {dept.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>

                                                {dept.description && (
                                                    <p className="text-sm text-secondary-600 mb-3">{dept.description}</p>
                                                )}

                                                <div className="space-y-2 text-sm">
                                                    {dept.headUser && (
                                                        <div>
                                                            <span className="text-secondary-500">Head:</span>
                                                            <span className="ml-2 font-medium">{dept.headUser.email}</span>
                                                        </div>
                                                    )}
                                                    {dept.parentDepartment && (
                                                        <div>
                                                            <span className="text-secondary-500">Parent:</span>
                                                            <span className="ml-2">{dept.parentDepartment.name}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between pt-2 border-t border-secondary-100">
                                                        <span className="text-secondary-500">👥 {dept._count.users} members</span>
                                                        <span className="text-secondary-500">📁 {dept._count.subDepartments} sub-depts</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 bg-secondary-50 rounded-xl">
                                        <p className="text-secondary-500">No departments created yet.</p>
                                        {['SUPER_ADMIN', 'ADMIN'].includes(userRole) && (
                                            <button
                                                onClick={() => setShowDeptModal(true)}
                                                className="mt-4 btn btn-secondary"
                                            >
                                                Create First Department
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Staff Members Section */}
                            <div className="card-premium p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold font-primary">Staff Members</h2>
                                        <p className="text-secondary-600">Personnel associated with this organization</p>
                                    </div>
                                    {['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole) && (
                                        <button
                                            onClick={() => setShowUserModal(true)}
                                            className="btn btn-primary"
                                        >
                                            + Add New Employee
                                        </button>
                                    )}
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-secondary-100">
                                                <th className="pb-3 font-bold text-secondary-500 uppercase text-xs">User</th>
                                                <th className="pb-3 font-bold text-secondary-500 uppercase text-xs">Role</th>
                                                <th className="pb-3 font-bold text-secondary-500 uppercase text-xs">Department</th>
                                                <th className="pb-3 font-bold text-secondary-500 uppercase text-xs text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {staffList.length > 0 ? staffList.map(staff => (
                                                <tr key={staff.id} className="border-b border-secondary-50 hover:bg-secondary-50">
                                                    <td className="py-4">
                                                        <div>
                                                            <p className="font-medium text-secondary-900">{staff.email}</p>
                                                            <p className="text-xs text-secondary-400">ID: {staff.id.split('-')[0]}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-4">
                                                        <span className="badge badge-secondary">{staff.role.replace('_', ' ')}</span>
                                                    </td>
                                                    <td className="py-4">
                                                        <p className="text-sm text-secondary-600">{staff.department?.name || 'Unassigned'}</p>
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        <Link
                                                            href={`/dashboard/users?search=${encodeURIComponent(staff.email)}`}
                                                            className="text-primary-600 hover:text-primary-800 font-medium text-sm"
                                                        >
                                                            View Details
                                                        </Link>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={4} className="py-8 text-center text-secondary-500">No staff members found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Company Modal */}
            {showEditModal && company && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-secondary-900 mb-6 font-primary">Edit Company Details</h2>
                        <form onSubmit={handleUpdateCompany} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Company Name *</label>
                                    <input name="name" className="input" defaultValue={company.name} required />
                                </div>
                                <div>
                                    <label className="label">Domain</label>
                                    <input name="domain" className="input" defaultValue={company.domain || ''} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Email</label>
                                    <input name="email" type="email" className="input" defaultValue={company.email || ''} />
                                </div>
                                <div>
                                    <label className="label">Phone</label>
                                    <input name="phone" className="input" defaultValue={company.phone || ''} />
                                </div>
                            </div>

                            <div>
                                <label className="label">Address</label>
                                <textarea name="address" className="input" rows={2} defaultValue={company.address || ''}></textarea>
                            </div>

                            <div>
                                <label className="label">Website</label>
                                <input name="website" type="url" className="input" defaultValue={company.website || ''} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Currency</label>
                                    <select name="currency" className="input" defaultValue={company.currency || 'INR'}>
                                        <option value="INR">INR (₹)</option>
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Timezone</label>
                                    <select name="timezone" className="input" defaultValue={company.timezone || 'Asia/Kolkata'}>
                                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                        <option value="America/New_York">America/New_York (EST)</option>
                                        <option value="Europe/London">Europe/London (GMT)</option>
                                        <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="btn btn-primary px-8"
                                >
                                    {actionLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Department Modal */}
            {showDeptModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
                        <h2 className="text-2xl font-bold text-secondary-900 mb-6 font-primary">Create Department</h2>
                        <form onSubmit={handleCreateDepartment} className="space-y-4">
                            <div>
                                <label className="label">Department Name *</label>
                                <input name="name" className="input" required placeholder="e.g., Sales Department" />
                            </div>

                            <div>
                                <label className="label">Department Code</label>
                                <input name="code" className="input" placeholder="e.g., SALES" />
                            </div>

                            <div>
                                <label className="label">Description</label>
                                <textarea name="description" className="input" rows={2} placeholder="Brief description of the department"></textarea>
                            </div>

                            <div>
                                <label className="label">Parent Department (Optional)</label>
                                <select name="parentDepartmentId" className="input">
                                    <option value="">None (Top Level)</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">Department Head (Optional)</label>
                                <select name="headUserId" className="input">
                                    <option value="">Select a user...</option>
                                    {users.filter(u => ['MANAGER', 'TEAM_LEADER', 'ADMIN'].includes(u.role)).map(user => (
                                        <option key={user.id} value={user.id}>{user.email} ({user.role})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowDeptModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="btn btn-primary px-8"
                                >
                                    {actionLoading ? 'Creating...' : 'Create Department'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Invite Staff Modal */}
            {showUserModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
                        <h2 className="text-2xl font-bold text-secondary-900 mb-6 font-primary">Add New Employee</h2>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="label">Full Name *</label>
                                <input name="name" type="text" className="input" required placeholder="John Doe" />
                            </div>

                            <div>
                                <label className="label">Work Email *</label>
                                <input name="email" type="email" className="input" required placeholder="staff@company.com" />
                            </div>

                            <div>
                                <label className="label">Temporary Password *</label>
                                <input name="password" type="password" className="input" required placeholder="••••••••" />
                            </div>

                            <div>
                                <label className="label">System Role *</label>
                                <select name="role" className="input" required>
                                    <option value="EXECUTIVE">Executive</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="ADMIN">Company Admin</option>
                                    <option value="FINANCE_ADMIN">Finance Admin</option>
                                </select>
                            </div>

                            <div>
                                <label className="label">Department (Optional)</label>
                                <select name="departmentId" className="input">
                                    <option value="">Select a department...</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">Designation (Optional)</label>
                                <select name="designationId" className="input">
                                    <option value="">Select a designation...</option>
                                    {designations.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">Phone Number</label>
                                <input name="phone" type="tel" className="input" placeholder="+91 9876543210" />
                            </div>

                            <div>
                                <label className="label">Date of Joining</label>
                                <input name="dateOfJoining" type="date" className="input" />
                            </div>

                            <div className="flex justify-end space-x-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowUserModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="btn btn-primary px-8"
                                >
                                    {actionLoading ? 'Creating...' : 'Add Employee'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </CompanyClientLayout>
    );
}
