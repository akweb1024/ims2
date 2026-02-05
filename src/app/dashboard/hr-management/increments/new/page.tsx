'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import RichTextEditor from '@/components/common/RichTextEditor';
import { DollarSign, TrendingUp, Save, X, User } from 'lucide-react';

function NewIncrementContent() {
    const router = useRouter();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
    const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

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
        monthlyTargets: {} as Record<string, number>, // Stores month-key (e.g., 'Apr', 'May') -> value (FIXED)
        monthlyVariableTargets: {} as Record<string, number>, // Stores month-key (e.g., 'Apr', 'May') -> value (VARIABLE)
        monthlyFixedSalaries: {} as Record<string, number>,
        monthlyVariableSalaries: {} as Record<string, number>
    });

    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

    const fetchEmployees = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const [empRes, tmplRes] = await Promise.all([
                fetch('/api/hr/employees', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/task-templates', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (empRes.ok) {
                const data = await empRes.json();
                setEmployees(data);
            }
            if (tmplRes.ok) {
                const data = await tmplRes.json();
                setTaskTemplates(data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }, []);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const handleEmployeeChange = (employeeId: string) => {
        const employee = employees.find(e => e.id === employeeId);

        const oldVariable = employee?.salaryVariable ?? employee?.variableSalary ?? 0;
        const oldIncentive = employee?.salaryIncentive ?? employee?.incentiveSalary ?? 0;
        const oldFixed = employee?.salaryFixed ?? employee?.fixedSalary ?? ((employee?.baseSalary || 0) - oldVariable - oldIncentive);

        setSelectedEmployee(employee);
        setForm({
            ...form,
            employeeProfileId: employeeId,
            newFixedSalary: oldFixed,
            newVariableSalary: oldVariable,
            newIncentive: oldIncentive,
            currentMonthlyTarget: employee?.monthlyTarget || 0,
            newMonthlyTarget: employee?.monthlyTarget || 0,
            currentYearlyTarget: employee?.yearlyTarget || 0,
            newYearlyTarget: employee?.yearlyTarget || 0,
            newDesignation: employee?.designation || '',
            newHealthCare: employee?.salaryStructure?.healthCare || 0,
            newTravelling: employee?.salaryStructure?.travelling || 0,
            newMobile: employee?.salaryStructure?.mobile || 0,
            newInternet: employee?.salaryStructure?.internet || 0,
            newBooksAndPeriodicals: employee?.salaryStructure?.booksAndPeriodicals || 0,
            newBaseTarget: employee?.baseTarget || 0,
            newVariableRate: employee?.variableRate || 0,
            newVariableUnit: employee?.variableUnit || 0,
            optInVariable: oldVariable > 0 || employee?.hasVariable || (employee?.variableRate > 0) || false,
            optInIncentive: oldIncentive > 0 || employee?.hasIncentive || false,
            monthlyFixTarget: employee?.monthlyFixTarget || 0,
            monthlyVariableTarget: employee?.monthlyVariableTarget || 0,
            monthlyTargets: employee?.monthlyTargets || {},
            monthlyVariableTargets: employee?.monthlyVariableTargets || {},
            monthlyFixedSalaries: employee?.monthlyFixedSalaries || {},
            monthlyVariableSalaries: employee?.monthlyVariableSalaries || {},
        });
    };

    const searchParams = useSearchParams();
    const urlEmployeeId = searchParams.get('employeeId');

    useEffect(() => {
        if (urlEmployeeId && employees.length > 0 && !selectedEmployee) {
            const employee = employees.find(e => e.id === urlEmployeeId);
            if (employee) {
                handleEmployeeChange(urlEmployeeId);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlEmployeeId, employees]);



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

    const totalNewSalary = form.newFixedSalary + form.newVariableSalary + form.newIncentive;
    const oldSalary = selectedEmployee?.baseSalary || 0;
    const incrementAmount = totalNewSalary - oldSalary;
    const incrementPercentage = oldSalary > 0 ? (incrementAmount / oldSalary) * 100 : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const token = localStorage.getItem('token');

            // Prepare KPI Data (Linked Templates)
            // If user selected templates, we store them in newKPI as JSON object
            const kpiData: any = {};
            if (selectedTemplates.length > 0) {
                const selectedDetails = taskTemplates
                    .filter(t => selectedTemplates.includes(t.id))
                    .map(t => ({ id: t.id, title: t.title, points: t.points, designation: t.designation?.name }));

                kpiData.linkedTaskTemplates = selectedDetails;
            }

            // Also keep text from textarea if needed? 
            // The constraint is "use Multi select there... save that in json newKPI"
            // So we replace the textarea logic entirely?
            // Or allow both? 
            // User said "link the KPI... so that we can save that in json newKPI".
            // I'll assume this replaces the manual JSON entry.

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
                                        title="Select Employee"
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
                                    <label htmlFor="effective-date" className="label-premium">Effective Date *</label>
                                    <input
                                        id="effective-date"
                                        type="date"
                                        required
                                        title="Effective Date"
                                        placeholder="YYYY-MM-DD"
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
                                        <p className="text-sm font-bold text-secondary-900 mb-2">Current Salary Breakdown:</p>
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

                        {/* New Salary Structure */}
                        <div className="card-premium p-6">
                            <h2 className="text-lg font-black text-secondary-900 mb-4 flex items-center gap-2">
                                <DollarSign className="text-success-500" size={20} />
                                New Salary Structure
                            </h2>

                            {/* CTC */}
                            <div className="mb-6">
                                <label className="label-premium">CTC *</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="any"
                                    title="New CTC"
                                    placeholder="0"
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
                                                            // Update average monthly fixed target for consistency
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
                                                            // Update average monthly variable target
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
                                        // Make readOnly to enforce sum? OR allow override? 
                                        // Usually auto-sum is better. I'll make it readOnly or just onChange handler that might get overwritten.
                                        // Let's keep it editable but overwritten by monthly inputs. 
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

                                    {[
                                        { label: 'Q1 (Apr-Jun)', key: 'q1Target', months: ['Apr', 'May', 'Jun'] },
                                        { label: 'Q2 (Jul-Sep)', key: 'q2Target', months: ['Jul', 'Aug', 'Sep'] },
                                        { label: 'Q3 (Oct-Dec)', key: 'q3Target', months: ['Oct', 'Nov', 'Dec'] },
                                        { label: 'Q4 (Jan-Mar)', key: 'q4Target', months: ['Jan', 'Feb', 'Mar'] }
                                    ].map((q) => {
                                        // Calc split for display
                                        const fixSum = q.months.reduce((acc, m) => acc + (form.monthlyTargets[m] || 0), 0);
                                        const varSum = q.months.reduce((acc, m) => acc + (form.monthlyVariableTargets[m] || 0), 0);

                                        return (
                                            <div key={q.key}>
                                                <label className="label-premium">{q.label}</label>
                                                <input
                                                    type="number"
                                                    className="input-premium font-bold text-indigo-700 bg-indigo-50/50"
                                                    placeholder="0"
                                                    value={form[q.key as keyof typeof form] as number} // Auto-calculated via useEffect
                                                    readOnly
                                                    title={`Fixed: ${fixSum} + Variable: ${varSum}`}
                                                />
                                                <div className="flex justify-between text-[10px] mt-1 px-1 text-secondary-500">
                                                    <span>Fix: <span className="font-semibold text-purple-600">{fixSum}</span></span>
                                                    <span>Var: <span className="font-semibold text-orange-600">{varSum}</span></span>
                                                </div>
                                            </div>
                                        );
                                    })}
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
                                    <label className="label-premium">Link Task Templates (KPIs)</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-4 bg-secondary-50/50 rounded-xl border border-secondary-100">
                                        {taskTemplates.length === 0 ? (
                                            <div className="text-sm text-secondary-400 p-2">No task templates found.</div>
                                        ) : (
                                            taskTemplates.map(tmpl => (
                                                <label key={tmpl.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-transparent hover:border-primary-100 shadow-sm cursor-pointer transition-all">
                                                    <input
                                                        type="checkbox"
                                                        className="mt-1 w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                                                        checked={selectedTemplates.includes(tmpl.id)}
                                                        onChange={(e) => {
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
                                            ))
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

export default function NewIncrementPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center font-bold text-secondary-400">Loading form...</div>}>
            <NewIncrementContent />
        </Suspense>
    );
}
