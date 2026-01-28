'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import RichTextEditor from '@/components/common/RichTextEditor';
import { DollarSign, TrendingUp, Save, X, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EditIncrementPage() {
    const params = useParams();
    const router = useRouter();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        employeeProfileId: '',
        newFixedSalary: 0,
        newVariableSalary: 0,
        newVariablePerTarget: 0,
        newVariableUpperCap: 0,
        newIncentive: 0,
        newIncentivePercentage: 0,
        newDesignation: '',
        reason: '',
        performanceNotes: '',
        newKRA: '',
        newKPI: '',
        variableDefinition: '',
        incentiveDefinition: '',
        currentMonthlyTarget: 0,
        newMonthlyTarget: 0,
        currentYearlyTarget: 0,
        newYearlyTarget: 0,
        effectiveDate: new Date().toISOString().split('T')[0],
        fiscalYear: '',
        q1Target: 0,
        q2Target: 0,
        q3Target: 0,
        q4Target: 0
    });

    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [increment, setIncrement] = useState<any>(null);

    const fetchIncrement = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/increments/${params.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setIncrement(data);
                setSelectedEmployee(data.employeeProfile);

                setForm({
                    employeeProfileId: data.employeeProfileId,
                    newFixedSalary: data.newFixedSalary || 0,
                    newVariableSalary: data.newVariableSalary || 0,
                    newVariablePerTarget: data.newVariablePerTarget || 0,
                    newVariableUpperCap: data.newVariableUpperCap || 0,
                    newIncentive: data.newIncentive || 0,
                    newIncentivePercentage: data.newIncentivePercentage || 0,
                    newDesignation: data.newDesignation || '',
                    reason: data.reason || '',
                    performanceNotes: data.performanceNotes || '',
                    newKRA: data.newKRA || '',
                    newKPI: data.newKPI ? JSON.stringify(data.newKPI, null, 2) : '',
                    variableDefinition: data.variableDefinition || '',
                    incentiveDefinition: data.incentiveDefinition || '',
                    currentMonthlyTarget: data.currentMonthlyTarget || 0,
                    newMonthlyTarget: data.newMonthlyTarget || 0,
                    currentYearlyTarget: data.currentYearlyTarget || 0,
                    newYearlyTarget: data.newYearlyTarget || 0,
                    effectiveDate: data.effectiveDate ? new Date(data.effectiveDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    fiscalYear: data.fiscalYear || '',
                    q1Target: data.q1Target || 0,
                    q2Target: data.q2Target || 0,
                    q3Target: data.q3Target || 0,
                    q4Target: data.q4Target || 0
                });
            } else {
                alert('Increment not found');
                router.push('/dashboard/hr-management/increments');
            }
        } catch (error) {
            console.error('Error fetching increment:', error);
        } finally {
            setLoading(false);
        }
    }, [params.id, router]);

    useEffect(() => {
        fetchIncrement();
    }, [fetchIncrement]);

    const totalNewSalary = form.newFixedSalary + form.newVariableSalary + form.newIncentive;
    const oldSalary = increment?.oldSalary || 0;
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

            const res = await fetch(`/api/hr/increments/${params.id}`, {
                method: 'PATCH',
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
                alert('Increment updated successfully!');
                router.push(`/dashboard/hr-management/increments/${params.id}`);
            } else {
                const error = await res.json();
                alert(`Error: ${error.error || 'Failed to update increment'}`);
            }
        } catch (error) {
            console.error('Error updating increment:', error);
            alert('An error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-secondary-600 mt-4">Loading increment...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-6">
                        <Link
                            href={`/dashboard/hr-management/increments/${params.id}`}
                            className="text-primary-600 hover:text-primary-700 font-bold flex items-center gap-2 mb-2"
                        >
                            <ArrowLeft size={20} />
                            Back to Increment Details
                        </Link>
                        <h1 className="text-3xl font-black text-secondary-900">
                            Edit Salary Increment
                        </h1>
                        <p className="text-secondary-600 mt-1">
                            Modify increment details (only drafts can be edited)
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Employee Info */}
                        <div className="card-premium p-6">
                            <h2 className="text-lg font-black text-secondary-900 mb-4 flex items-center gap-2">
                                <User className="text-primary-500" size={20} />
                                Employee Information
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label-premium">Employee</label>
                                    <input
                                        type="text"
                                        disabled
                                        className="input-premium bg-secondary-50 opacity-60 cursor-not-allowed"
                                        value={selectedEmployee?.user?.name || selectedEmployee?.user?.email || 'Unknown Employee'}
                                    />
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

                            {/* Fixed Salary */}
                            <div className="mb-6">
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

                            {/* Variable Salary with Details */}
                            <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                                <h3 className="font-bold text-blue-900 mb-3">Variable Salary Component</h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label className="label-premium">Variable Amount</label>
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
                                        <label className="label-premium">Per Target Amount</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="100"
                                            className="input-premium"
                                            placeholder="e.g., 5000 per target"
                                            value={form.newVariablePerTarget}
                                            onChange={(e) => setForm({ ...form, newVariablePerTarget: parseFloat(e.target.value) || 0 })}
                                        />
                                        <p className="text-xs text-blue-600 mt-1">Fixed amount earned per target achieved</p>
                                    </div>

                                    <div>
                                        <label className="label-premium">Upper Cap</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="100"
                                            className="input-premium"
                                            placeholder="e.g., 50000 max"
                                            value={form.newVariableUpperCap}
                                            onChange={(e) => setForm({ ...form, newVariableUpperCap: parseFloat(e.target.value) || 0 })}
                                        />
                                        <p className="text-xs text-blue-600 mt-1">Maximum variable salary limit</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="label-premium">Variable Salary Definition</label>
                                    <RichTextEditor
                                        value={form.variableDefinition}
                                        onChange={(value) => setForm({ ...form, variableDefinition: value })}
                                        placeholder="Define how variable salary is calculated, targets, and conditions..."
                                    />
                                    <p className="text-xs text-blue-600 mt-1">
                                        Example: &quot;₹{form.newVariablePerTarget || 0} per target achieved, maximum ₹{form.newVariableUpperCap || 0}&quot;
                                    </p>
                                </div>
                            </div>

                            {/* Incentive with Details */}
                            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                                <h3 className="font-bold text-purple-900 mb-3">Incentive Component</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="label-premium">Incentive Amount</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="100"
                                            className="input-premium"
                                            value={form.newIncentive}
                                            onChange={(e) => setForm({ ...form, newIncentive: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>

                                    <div>
                                        <label className="label-premium">Incentive Percentage (%)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            className="input-premium"
                                            placeholder="e.g., 10% after cap"
                                            value={form.newIncentivePercentage}
                                            onChange={(e) => setForm({ ...form, newIncentivePercentage: parseFloat(e.target.value) || 0 })}
                                        />
                                        <p className="text-xs text-purple-600 mt-1">% earned after reaching variable upper cap</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="label-premium">Incentive Definition</label>
                                    <RichTextEditor
                                        value={form.incentiveDefinition}
                                        onChange={(value) => setForm({ ...form, incentiveDefinition: value })}
                                        placeholder="Define how incentive is calculated, conditions, and when it applies..."
                                    />
                                    <p className="text-xs text-purple-600 mt-1">
                                        Example: &quot;{form.newIncentivePercentage || 0}% of additional earnings after reaching variable cap of ₹{form.newVariableUpperCap || 0}&quot;
                                    </p>
                                </div>
                            </div>

                            {/* Increment Summary */}
                            <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-success-50 rounded-xl border border-primary-200">
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

                        {/* Target & ROI Analysis */}
                        <div className="card-premium p-6 border-l-4 border-indigo-500">
                            <h2 className="text-lg font-black text-secondary-900 mb-4 flex items-center gap-2">
                                <TrendingUp className="text-indigo-500" size={20} />
                                Revenue Target & ROI Analysis
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="label-premium">Current Monthly Target</label>
                                    <input
                                        type="number"
                                        className="input-premium"
                                        value={form.currentMonthlyTarget}
                                        onChange={(e) => setForm({ ...form, currentMonthlyTarget: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="label-premium">New Monthly Target (Proposed)</label>
                                    <input
                                        type="number"
                                        className="input-premium"
                                        value={form.newMonthlyTarget}
                                        onChange={(e) => setForm({ ...form, newMonthlyTarget: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            {/* ROI Stats */}
                            <div className="mt-6 p-4 bg-indigo-50 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase text-secondary-500">Cost Increase (Monthly)</p>
                                    <p className="text-lg font-black text-danger-600">+₹{Math.round(incrementAmount / 12).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-secondary-500">Target Increase (Monthly)</p>
                                    <p className="text-lg font-black text-success-600">+₹{Math.max(0, form.newMonthlyTarget - form.currentMonthlyTarget).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-secondary-500">Revenue Multiplier</p>
                                    <p className="text-lg font-black text-primary-600">
                                        {incrementAmount > 0 && (form.newMonthlyTarget - form.currentMonthlyTarget) > 0 ? ((form.newMonthlyTarget - form.currentMonthlyTarget) / (incrementAmount / 12)).toFixed(1) : '0'}x
                                    </p>
                                    <p className="text-[10px] text-secondary-400">Target Incr. / Cost Incr.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                <div>
                                    <label className="label-premium">Current Yearly Target</label>
                                    <input
                                        type="number"
                                        className="input-premium bg-secondary-50"
                                        readOnly
                                        title="Current Yearly Target"
                                        value={form.currentYearlyTarget}
                                    />
                                </div>
                                <div>
                                    <label className="label-premium">New Yearly Target (Proposed)</label>
                                    <input
                                        type="number"
                                        className="input-premium"
                                        title="New Yearly Target"
                                        placeholder="0"
                                        value={form.newYearlyTarget}
                                        onChange={(e) => setForm({ ...form, newYearlyTarget: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            {/* Fiscal Year & Quarterly Targets */}
                            <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                                <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                                    📅 Fiscal Year & Quarterly Breakdown
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div>
                                        <label className="label-premium">Fiscal Year</label>
                                        <select
                                            className="input-premium"
                                            value={form.fiscalYear}
                                            onChange={(e) => setForm({ ...form, fiscalYear: e.target.value })}
                                        >
                                            <option value="">Select FY</option>
                                            {(() => {
                                                const currentYear = new Date().getFullYear();
                                                const startYear = 2022;
                                                const endYear = currentYear + 5;
                                                const years = [];
                                                for (let year = startYear; year <= endYear; year++) {
                                                    const fy = `${String(year).slice(-2)}-${String(year + 1).slice(-2)}`;
                                                    years.push(
                                                        <option key={fy} value={fy}>
                                                            FY {year}-{String(year + 1).slice(-2)}
                                                        </option>
                                                    );
                                                }
                                                return years;
                                            })()}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="label-premium">Q1 Target (Apr-Jun)</label>
                                        <input
                                            type="number"
                                            className="input-premium"
                                            placeholder="Q1"
                                            value={form.q1Target}
                                            onChange={(e) => setForm({ ...form, q1Target: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>

                                    <div>
                                        <label className="label-premium">Q2 Target (Jul-Sep)</label>
                                        <input
                                            type="number"
                                            className="input-premium"
                                            placeholder="Q2"
                                            value={form.q2Target}
                                            onChange={(e) => setForm({ ...form, q2Target: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>

                                    <div>
                                        <label className="label-premium">Q3 Target (Oct-Dec)</label>
                                        <input
                                            type="number"
                                            className="input-premium"
                                            placeholder="Q3"
                                            value={form.q3Target}
                                            onChange={(e) => setForm({ ...form, q3Target: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>

                                    <div>
                                        <label className="label-premium">Q4 Target (Jan-Mar)</label>
                                        <input
                                            type="number"
                                            className="input-premium"
                                            placeholder="Q4"
                                            value={form.q4Target}
                                            onChange={(e) => setForm({ ...form, q4Target: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>

                                <div className="mt-4 p-3 bg-white/60 rounded-lg">
                                    <p className="text-xs font-bold text-indigo-700 uppercase mb-1">Total Quarterly Targets</p>
                                    <p className="text-2xl font-black text-indigo-900">₹{(form.q1Target + form.q2Target + form.q3Target + form.q4Target).toLocaleString()}</p>
                                    {(form.q1Target + form.q2Target + form.q3Target + form.q4Target) !== form.newYearlyTarget && form.newYearlyTarget > 0 && (
                                        <p className="text-xs text-orange-600 mt-1">⚠️ Quarterly sum doesn&apos;t match yearly target</p>
                                    )}
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
                            <Link
                                href={`/dashboard/hr-management/increments/${params.id}`}
                                className="btn btn-outline"
                            >
                                <X size={20} />
                                Cancel
                            </Link>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving}
                            >
                                <Save size={20} />
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
