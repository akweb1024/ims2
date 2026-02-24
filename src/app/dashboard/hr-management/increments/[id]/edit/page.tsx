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
    const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
    const [designations, setDesignations] = useState<any[]>([]);
    const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
    const [manualTemplateChange, setManualTemplateChange] = useState(false);

    const [form, setForm] = useState({
        employeeProfileId: '',
        newFixedSalary: 0,
        newVariableSalary: 0,
        newVariablePerTarget: 0,
        newVariableUpperCap: 0,
        newIncentive: 0,
        newIncentivePercentage: 0,
        newDesignation: '',
        newDesignationId: '',
        previousDesignationId: '',
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
        q4Target: 0,
        newHealthCare: 0,
        newTravelling: 0,
        newMobile: 0,
        newInternet: 0,
        newBooksAndPeriodicals: 0,
        optInVariable: false,
        optInIncentive: false,
        newBaseTarget: 0,
        newVariableRate: 0,
        newVariableUnit: 0,
        monthlyFixTarget: 0,
        monthlyVariableTarget: 0,
        monthlyTargets: {} as Record<string, number>,
        monthlyVariableTargets: {} as Record<string, number>,
        monthlyFixedSalaries: {} as Record<string, number>,
        monthlyVariableSalaries: {} as Record<string, number>
    });

    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [increment, setIncrement] = useState<any>(null);

    const fetchIncrement = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const [res, tmplRes, desigRes] = await Promise.all([
                fetch(`/api/hr/increments/${params.id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/task-templates', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/designations', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (res.ok) {
                const data = await res.json();
                setIncrement(data);
                setSelectedEmployee(data.employeeProfile);

                setForm({
                    employeeProfileId: data.employeeProfileId,
                    newFixedSalary: data.newFixed ?? data.newFixedSalary ?? 0,
                    newVariableSalary: data.newVariable ?? data.newVariableSalary ?? 0,
                    newVariablePerTarget: data.newVariablePerTarget || 0,
                    newVariableUpperCap: data.newVariableUpperCap || 0,
                    newIncentive: data.newIncentive ?? data.newIncentiveSalary ?? 0,
                    newIncentivePercentage: data.newIncentivePercentage || 0,
                    newDesignation: data.newDesignation || '',
                    newDesignationId: data.newDesignationId || '',
                    previousDesignationId: data.previousDesignationId || '',
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
                    q4Target: data.q4Target || 0,
                    newHealthCare: data.newHealthCare || 0,
                    newTravelling: data.newTravelling || 0,
                    newMobile: data.newMobile || 0,
                    newInternet: data.newInternet || 0,
                    newBooksAndPeriodicals: data.newBooksAndPeriodicals || 0,
                    newBaseTarget: data.newBaseTarget || 0,
                    newVariableRate: data.newVariableRate || 0,
                    newVariableUnit: data.newVariableUnit || 0,
                    optInVariable: data.optInVariable || (data.newVariable > 0) || (data.newVariableSalary > 0) || (data.newVariableRate > 0) || false,
                    optInIncentive: data.optInIncentive || (data.newIncentive > 0) || false,
                    monthlyFixTarget: data.monthlyFixTarget || 0,
                    monthlyVariableTarget: data.monthlyVariableTarget || 0,
                    monthlyTargets: data.monthlyTargets || {},
                    monthlyVariableTargets: data.monthlyVariableTargets || {},
                    monthlyFixedSalaries: data.monthlyFixedSalaries || {},
                    monthlyVariableSalaries: data.monthlyVariableSalaries || {}
                });

                if (tmplRes.ok) {
                    const tmplData = await tmplRes.json();
                    setTaskTemplates(tmplData);

                    // Seed selected templates if exists in newKPI
                    if (data.newKPI?.linkedTaskTemplates) {
                        const ids = data.newKPI.linkedTaskTemplates.map((t: any) => t.id);
                        setSelectedTemplates(ids);
                        setManualTemplateChange(true); // Don't auto-override existing data
                    }
                }

                if (desigRes.ok) {
                    const desigData = await desigRes.json();
                    setDesignations(desigData);
                }
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

    // Auto-calculate Quarterly Targets when Monthly Targets change
    useEffect(() => {
        const getSum = (data: Record<string, number>, months: string[]) => {
            return months.reduce((acc, month) => acc + (data[month] || 0), 0);
        };

        const q1Months = ['Apr', 'May', 'Jun'];
        const q2Months = ['Jul', 'Aug', 'Sep'];
        const q3Months = ['Oct', 'Nov', 'Dec'];
        const q4Months = ['Jan', 'Feb', 'Mar'];

        const fixQ1 = getSum(form.monthlyTargets, q1Months);
        const varQ1 = getSum(form.monthlyVariableTargets, q1Months);
        const fixQ2 = getSum(form.monthlyTargets, q2Months);
        const varQ2 = getSum(form.monthlyVariableTargets, q2Months);
        const fixQ3 = getSum(form.monthlyTargets, q3Months);
        const varQ3 = getSum(form.monthlyVariableTargets, q3Months);
        const fixQ4 = getSum(form.monthlyTargets, q4Months);
        const varQ4 = getSum(form.monthlyVariableTargets, q4Months);

        setForm(prev => ({
            ...prev,
            q1Target: fixQ1 + varQ1,
            q2Target: fixQ2 + varQ2,
            q3Target: fixQ3 + varQ3,
            q4Target: fixQ4 + varQ4
        }));
    }, [form.monthlyTargets, form.monthlyVariableTargets]);

    // Auto-select tasks when designation changes (only if no manual changes yet)
    useEffect(() => {
        if (form.newDesignationId && taskTemplates.length > 0 && !manualTemplateChange) {
            const desigTemplates = taskTemplates.filter(t => {
                const matchSingular = t.designationId === form.newDesignationId;
                const matchPlural = Array.isArray(t.designationIds) && t.designationIds.includes(form.newDesignationId);
                return matchSingular || matchPlural;
            });
            const templateIds = desigTemplates.map(t => t.id);
            setSelectedTemplates(templateIds);
        }
    }, [form.newDesignationId, taskTemplates, manualTemplateChange]);

    const totalNewSalary = form.newFixedSalary + form.newVariableSalary + form.newIncentive;
    const oldSalary = increment?.oldSalary || 0;
    const incrementAmount = totalNewSalary - oldSalary;
    const incrementPercentage = oldSalary > 0 ? (incrementAmount / oldSalary) * 100 : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const token = localStorage.getItem('token');

            // Prepare KPI Data (Linked Templates)
            const kpiData: any = {};
            if (selectedTemplates.length > 0) {
                const selectedDetails = taskTemplates
                    .filter(t => selectedTemplates.includes(t.id))
                    .map(t => ({ id: t.id, title: t.title, points: t.points, designation: t.designation?.name }));

                kpiData.linkedTaskTemplates = selectedDetails;
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

                            {selectedEmployee && (() => {
                                const oldVar = selectedEmployee.salaryVariable ?? selectedEmployee.variableSalary ?? 0;
                                const oldInc = selectedEmployee.salaryIncentive ?? selectedEmployee.incentiveSalary ?? 0;
                                const oldFix = selectedEmployee.salaryFixed ?? selectedEmployee.fixedSalary ?? ((selectedEmployee.baseSalary || 0) - oldVar - oldInc);

                                return (
                                    <div className="mt-4 p-4 bg-secondary-50 rounded-xl">
                                        <p className="text-sm font-bold text-secondary-900 mb-2">Current (Old) Salary Breakdown:</p>
                                        <div className="grid grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <p className="text-secondary-500">Fixed</p>
                                                <p className="font-bold">₹{oldFix.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-secondary-500">Variable</p>
                                                <p className="font-bold">₹{oldVar.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-secondary-500">Incentive</p>
                                                <p className="font-bold">₹{oldInc.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-secondary-500">Total CTC</p>
                                                <p className="font-bold text-primary-600">₹{(selectedEmployee.baseSalary || 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* New CTC Structure */}
                        <div className="card-premium p-6">
                            <h2 className="text-lg font-black text-secondary-900 mb-4 flex items-center gap-2">
                                <DollarSign className="text-success-500" size={20} />
                                New CTC Structure
                            </h2>

                            {/* CTC Grid */}
                            <h4 className="text-sm font-black text-secondary-700 mb-3 flex items-center gap-2">
                                💸 Monthly CTC Breakdown
                            </h4>

                            {/* CTC */}
                            <div className="mb-6">
                                <label className="label-premium">CTC *</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="any"
                                    className="input-premium"
                                    value={form.newFixedSalary}
                                    onChange={(e) => setForm({ ...form, newFixedSalary: parseFloat(e.target.value) || 0 })}
                                />
                            </div>

                            {/* Variable Salary with Details */}
                            <div className={`mb-6 p-4 rounded-xl border transition-all ${form.optInVariable ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className={`font-bold ${form.optInVariable ? 'text-blue-900' : 'text-gray-500'}`}>Variable Salary Component</h3>
                                    <label className="flex items-center cursor-pointer gap-2">
                                        <input
                                            type="checkbox"
                                            className="toggle toggle-primary toggle-sm"
                                            checked={form.optInVariable}
                                            onChange={(e) => setForm({ ...form, optInVariable: e.target.checked, newVariableSalary: e.target.checked ? form.newVariableSalary : 0 })}
                                        />
                                        <span className="text-sm font-semibold text-secondary-700">Include Variable Pay</span>
                                    </label>
                                </div>

                                {form.optInVariable && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                            <div>
                                                <label className="label-premium">Variable Amount</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
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
                                                    step="any"
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
                                                    step="any"
                                                    className="input-premium"
                                                    placeholder="e.g., 50000 max"
                                                    value={form.newVariableUpperCap}
                                                    onChange={(e) => setForm({ ...form, newVariableUpperCap: parseFloat(e.target.value) || 0 })}
                                                />
                                                <p className="text-xs text-blue-600 mt-1">Maximum variable salary limit</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                            <div>
                                                <label className="label-premium">Variable Rate</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    className="input-premium"
                                                    placeholder="e.g. 5000"
                                                    value={form.newVariableRate}
                                                    onChange={(e) => setForm({ ...form, newVariableRate: parseFloat(e.target.value) || 0 })}
                                                />
                                                <p className="text-xs text-blue-600 mt-1">Amt/Rate per Unit</p>
                                            </div>

                                            <div>
                                                <label className="label-premium">Variable Unit</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    className="input-premium"
                                                    placeholder="e.g. 100000"
                                                    value={form.newVariableUnit}
                                                    onChange={(e) => setForm({ ...form, newVariableUnit: parseFloat(e.target.value) || 0 })}
                                                />
                                                <p className="text-xs text-blue-600 mt-1">Unit for Calculation</p>
                                            </div>

                                            <div>
                                                <label className="label-premium">Quota (Base Target)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    className="input-premium"
                                                    placeholder="e.g. 500000"
                                                    value={form.newBaseTarget}
                                                    onChange={(e) => setForm({ ...form, newBaseTarget: parseFloat(e.target.value) || 0 })}
                                                />
                                                <p className="text-xs text-blue-600 mt-1">Quota for CTC</p>
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
                                    </>
                                )}
                            </div>

                            {/* Incentive with Details */}
                            <div className={`p-4 rounded-xl border transition-all ${form.optInIncentive ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className={`font-bold ${form.optInIncentive ? 'text-purple-900' : 'text-gray-500'}`}>Incentive Component</h3>
                                    <label className="flex items-center cursor-pointer gap-2">
                                        <input
                                            type="checkbox"
                                            className="toggle toggle-secondary toggle-sm"
                                            checked={form.optInIncentive}
                                            onChange={(e) => setForm({ ...form, optInIncentive: e.target.checked, newIncentive: e.target.checked ? form.newIncentive : 0 })}
                                        />
                                        <span className="text-sm font-semibold text-secondary-700">Include Incentive</span>
                                    </label>
                                </div>

                                {form.optInIncentive && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="label-premium">Incentive Amount</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
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
                                    </>
                                )}
                            </div>

                            {/* Sec-10 Exemp / Perks */}
                            <div className="p-4 bg-success-50 rounded-xl border border-success-200 mt-6">
                                <h3 className="font-bold text-success-900 mb-3 uppercase tracking-wider text-xs flex items-center gap-2">
                                    <TrendingUp size={16} /> Sec-10 Exemp / Perks
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="form-control">
                                        <label className="label-premium">Health Care</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            className="input-premium"
                                            value={form.newHealthCare}
                                            onChange={(e) => setForm({ ...form, newHealthCare: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="form-control">
                                        <label className="label-premium">Travelling</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            className="input-premium"
                                            value={form.newTravelling}
                                            onChange={(e) => setForm({ ...form, newTravelling: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="form-control">
                                        <label className="label-premium">Mobile</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            className="input-premium"
                                            value={form.newMobile}
                                            onChange={(e) => setForm({ ...form, newMobile: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="form-control">
                                        <label className="label-premium">Internet</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            className="input-premium"
                                            value={form.newInternet}
                                            onChange={(e) => setForm({ ...form, newInternet: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="form-control">
                                        <label className="label-premium">Books & Periodicals</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            className="input-premium"
                                            value={form.newBooksAndPeriodicals}
                                            onChange={(e) => setForm({ ...form, newBooksAndPeriodicals: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="p-4 bg-success-600/10 rounded-2xl flex items-center justify-between border border-success-200 self-center">
                                        <span className="text-[10px] font-black text-success-700 uppercase tracking-widest leading-none">Total Perks</span>
                                        <span className="text-xl font-black text-success-800 leading-none">
                                            ₹{((form.newHealthCare || 0) + (form.newTravelling || 0) + (form.newMobile || 0) + (form.newInternet || 0) + (form.newBooksAndPeriodicals || 0)).toLocaleString()}
                                        </span>
                                    </div>
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
                            <p className="text-sm text-secondary-500 mb-4">
                                Define the revenue/sales targets to justify this increment.
                            </p>

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
                                <div className="space-y-4">
                                    <div>
                                        <label className="label-premium text-indigo-700">New Fixed Revenue Target (Retainer)</label>
                                        <input
                                            type="number"
                                            className="input-premium border-indigo-200 bg-indigo-50/30"
                                            placeholder="e.g. 200000"
                                            value={form.monthlyFixTarget}
                                            onChange={(e) => setForm({ ...form, monthlyFixTarget: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="label-premium text-blue-700">New Variable Revenue Target (Sales)</label>
                                        <input
                                            type="number"
                                            className="input-premium border-blue-200 bg-blue-50/30"
                                            placeholder="e.g. 100000"
                                            value={form.monthlyVariableTarget}
                                            onChange={(e) => setForm({ ...form, monthlyVariableTarget: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                                        <span className="text-sm font-bold text-gray-700">Total Monthly Target</span>
                                        <span className="text-xl font-black text-indigo-600">
                                            ₹{((form.monthlyFixTarget || 0) + (form.monthlyVariableTarget || 0)).toLocaleString()}
                                        </span>
                                    </div>
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
                                    <p className="text-lg font-black text-success-600">+₹{Math.max(0, ((form.monthlyFixTarget || 0) + (form.monthlyVariableTarget || 0)) - form.currentMonthlyTarget).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-secondary-500">Revenue Multiplier</p>
                                    <p className="text-lg font-black text-primary-600">
                                        {incrementAmount > 0 && (((form.monthlyFixTarget || 0) + (form.monthlyVariableTarget || 0)) - form.currentMonthlyTarget) > 0 ? ((((form.monthlyFixTarget || 0) + (form.monthlyVariableTarget || 0)) - form.currentMonthlyTarget) / (incrementAmount / 12)).toFixed(1) : '0'}x
                                    </p>
                                    <p className="text-[10px] text-secondary-400">Target Incr. / Cost Incr.</p>
                                </div>
                            </div>

                            {/* Monthly Breakdown (Revenue Target) */}
                            <div className="mt-8 space-y-6">
                                {/* FIXED Targets */}
                                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                    <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                                        📅 Monthly Fixed Revenue Targets (Retainer)
                                    </h3>

                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'].map((month) => (
                                            <div key={`fix-${month}`}>
                                                <label className="label-premium text-xs uppercase tracking-wide text-indigo-800">{month}</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="input-premium h-9 text-right"
                                                    placeholder="0"
                                                    value={form.monthlyTargets[month] || ''}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const updatedFixed = { ...form.monthlyTargets, [month]: val };

                                                        // Auto-calc yearly total (Fixed + Variable)
                                                        const sumFixed = Object.values(updatedFixed).reduce((a, b) => a + b, 0);
                                                        const sumVariable = Object.values(form.monthlyVariableTargets).reduce((a, b) => a + b, 0);

                                                        setForm({
                                                            ...form,
                                                            monthlyTargets: updatedFixed,
                                                            newYearlyTarget: sumFixed + sumVariable,
                                                            monthlyFixTarget: parseFloat((sumFixed / 12).toFixed(2))
                                                        });
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex justify-end items-center gap-3">
                                        <span className="text-sm font-bold text-indigo-600">Total Fixed:</span>
                                        <span className="text-xl font-black text-indigo-900">
                                            ₹{Object.values(form.monthlyTargets).reduce((a, b) => a + (b || 0), 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* VARIABLE Targets */}
                                <div className="p-4 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-100">
                                    <h3 className="font-bold text-teal-900 mb-4 flex items-center gap-2">
                                        📈 Monthly Variable Revenue Targets (Sales)
                                    </h3>

                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'].map((month) => (
                                            <div key={`var-${month}`}>
                                                <label className="label-premium text-xs uppercase tracking-wide text-teal-800">{month}</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="input-premium h-9 text-right border-teal-200 focus:ring-teal-500"
                                                    placeholder="0"
                                                    value={form.monthlyVariableTargets[month] || ''}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const updatedVar = { ...form.monthlyVariableTargets, [month]: val };

                                                        // Auto-calc yearly total (Fixed + Variable)
                                                        const sumFixed = Object.values(form.monthlyTargets).reduce((a, b) => a + b, 0);
                                                        const sumVariable = Object.values(updatedVar).reduce((a, b) => a + b, 0);

                                                        setForm({
                                                            ...form,
                                                            monthlyVariableTargets: updatedVar,
                                                            newYearlyTarget: sumFixed + sumVariable,
                                                            monthlyVariableTarget: parseFloat((sumVariable / 12).toFixed(2))
                                                        });
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex justify-end items-center gap-3">
                                        <span className="text-sm font-bold text-teal-600">Total Variable:</span>
                                        <span className="text-xl font-black text-teal-900">
                                            ₹{Object.values(form.monthlyVariableTargets).reduce((a, b) => a + (b || 0), 0).toLocaleString()}
                                        </span>
                                    </div>
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
                                    <label className="label-premium">New Yearly Target (Auto-Sum)</label>
                                    <input
                                        type="number"
                                        className="input-premium font-bold text-indigo-700"
                                        title="New Yearly Target"
                                        placeholder="0"
                                        value={form.newYearlyTarget}
                                        readOnly
                                        onChange={(e) => setForm({ ...form, newYearlyTarget: parseFloat(e.target.value) || 0 })}
                                    />
                                    <p className="text-xs text-secondary-400 mt-1">Calculated from monthly breakdown</p>
                                </div>
                            </div>

                            {/* Monthly Salary Breakdown */}
                            <div className="mt-8 space-y-6">
                                {/* FIXED SALARY Grid */}
                                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                                    <h3 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
                                        💸 Monthly Fixed Salary Breakdown
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'].map((month) => (
                                            <div key={`sal-fix-${month}`}>
                                                <label className="label-premium text-xs uppercase tracking-wide text-purple-800">{month}</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="input-premium h-9 text-right border-purple-200 focus:ring-purple-500"
                                                    placeholder="0"
                                                    value={form.monthlyFixedSalaries[month] || ''}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const updated = { ...form.monthlyFixedSalaries, [month]: val };

                                                        // Calc Average
                                                        const sum = Object.values(updated).reduce((a, b) => a + b, 0);
                                                        const avg = parseFloat((sum / 12).toFixed(2));

                                                        setForm({
                                                            ...form,
                                                            monthlyFixedSalaries: updated,
                                                            newFixedSalary: avg
                                                        });
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* VARIABLE SALARY Grid */}
                                <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                                    <h3 className="font-bold text-orange-900 mb-4 flex items-center gap-2">
                                        📊 Monthly Variable Salary Breakdown
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'].map((month) => (
                                            <div key={`sal-var-${month}`}>
                                                <label className="label-premium text-xs uppercase tracking-wide text-orange-800">{month}</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="input-premium h-9 text-right border-orange-200 focus:ring-orange-500"
                                                    placeholder="0"
                                                    value={form.monthlyVariableSalaries[month] || ''}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const updated = { ...form.monthlyVariableSalaries, [month]: val };

                                                        // Calc Average
                                                        const sum = Object.values(updated).reduce((a, b) => a + b, 0);
                                                        const avg = parseFloat((sum / 12).toFixed(2));

                                                        setForm({
                                                            ...form,
                                                            monthlyVariableSalaries: updated,
                                                            newVariableSalary: avg
                                                        });
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                <div>
                                    <label className="label-premium">New CTC (Avg/Monthly)</label>
                                    <input
                                        type="number"
                                        className="input-premium font-bold text-purple-700"
                                        value={form.newFixedSalary}
                                        readOnly
                                        title="Calculated Average from Monthly Grid"
                                    />
                                    <p className="text-xs text-secondary-400 mt-1">Calculated Average</p>
                                </div>
                                <div>
                                    <label className="label-premium">New Variable Salary (Avg/Monthly)</label>
                                    <input
                                        type="number"
                                        className="input-premium font-bold text-orange-700"
                                        value={form.newVariableSalary}
                                        readOnly
                                        title="Calculated Average from Monthly Grid"
                                    />
                                    <p className="text-xs text-secondary-400 mt-1">Calculated Average</p>
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
                                    <select
                                        className="input-premium"
                                        value={form.newDesignationId}
                                        onChange={(e) => {
                                            const desig = designations.find(d => d.id === e.target.value);
                                            setForm({ 
                                                ...form, 
                                                newDesignationId: e.target.value,
                                                newDesignation: desig?.name || ''
                                            });
                                            setManualTemplateChange(false); // Reset manual flag on designation change to trigger auto-select
                                        }}
                                    >
                                        <option value="">Select Designation</option>
                                        {designations.map(d => (
                                            <option key={d.id} value={d.id}>{d.name} {d.level ? `(Level ${d.level})` : ''}</option>
                                        ))}
                                    </select>
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
                                    <label className="label-premium">Link Task Templates (KPIs)</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-4 bg-secondary-50/50 rounded-xl border border-secondary-100">
                                        {taskTemplates.length === 0 ? (
                                            <div className="text-sm text-secondary-400 p-2">No task templates found.</div>
                                        ) : (
                                            taskTemplates
                                                .sort((a, b) => {
                                                    // Sort templates belonging to selected designation first
                                                    const aMatch = a.designationId === form.newDesignationId || (Array.isArray(a.designationIds) && a.designationIds.includes(form.newDesignationId));
                                                    const bMatch = b.designationId === form.newDesignationId || (Array.isArray(b.designationIds) && b.designationIds.includes(form.newDesignationId));
                                                    if (aMatch && !bMatch) return -1;
                                                    if (!aMatch && bMatch) return 1;
                                                    return 0;
                                                })
                                                .map(tmpl => {
                                                    const isMatch = tmpl.designationId === form.newDesignationId || (Array.isArray(tmpl.designationIds) && tmpl.designationIds.includes(form.newDesignationId));
                                                    return (
                                                        <label key={tmpl.id} className={`flex items-start gap-3 p-3 rounded-lg border shadow-sm cursor-pointer transition-all ${isMatch ? 'bg-primary-50/50 border-primary-200' : 'bg-white border-transparent hover:border-primary-100'}`}>
                                                    <input
                                                        type="checkbox"
                                                        className="mt-1 w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                                                        checked={selectedTemplates.includes(tmpl.id)}
                                                        onChange={(e) => {
                                                            setManualTemplateChange(true);
                                                            if (e.target.checked) {
                                                                setSelectedTemplates(prev => [...prev, tmpl.id]);
                                                            } else {
                                                                setSelectedTemplates(prev => prev.filter(id => id !== tmpl.id));
                                                            }
                                                        }}
                                                    />
                                                    <div>
                                                        <p className="font-bold text-sm text-secondary-900">{tmpl.title}</p>
                                                        <p className="text-xs text-secondary-500 line-clamp-2">{tmpl.description || 'No description'}</p>
                                                        <div className="flex gap-2 mt-1">
                                                            <span className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded text-[10px] font-bold uppercase">{tmpl.points} Pts</span>
                                                            {tmpl.designation?.name && <span className="px-2 py-0.5 bg-secondary-100 text-secondary-600 rounded text-[10px] font-bold uppercase">{tmpl.designation.name}</span>}
                                                        </div>
                                                    </div>
                                                        </label>
                                                    );
                                                })
                                        )}
                                    </div>
                                    <p className="text-xs text-secondary-500 mt-2">
                                        Selected templates will be assigned as performance indicators (KPIs) for this increment period.
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
