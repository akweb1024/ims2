'use client';

import { useState, useEffect } from 'react';
import { Users, BookOpen, MessageSquare, TrendingUp, UserPlus, X, Mail, Phone } from 'lucide-react';

interface InstitutionActivityDashboardProps {
    institutionId: string;
}

export default function InstitutionActivityDashboard({ institutionId }: InstitutionActivityDashboardProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('customers');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [assignmentRole, setAssignmentRole] = useState('Institution Manager');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchInstitutionActivity();
    }, [institutionId]);

    const fetchInstitutionActivity = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/institutions/activity?institutionId=${institutionId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch (error) {
            console.error('Error fetching institution activity:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users?role=EXECUTIVE,MANAGER,TEAM_LEADER', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                setEmployees(result);
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const handleBulkAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/institutions/activity', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    institutionId,
                    employeeId: selectedEmployee,
                    role: assignmentRole,
                    notes
                })
            });

            if (res.ok) {
                const result = await res.json();
                alert(result.message);
                setShowAssignModal(false);
                fetchInstitutionActivity();
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to assign employee');
            }
        } catch (error) {
            console.error('Error assigning employee:', error);
            alert('Failed to assign employee');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-secondary-500 font-bold">Loading institution activity...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return <div className="text-center py-20 text-secondary-400">No data available</div>;
    }

    const { institution, stats } = data;

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card-premium p-6 border-l-4 border-primary-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-secondary-400 uppercase tracking-widest">Total Customers</p>
                            <p className="text-3xl font-black text-secondary-900 mt-2">{stats.totalCustomers}</p>
                        </div>
                        <Users className="text-primary-500" size={40} />
                    </div>
                </div>
                <div className="card-premium p-6 border-l-4 border-success-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-secondary-400 uppercase tracking-widest">Active Subscriptions</p>
                            <p className="text-3xl font-black text-secondary-900 mt-2">{stats.activeSubscriptions}</p>
                        </div>
                        <BookOpen className="text-success-500" size={40} />
                    </div>
                </div>
                <div className="card-premium p-6 border-l-4 border-warning-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-secondary-400 uppercase tracking-widest">Communications</p>
                            <p className="text-3xl font-black text-secondary-900 mt-2">{stats.totalCommunications}</p>
                        </div>
                        <MessageSquare className="text-warning-500" size={40} />
                    </div>
                </div>
                <div className="card-premium p-6 border-l-4 border-accent-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-secondary-400 uppercase tracking-widest">Total Revenue</p>
                            <p className="text-2xl font-black text-secondary-900 mt-2">₹{stats.totalRevenue.toLocaleString()}</p>
                        </div>
                        <TrendingUp className="text-accent-500" size={40} />
                    </div>
                </div>
            </div>

            {/* Assigned Employees */}
            <div className="card-premium p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-secondary-900">Assigned Employees</h3>
                    <button
                        onClick={() => {
                            fetchEmployees();
                            setShowAssignModal(true);
                        }}
                        className="btn btn-sm btn-primary flex items-center gap-2"
                    >
                        <UserPlus size={16} />
                        Assign to Institution
                    </button>
                </div>
                <div className="flex flex-wrap gap-3">
                    {stats.assignedEmployees.length === 0 ? (
                        <p className="text-sm text-secondary-500">No employees assigned to this institution</p>
                    ) : (
                        stats.assignedEmployees.map((emp: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-lg">
                                <div className="w-8 h-8 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-black text-primary-700">
                                        {emp.email.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-secondary-900">{emp.email}</p>
                                    <p className="text-xs text-secondary-500">{emp.role}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Customer Breakdown by Designation */}
            <div className="card-premium p-6">
                <h3 className="text-lg font-black text-secondary-900 mb-4">Customers by Designation</h3>
                <div className="space-y-3">
                    {Object.entries(stats.customersByDesignation).map(([designation, count]: any) => (
                        <div key={designation} className="flex items-center justify-between">
                            <span className="text-sm font-bold text-secondary-700">{designation.replace('_', ' ')}</span>
                            <div className="flex items-center gap-3">
                                <div className="w-32 h-2 bg-secondary-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary-500"
                                        style={{ width: `${(count / stats.totalCustomers) * 100}%` }}
                                    />
                                </div>
                                <span className="text-sm font-black text-secondary-900 w-8 text-right">{count}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-secondary-100 w-fit">
                {['customers', 'subscriptions', 'communications'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2 rounded-xl font-bold transition-all uppercase text-xs tracking-widest ${activeTab === tab ? 'bg-primary-600 text-white shadow-lg' : 'text-secondary-400 hover:bg-secondary-50'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'customers' && (
                <div className="card-premium overflow-hidden">
                    <table className="table">
                        <thead>
                            <tr className="text-xs uppercase font-black text-secondary-400 border-b border-secondary-50">
                                <th className="pb-4">Name</th>
                                <th className="pb-4">Designation</th>
                                <th className="pb-4">Contact</th>
                                <th className="pb-4">Subscriptions</th>
                                <th className="pb-4">Assigned To</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-50">
                            {institution.customers.map((customer: any) => (
                                <tr key={customer.id} className="hover:bg-secondary-50/50 transition-colors">
                                    <td className="py-4">
                                        <p className="font-bold text-secondary-900">{customer.name}</p>
                                    </td>
                                    <td className="py-4">
                                        <span className="px-2 py-1 bg-primary-50 text-primary-700 text-xs font-black rounded">
                                            {customer.designation?.replace('_', ' ') || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="py-4">
                                        <div className="text-xs space-y-1">
                                            <div className="flex items-center gap-1">
                                                <Mail size={12} className="text-secondary-400" />
                                                <span className="text-secondary-600">{customer.primaryEmail}</span>
                                            </div>
                                            {customer.primaryPhone && (
                                                <div className="flex items-center gap-1">
                                                    <Phone size={12} className="text-secondary-400" />
                                                    <span className="text-secondary-600">{customer.primaryPhone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <p className="text-sm font-black text-secondary-900">{customer.subscriptions?.length || 0}</p>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {customer.assignments.slice(0, 2).map((assignment: any) => (
                                                <span key={assignment.id} className="px-2 py-1 bg-success-50 text-success-700 text-xs font-bold rounded">
                                                    {assignment.employee.email.split('@')[0]}
                                                </span>
                                            ))}
                                            {customer.assignments.length > 2 && (
                                                <span className="px-2 py-1 bg-secondary-100 text-secondary-600 text-xs font-bold rounded">
                                                    +{customer.assignments.length - 2}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'subscriptions' && (
                <div className="space-y-4">
                    {institution.subscriptions.map((subscription: any) => (
                        <div key={subscription.id} className="card-premium p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-black text-secondary-900">{subscription.customerProfile.name}</h4>
                                    <p className="text-sm text-secondary-600">
                                        {subscription.customerProfile.designation?.replace('_', ' ')}
                                    </p>
                                </div>
                                <span className={`px-3 py-1 text-xs font-black rounded-full ${subscription.status === 'ACTIVE' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'
                                    }`}>
                                    {subscription.status}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-secondary-500 font-bold">Period</p>
                                    <p className="text-secondary-900 font-black">
                                        {new Date(subscription.startDate).toLocaleDateString()} - {new Date(subscription.endDate).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-secondary-500 font-bold">Amount</p>
                                    <p className="text-secondary-900 font-black">₹{subscription.total.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-secondary-500 font-bold">Items</p>
                                    <p className="text-secondary-900 font-black">{subscription.items?.length || 0}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'communications' && (
                <div className="space-y-4">
                    {stats.recentCommunications.map((comm: any) => (
                        <div key={comm.id} className="border-l-4 border-primary-500 bg-secondary-50 p-4 rounded-r-lg">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-black text-secondary-900">{comm.subject}</h4>
                                    <p className="text-sm text-secondary-600">
                                        {comm.customerProfile.name} ({comm.customerProfile.designation?.replace('_', ' ')})
                                    </p>
                                    <p className="text-xs text-secondary-500 mt-1">
                                        {comm.channel} • {new Date(comm.date).toLocaleString()} • By {comm.user?.email}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-black rounded ${comm.type === 'EMAIL' ? 'bg-primary-100 text-primary-700' :
                                        comm.type === 'CALL' ? 'bg-success-100 text-success-700' :
                                            'bg-secondary-100 text-secondary-700'
                                    }`}>
                                    {comm.type}
                                </span>
                            </div>
                            <p className="text-sm text-secondary-700">{comm.notes}</p>
                            {comm.outcome && (
                                <p className="text-xs text-secondary-500 mt-2">Outcome: {comm.outcome}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Bulk Assignment Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAssignModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black">Assign to Institution</h2>
                                <p className="text-primary-100 text-sm mt-1">All {stats.totalCustomers} customers will be assigned</p>
                            </div>
                            <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-white/20 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleBulkAssign} className="p-6 space-y-4">
                            <div>
                                <label className="label">Select Employee *</label>
                                <select
                                    className="input"
                                    value={selectedEmployee}
                                    onChange={(e) => setSelectedEmployee(e.target.value)}
                                    required
                                >
                                    <option value="">Choose an employee...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.email} ({emp.role})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">Assignment Role</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={assignmentRole}
                                    onChange={(e) => setAssignmentRole(e.target.value)}
                                    placeholder="e.g., Institution Manager"
                                />
                            </div>

                            <div>
                                <label className="label">Notes</label>
                                <textarea
                                    className="input"
                                    rows={3}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Assignment notes..."
                                />
                            </div>

                            <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                                <p className="text-sm text-warning-800 font-bold">
                                    ⚠️ This will assign the selected employee to ALL {stats.totalCustomers} customers from this institution.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowAssignModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={!selectedEmployee}
                                >
                                    Assign to All Customers
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
