'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import RichTextEditor from '@/components/common/RichTextEditor';
import { DollarSign, TrendingUp, Save, X, User } from 'lucide-react';

export default function NewIncrementPage() {
    const router = useRouter();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        employeeProfileId: '',
        newFixedSalary: 0,
        newVariableSalary: 0,
        newIncentive: 0,
        newDesignation: '',
        reason: '',
        performanceNotes: '',
        newKRA: '',
        newKPI: '',
        effectiveDate: new Date().toISOString().split('T')[0]
    });

    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

    const fetchEmployees = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/employees', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setEmployees(data);
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    }, []);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const handleEmployeeChange = (employeeId: string) => {
        const employee = employees.find(e => e.id === employeeId);
        setSelectedEmployee(employee);
        setForm({
            ...form,
            employeeProfileId: employeeId,
            newFixedSalary: employee?.fixedSalary || employee?.baseSalary || 0,
            newVariableSalary: employee?.variableSalary || 0,
            newIncentive: employee?.incentiveSalary || 0,
            newDesignation: employee?.designation || ''
        });
    };

    const totalNewSalary = form.newFixedSalary + form.newVariableSalary + form.newIncentive;
    const oldSalary = selectedEmployee?.baseSalary || 0;
    const incrementAmount = totalNewSalary - oldSalary;
    const incrementPercentage = oldSalary > 0 ? (incrementAmount / oldSalary) * 100 : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const token = localStorage.getItem('token');

            // Parse KPI JSON if provided
            let kpiData = null;
            if (form.newKPI) {
                try {
                    kpiData = JSON.parse(form.newKPI);
                } catch {
                    alert('Invalid KPI JSON format');
                    setSaving(false);
                    return;
                }
            }

            const res = await fetch('/api/hr/increments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...form,
                    newKPI: kpiData
                })
            });

            if (res.ok) {
                alert('Increment draft created successfully!');
                router.push('/dashboard/hr-management/increments');
            } else {
                const error = await res.json();
                alert(`Error: ${error.error || 'Failed to create increment'}`);
            }
        } catch (error) {
            console.error('Error creating increment:', error);
            alert('An error occurred');
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-black text-secondary-900">
                            Create Salary Increment
                        </h1>
                        <p className="text-secondary-600 mt-1">
                            Create a new increment draft with salary breakdown and KRA/KPI updates
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Employee Selection */}
                        <div className="card-premium p-6">
                            <h2 className="text-lg font-black text-secondary-900 mb-4 flex items-center gap-2">
                                <User className="text-primary-500" size={20} />
                                Employee Selection
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label-premium">Select Employee *</label>
                                    <select
                                        required
                                        className="input-premium"
                                        value={form.employeeProfileId}
                                        onChange={(e) => handleEmployeeChange(e.target.value)}
                                    >
                                        <option value="">Choose employee...</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.user?.name} ({emp.user?.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="label-premium">Effective Date *</label>
                                    <input
                                        type="date"
                                        required
                                        className="input-premium"
                                        value={form.effectiveDate}
                                        onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            {selectedEmployee && (
                                <div className="mt-4 p-4 bg-secondary-50 rounded-xl">
                                    <p className="text-sm font-bold text-secondary-900 mb-2">Current Salary Breakdown:</p>
                                    <div className="grid grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <p className="text-secondary-500">Fixed</p>
                                            <p className="font-bold">₹{(selectedEmployee.fixedSalary || selectedEmployee.baseSalary || 0).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-secondary-500">Variable</p>
                                            <p className="font-bold">₹{(selectedEmployee.variableSalary || 0).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-secondary-500">Incentive</p>
                                            <p className="font-bold">₹{(selectedEmployee.incentiveSalary || 0).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-secondary-500">Total</p>
                                            <p className="font-bold text-primary-600">₹{(selectedEmployee.baseSalary || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* New Salary Structure */}
                        <div className="card-premium p-6">
                            <h2 className="text-lg font-black text-secondary-900 mb-4 flex items-center gap-2">
                                <DollarSign className="text-success-500" size={20} />
                                New Salary Structure
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="label-premium">Fixed Salary *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="100"
                                        className="input-premium"
                                        value={form.newFixedSalary}
                                        onChange={(e) => setForm({ ...form, newFixedSalary: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>

                                <div>
                                    <label className="label-premium">Variable Salary</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="100"
                                        className="input-premium"
                                        value={form.newVariableSalary}
                                        onChange={(e) => setForm({ ...form, newVariableSalary: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>

                                <div>
                                    <label className="label-premium">Incentive</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="100"
                                        className="input-premium"
                                        value={form.newIncentive}
                                        onChange={(e) => setForm({ ...form, newIncentive: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            {/* Increment Summary */}
                            <div className="p-4 bg-gradient-to-r from-primary-50 to-success-50 rounded-xl border border-primary-200">
                                <div className="grid grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-xs text-secondary-600 font-bold uppercase">Total New Salary</p>
                                        <p className="text-2xl font-black text-primary-600">₹{totalNewSalary.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-secondary-600 font-bold uppercase">Increment Amount</p>
                                        <p className="text-2xl font-black text-success-600">+₹{incrementAmount.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-secondary-600 font-bold uppercase">Percentage</p>
                                        <p className="text-2xl font-black text-success-600">{incrementPercentage.toFixed(2)}%</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-secondary-600 font-bold uppercase">Old Salary</p>
                                        <p className="text-2xl font-black text-secondary-400">₹{oldSalary.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Designation & Reason */}
                        <div className="card-premium p-6">
                            <h2 className="text-lg font-black text-secondary-900 mb-4 flex items-center gap-2">
                                <TrendingUp className="text-indigo-500" size={20} />
                                Designation & Justification
                            </h2>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="label-premium">New Designation (if changed)</label>
                                    <input
                                        type="text"
                                        className="input-premium"
                                        placeholder="e.g., Senior Developer, Team Lead"
                                        value={form.newDesignation}
                                        onChange={(e) => setForm({ ...form, newDesignation: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="label-premium">Reason for Increment</label>
                                    <textarea
                                        className="input-premium"
                                        rows={3}
                                        placeholder="e.g., Excellent performance in Q4, exceeded all targets..."
                                        value={form.reason}
                                        onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="label-premium">Performance Notes</label>
                                    <textarea
                                        className="input-premium"
                                        rows={4}
                                        placeholder="Detailed performance review notes..."
                                        value={form.performanceNotes}
                                        onChange={(e) => setForm({ ...form, performanceNotes: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* KRA/KPI Redefinition */}
                        <div className="card-premium p-6">
                            <h2 className="text-lg font-black text-secondary-900 mb-4">
                                KRA/KPI Redefinition
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="label-premium">New Key Responsibility Areas (KRA)</label>
                                    <RichTextEditor
                                        value={form.newKRA}
                                        onChange={(value) => setForm({ ...form, newKRA: value })}
                                        placeholder="Define new responsibilities..."
                                    />
                                </div>

                                <div>
                                    <label className="label-premium">New Key Performance Indicators (KPI) - JSON Format</label>
                                    <textarea
                                        className="input-premium font-mono text-sm"
                                        rows={6}
                                        placeholder={'{\n  "projectsCompleted": 12,\n  "codeQuality": 95,\n  "teamLeadership": "Excellent"\n}'}
                                        value={form.newKPI}
                                        onChange={(e) => setForm({ ...form, newKPI: e.target.value })}
                                    />
                                    <p className="text-xs text-secondary-500 mt-1">
                                        Enter KPIs in JSON format. Leave empty if no changes.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="btn btn-outline"
                                disabled={saving}
                            >
                                <X size={20} />
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving || !form.employeeProfileId}
                            >
                                <Save size={20} />
                                {saving ? 'Creating...' : 'Create Draft'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
