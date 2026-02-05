'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Users } from 'lucide-react';

interface CustomerAssignmentManagerProps {
    customerId: string;
    customerName: string;
    currentAssignments: any[];
    onUpdate: () => void;
}

export default function CustomerAssignmentManager({
    customerId,
    customerName,
    currentAssignments,
    onUpdate
}: CustomerAssignmentManagerProps) {
    const [showModal, setShowModal] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [assignmentRole, setAssignmentRole] = useState('Primary');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (showModal) {
            fetchEmployees();
        }
    }, [showModal]);

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users?role=EXECUTIVE,MANAGER,TEAM_LEADER', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const response = await res.json();
                const data = Array.isArray(response) ? response : (response.data || []);
                setEmployees(data);
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const handleAddAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/customers/assignments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customerId,
                    employeeId: selectedEmployee,
                    role: assignmentRole,
                    notes
                })
            });

            if (res.ok) {
                setSelectedEmployee('');
                setAssignmentRole('Primary');
                setNotes('');
                setShowModal(false);
                onUpdate();
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to add assignment');
            }
        } catch (error) {
            console.error('Error adding assignment:', error);
            alert('Failed to add assignment');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveAssignment = async (assignmentId: string) => {
        if (!confirm('Remove this employee assignment?')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/customers/assignments?id=${assignmentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                onUpdate();
            }
        } catch (error) {
            console.error('Error removing assignment:', error);
        }
    };

    return (
        <div>
            {/* Assigned Employees Display */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-secondary-900 uppercase tracking-widest">Assigned Employees</h3>
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn btn-sm btn-primary flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Assign
                    </button>
                </div>

                {currentAssignments.length === 0 ? (
                    <div className="text-center py-8 bg-secondary-50 rounded-xl border border-dashed border-secondary-200">
                        <Users className="mx-auto text-secondary-300 mb-2" size={32} />
                        <p className="text-sm text-secondary-500 font-bold">No employees assigned</p>
                        <p className="text-xs text-secondary-400 mt-1">Click &quot;Assign&quot; to add employees</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {currentAssignments.map((assignment) => (
                            <div
                                key={assignment.id}
                                className="flex items-center justify-between p-3 bg-white border border-secondary-100 rounded-lg hover:border-primary-200 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center">
                                        <span className="text-xs font-black text-primary-700">
                                            {assignment.employee.email.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-secondary-900">{assignment.employee.email}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {assignment.role && (
                                                <span className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs font-black rounded">
                                                    {assignment.role}
                                                </span>
                                            )}
                                            <span className="text-xs text-secondary-500">
                                                {new Date(assignment.assignedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveAssignment(assignment.id)}
                                    className="p-2 text-danger-500 hover:bg-danger-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Assignment Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black">Assign Employee</h2>
                                <p className="text-primary-100 text-sm mt-1">{customerName}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddAssignment} className="p-6 space-y-4">
                            <div>
                                <label className="label">Select Employee *</label>
                                <select
                                    className="input"
                                    value={selectedEmployee}
                                    onChange={(e) => setSelectedEmployee(e.target.value)}
                                    required
                                >
                                    <option value="">Choose an employee...</option>
                                    {(Array.isArray(employees) ? employees : [])
                                        .filter(emp => !currentAssignments?.some(a => a.employee.id === emp.id))
                                        .map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.email} ({emp.role})
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div>
                                <label className="label">Assignment Role</label>
                                <select
                                    className="input"
                                    value={assignmentRole}
                                    onChange={(e) => setAssignmentRole(e.target.value)}
                                >
                                    <option value="Primary">Primary</option>
                                    <option value="Secondary">Secondary</option>
                                    <option value="Support">Support</option>
                                </select>
                            </div>

                            <div>
                                <label className="label">Notes</label>
                                <textarea
                                    className="input"
                                    rows={3}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Assignment notes or responsibilities..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn btn-secondary"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loading || !selectedEmployee}
                                >
                                    {loading ? 'Assigning...' : 'Assign Employee'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
