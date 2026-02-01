'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface EmployeeManagementProps {
    filters: any;
}

import EmployeeProfileView from './EmployeeProfileView';

export default function EmployeeManagement({ filters }: EmployeeManagementProps) {
    const [employees, setEmployees] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [designations, setDesignations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<any>(null);
    const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        departmentId: '',
        designationId: '',
        companyId: '',
        dateOfJoining: '',
        status: 'ACTIVE',
        managerId: ''
    });

    // Fetch employees
    useEffect(() => {
        const fetchEmployees = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (filters.companyId !== 'all') params.append('companyId', filters.companyId);
                if (filters.teamId !== 'all') params.append('departmentId', filters.teamId);
                if (filters.employeeId !== 'all') params.append('id', filters.employeeId);
                if (filters.status !== 'all') params.append('status', filters.status);
                if (filters.search) {
                    params.append('search', filters.search);
                    params.append('searchType', filters.searchType || 'all');
                }

                const res = await fetch(`/api/staff-management/employees?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setEmployees(data);
                }
            } catch (err) {
                console.error('Error fetching employees:', err);
                toast.error('Failed to fetch employees');
            } finally {
                setLoading(false);
            }
        };

        fetchEmployees();
    }, [filters]);

    // Fetch companies, departments, and designations
    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = { 'Authorization': `Bearer ${token}` };

                // Fetch companies
                const companiesRes = await fetch('/api/companies', { headers });
                if (companiesRes.ok) {
                    const companiesData = await companiesRes.json();
                    setCompanies(companiesData.data || companiesData || []);
                }

                // Fetch departments
                const deptsRes = await fetch('/api/departments', { headers });
                if (deptsRes.ok) {
                    const deptsData = await deptsRes.json();
                    setDepartments(deptsData.data || deptsData || []);
                }

                // Fetch designations
                const desigRes = await fetch('/api/hr/designations', { headers });
                if (desigRes.ok) {
                    const desigData = await desigRes.json();
                    setDesignations(desigData.data || desigData || []);
                }
            } catch (err) {
                console.error('Error fetching dropdown data:', err);
            }
        };

        fetchDropdownData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingEmployee
                ? `/api/staff-management/employees/${editingEmployee.id}`
                : '/api/staff-management/employees';

            const res = await fetch(url, {
                method: editingEmployee ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(editingEmployee ? 'Employee updated successfully' : 'Employee added successfully');
                setShowModal(false);
                setEditingEmployee(null);
                // Refresh employees
                window.location.reload();
            } else {
                toast.error('Failed to save employee');
            }
        } catch (err) {
            console.error('Error saving employee:', err);
            toast.error('An error occurred');
        }
    };

    const handleEdit = (employee: any) => {
        setEditingEmployee(employee);
        setFormData({
            name: employee.name,
            email: employee.email,
            phone: employee.phone || '',
            departmentId: employee.departmentId || '',
            designationId: employee.designationId || '',
            companyId: employee.companyId || '',
            dateOfJoining: employee.dateOfJoining?.split('T')[0] || '',
            status: employee.status,
            managerId: employee.manager?.id || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (employeeId: string) => {
        if (!confirm('Are you sure you want to delete this employee?')) return;

        try {
            const res = await fetch(`/api/staff-management/employees/${employeeId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                toast.success('Employee deleted successfully');
                setEmployees(employees.filter(e => e.id !== employeeId));
            } else {
                toast.error('Failed to delete employee');
            }
        } catch (err) {
            console.error('Error deleting employee:', err);
            toast.error('An error occurred');
        }
    };

    const handleStatusChange = async (employeeId: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/staff-management/employees/${employeeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                toast.success('Status updated successfully');
                setEmployees(employees.map(e =>
                    e.id === employeeId ? { ...e, status: newStatus } : e
                ));
            } else {
                toast.error('Failed to update status');
            }
        } catch (err) {
            console.error('Error updating status:', err);
            toast.error('An error occurred');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-secondary-900">Employee Management</h2>
                    <p className="text-sm text-secondary-500">Manage all employees across companies</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex items-center bg-secondary-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-white shadow text-secondary-900' : 'text-secondary-600'
                                }`}
                        >
                            Table
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-white shadow text-secondary-900' : 'text-secondary-600'
                                }`}
                        >
                            Grid
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            setEditingEmployee(null);
                            setFormData({
                                name: '',
                                email: '',
                                phone: '',
                                departmentId: '',
                                designationId: '',
                                companyId: '',
                                dateOfJoining: '',
                                status: 'ACTIVE',
                                managerId: ''
                            });
                            setShowModal(true);
                        }}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                    >
                        + Add Employee
                    </button>
                </div>
            </div>

            {/* Employee List */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : viewMode === 'table' ? (
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Department</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Company</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Designation</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Manager</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Join Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-200">
                                {employees.map((employee) => (
                                    <tr key={employee.id} className="hover:bg-secondary-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold">
                                                    {employee.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm font-medium text-secondary-900">{employee.name}</p>
                                                    <p className="text-xs text-secondary-500">{employee.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            {employee.department?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            {employee.companyName || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            {employee.designation?.title || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            {employee.manager?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            {employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={employee.status}
                                                onChange={(e) => handleStatusChange(employee.id, e.target.value)}
                                                className={`px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer ${employee.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                                    employee.status === 'INACTIVE' ? 'bg-gray-100 text-gray-700' :
                                                        employee.status === 'ON_LEAVE' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                    }`}
                                            >
                                                <option value="ACTIVE">Active</option>
                                                <option value="INACTIVE">Inactive</option>
                                                <option value="ON_LEAVE">On Leave</option>
                                                <option value="TERMINATED">Terminated</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setViewingProfileId(employee.id)}
                                                className="text-blue-600 hover:text-blue-800 mr-3"
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() => handleEdit(employee)}
                                                className="text-primary-600 hover:text-primary-800 mr-3"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(employee.id)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {employees.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-secondary-500">No employees found</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {employees.map((employee) => (
                        <div key={employee.id} className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center">
                                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg">
                                        {employee.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="ml-3">
                                        <p className="font-semibold text-secondary-900">{employee.name}</p>
                                        <p className="text-sm text-secondary-500">{employee.email}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${employee.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                    employee.status === 'INACTIVE' ? 'bg-gray-100 text-gray-700' :
                                        employee.status === 'ON_LEAVE' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-red-100 text-red-700'
                                    }`}>
                                    {employee.status}
                                </span>
                            </div>
                            <div className="mt-4 space-y-2">
                                <p className="text-sm text-secondary-600">
                                    <span className="font-medium">Company:</span> {employee.companyName || '-'}
                                </p>
                                <p className="text-sm text-secondary-600">
                                    <span className="font-medium">Department:</span> {employee.department?.name || '-'}
                                </p>
                                <p className="text-sm text-secondary-600">
                                    <span className="font-medium">Designation:</span> {employee.designation?.title || '-'}
                                </p>
                                <p className="text-sm text-secondary-600">
                                    <span className="font-medium">Manager:</span> {employee.manager?.name || '-'}
                                </p>
                                <p className="text-sm text-secondary-600">
                                    <span className="font-medium">Join Date:</span> {employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : '-'}
                                </p>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={() => setViewingProfileId(employee.id)}
                                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                                >
                                    View
                                </button>
                                <button
                                    onClick={() => handleEdit(employee)}
                                    className="flex-1 px-3 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(employee.id)}
                                    className="flex-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-secondary-200">
                            <h3 className="text-lg font-semibold text-secondary-900">
                                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                            </h3>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                        <option value="ON_LEAVE">On Leave</option>
                                        <option value="TERMINATED">Terminated</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Company</label>
                                <select
                                    value={formData.companyId}
                                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                                    className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="">Select Company</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Department</label>
                                    <select
                                        value={formData.departmentId}
                                        onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                                        className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Designation</label>
                                    <select
                                        value={formData.designationId}
                                        onChange={(e) => setFormData({ ...formData, designationId: e.target.value })}
                                        className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="">Select Designation</option>
                                        {designations.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Date of Joining</label>
                                <input
                                    type="date"
                                    value={formData.dateOfJoining}
                                    onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                                    className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Reporting Manager</label>
                                <select
                                    value={formData.managerId}
                                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                                    className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="">Select Manager</option>
                                    {employees
                                        .filter(emp => !editingEmployee || emp.id !== editingEmployee.id)
                                        .map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                                        ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingEmployee(null);
                                    }}
                                    className="flex-1 px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg text-sm font-medium hover:bg-secondary-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                                >
                                    {editingEmployee ? 'Update' : 'Add Employee'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Profile View Modal */}
            {viewingProfileId && (
                <EmployeeProfileView
                    employeeId={viewingProfileId}
                    onClose={() => setViewingProfileId(null)}
                />
            )}
        </div>
    );
}
