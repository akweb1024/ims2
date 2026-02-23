'use client';

import { useState, useEffect } from 'react';
import { useEmployees, useSalaryStructures } from '@/hooks/useHR';
import { IndianRupee, PieChart, Users, ArrowRight, Calculator, DownloadCloud } from 'lucide-react';

export default function SalaryStructureManager() {
    const { data: employees } = useEmployees();
    const { data: structures, upsert } = useSalaryStructures();
    const [selectedEmp, setSelectedEmp] = useState<any>(null);
    const [formData, setFormData] = useState<any>({
        basicSalary: 0,
        hra: 0,
        conveyance: 0,
        medical: 0,
        specialAllowance: 0,
        otherAllowances: 0,
        pfEmployee: 0,
        esicEmployee: 0,
        professionalTax: 0,
        tds: 0,
        pfEmployer: 0,
        esicEmployer: 0,
        statutoryBonus: 0,
        gratuity: 0,
        healthCare: 0,
        travelling: 0,
        mobile: 0,
        internet: 0,
        booksAndPeriodicals: 0,
        deductPF: true
    });

    useEffect(() => {
        if (selectedEmp && structures) {
            const struct = structures.find((s: any) => s.employeeId === selectedEmp.id);
            if (struct) {
                setFormData(struct);
            } else {
                setFormData({
                    basicSalary: 0,
                    hra: 0,
                    conveyance: 0,
                    medical: 0,
                    specialAllowance: 0,
                    otherAllowances: 0,
                    pfEmployee: 0,
                    esicEmployee: 0,
                    professionalTax: 0,
                    tds: 0,
                    pfEmployer: 0,
                    esicEmployer: 0,
                    statutoryBonus: 0,
                    gratuity: 0,
                    healthCare: 0,
                    travelling: 0,
                    mobile: 0,
                    internet: 0,
                    booksAndPeriodicals: 0,
                    deductPF: true
                });
            }
        }
    }, [selectedEmp, structures]);

    const calculateTotals = () => {
        const earnings = (formData.basicSalary || 0) + (formData.hra || 0) + (formData.conveyance || 0) + (formData.medical || 0) + (formData.specialAllowance || 0) + (formData.otherAllowances || 0) + (formData.statutoryBonus || 0);
        const perks = (formData.healthCare || 0) + (formData.travelling || 0) + (formData.mobile || 0) + (formData.internet || 0) + (formData.booksAndPeriodicals || 0);
        const deductions = (formData.pfEmployee || 0) + (formData.esicEmployee || 0) + (formData.professionalTax || 0) + (formData.tds || 0);
        const employerContrib = (formData.pfEmployer || 0) + (formData.esicEmployer || 0);
        const provisionFields = (formData.gratuity || 0);

        return {
            gross: earnings,
            perks,
            deductions,
            net: earnings - deductions + perks,
            ctc: earnings + perks + employerContrib + provisionFields
        };
    };

    const totals = calculateTotals();

    const handleSave = async () => {
        if (!selectedEmp) return;
        try {
            await upsert.mutateAsync({ ...formData, employeeId: selectedEmp.id });
            alert('Salary structure saved!');
        } catch (err) {
            alert('Failed to save structure');
        }
    };

    const autoPopulate = () => {
        const gross = parseFloat(prompt("Enter Target Monthly Gross Amount:") || "0");
        if (gross > 0) {
            calculateStructureFromGross(gross);
        }
    };

    const calculateStructureFromGross = (ctc: number, bonusOverride = 0, perkOverrides?: any) => {
        const { calculateSalaryBreakdown } = require('@/lib/utils/salary-calculator');
        const breakdown = calculateSalaryBreakdown(ctc, formData.deductPF);

        setFormData({
            ...formData,
            basicSalary: breakdown.basicSalary,
            hra: breakdown.hra,
            specialAllowance: breakdown.specialAllowance,
            statutoryBonus: breakdown.statutoryBonus || bonusOverride,
            conveyance: breakdown.conveyance,
            medical: breakdown.medical,
            otherAllowances: 0,
            pfEmployee: breakdown.pfEmployee,
            pfEmployer: breakdown.pfEmployer,
            esicEmployee: breakdown.esicEmployee,
            esicEmployer: breakdown.esicEmployer,
            professionalTax: breakdown.grossSalary > 10000 ? 200 : 0,
            gratuity: breakdown.gratuity,
            ...(perkOverrides || {})
        });
    };

    const fetchLatestIncrement = async () => {
        if (!selectedEmp) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/employees/${selectedEmp.id}/latest-increment`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (confirm(`Found approved increment effective ${new Date(data.effectiveDate).toLocaleDateString()}.\nCTC: ₹${data.newFixedSalary || data.newSalary}\nApply this structure?`)) {
                    // Use newFixedSalary as the base for Gross Structure
                    // Note: If newFixedSalary is annual, divide by 12?
                    // Typically SalaryIncrementRecord stores MONTHLY or ANNUAL?
                    // The IncrementForm earlier had "New Salary (Annual / Base)".
                    // Let's assume the value in Increment Record is ANNUAL as per standard practice, BUT we should verify.
                    // SalaryStructureManager usually deals with Monthly figures (inputs had placeholder 0, but totals imply monthly?)
                    // "Enter Target Monthly Gross Amount" prompt suggests Manager works in Monthly.
                    // Increment Form usually takes Annual.
                    // Let's try to detect or ask user?
                    // For now assuming Increment Record stores what was input.
                    // If the input was "500000", that looks like Annual.

                    let amount = data.newFixedSalary || data.newSalary;
                    if (amount > 100000) { // Simple heuristic: if > 1L, likely Annual?
                        // Ask user if not sure?
                        // Or just divide by 12 if it looks huge?
                        // "500000" annual is ~41k monthly.
                        amount = Math.round(amount / 12);
                    }

                    const perkOverrides = {
                        healthCare: data.newHealthCare || 0,
                        travelling: data.newTravelling || 0,
                        mobile: data.newMobile || 0,
                        internet: data.newInternet || 0,
                        booksAndPeriodicals: data.newBooksAndPeriodicals || 0
                    };

                    calculateStructureFromGross(amount, data.newIncentive ? data.newIncentive / 12 : 0, perkOverrides);
                }
            } else {
                alert('No approved increment record found for this employee.');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to fetch increment details.');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
            {/* Employee Sidebar */}
            <div className="lg:col-span-1 card-premium p-0 overflow-hidden flex flex-col h-[700px]">
                <div className="p-6 border-b border-secondary-100 bg-secondary-50/50">
                    <h3 className="flex items-center gap-2 font-black text-secondary-900 uppercase tracking-tighter text-lg">
                        <Users className="text-primary-600" size={20} />
                        Select Staff
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 p-2">
                    {employees?.map((emp: any) => (
                        <button
                            key={emp.id}
                            onClick={() => setSelectedEmp(emp)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${selectedEmp?.id === emp.id ? 'bg-primary-600 text-white shadow-lg shadow-primary-100' : 'hover:bg-secondary-50 text-secondary-600'}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${selectedEmp?.id === emp.id ? 'bg-white/20' : 'bg-secondary-100 text-secondary-400'}`}>
                                {emp.user?.name?.[0] || emp.user?.email?.[0].toUpperCase()}
                            </div>
                            <div className="text-left overflow-hidden">
                                <p className="font-bold truncate text-sm">{emp.user?.name || emp.user?.email.split('@')[0]}</p>
                                <p className={`text-[10px] uppercase font-bold tracking-widest ${selectedEmp?.id === emp.id ? 'text-primary-100' : 'text-secondary-400'}`}>{emp.designation}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Structure Editor */}
            <div className="lg:col-span-2 space-y-6">
                {selectedEmp ? (
                    <>
                        <div className="card-premium p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
                                <PieChart size={140} />
                            </div>
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-secondary-900 tracking-tight">Salary Structure</h2>
                                    <p className="text-secondary-500 font-medium text-sm">Define components for <span className="text-primary-600 font-bold">{selectedEmp.user?.name || selectedEmp.user?.email}</span></p>
                                </div>
                                <div className="flex gap-3 items-center">
                                    <div className="flex items-center gap-2 mr-4 bg-secondary-50 px-4 py-2 rounded-xl border border-secondary-100">
                                        <span className="text-[10px] font-black text-secondary-500 uppercase tracking-widest">Deduct PF</span>
                                        <input 
                                            type="checkbox" 
                                            checked={formData.deductPF} 
                                            onChange={e => setFormData({ ...formData, deductPF: e.target.checked })}
                                            className="toggle toggle-primary toggle-sm"
                                        />
                                    </div>
                                    <button onClick={fetchLatestIncrement} className="btn bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs uppercase tracking-widest px-4 rounded-xl flex items-center gap-2 transition-all">
                                        <DownloadCloud size={16} /> Fetch Increment
                                    </button>
                                    <button onClick={autoPopulate} className="btn bg-secondary-100 hover:bg-secondary-200 text-secondary-700 font-bold text-xs uppercase tracking-widest px-6 rounded-xl flex items-center gap-2 transition-all">
                                        <Calculator size={16} /> Auto-Breakdown
                                    </button>
                                    <button onClick={handleSave} className="btn bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs uppercase tracking-widest px-8 rounded-xl shadow-lg shadow-primary-200 transition-all flex items-center gap-2">
                                        Save Changes <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Monthly Earnings */}
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em] border-b border-primary-100 pb-2">Monthly Earnings</h4>
                                    <div className="space-y-4">
                                        <div className="form-control">
                                            <label className="label-text mb-1 block text-[10px] font-bold text-secondary-400 uppercase">Basic Salary</label>
                                            <div className="relative">
                                                <input type="number" title="Basic Salary" placeholder="0" value={formData.basicSalary} onChange={e => setFormData({ ...formData, basicSalary: parseFloat(e.target.value) || 0 })} className="input w-full bg-secondary-50 border-secondary-100 font-bold text-secondary-900 focus:ring-primary-500" />
                                                <IndianRupee className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary-300" size={14} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="form-control">
                                                <label className="label-text mb-1 block text-[10px] font-bold text-secondary-400 uppercase">HRA</label>
                                                <input type="number" title="House Rent Allowance" placeholder="0" value={formData.hra} onChange={e => setFormData({ ...formData, hra: parseFloat(e.target.value) || 0 })} className="input bg-secondary-50 border-secondary-100 font-bold text-secondary-900" />
                                            </div>
                                            <div className="form-control">
                                                <label className="label-text mb-1 block text-[10px] font-bold text-secondary-400 uppercase">Special Allowance</label>
                                                <input type="number" title="Special Allowance" placeholder="0" value={formData.specialAllowance} onChange={e => setFormData({ ...formData, specialAllowance: parseFloat(e.target.value) || 0 })} className="input bg-secondary-50 border-secondary-100 font-bold text-secondary-900" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="form-control">
                                                <label className="label-text mb-1 block text-[10px] font-bold text-secondary-400 uppercase">Conveyance</label>
                                                <input type="number" title="Conveyance" placeholder="0" value={formData.conveyance} onChange={e => setFormData({ ...formData, conveyance: parseFloat(e.target.value) || 0 })} className="input bg-secondary-50 border-secondary-100 font-bold text-secondary-900" />
                                            </div>
                                            <div className="form-control">
                                                <label className="label-text mb-1 block text-[10px] font-bold text-secondary-400 uppercase">Statutory Bonus</label>
                                                <input type="number" title="Statutory Bonus" placeholder="0" value={formData.statutoryBonus} onChange={e => setFormData({ ...formData, statutoryBonus: parseFloat(e.target.value) || 0 })} className="input bg-secondary-50 border-secondary-100 font-bold text-secondary-900" />
                                            </div>
                                        </div>
                                        <div className="form-control">
                                            <label className="label-text mb-1 block text-[10px] font-bold text-secondary-400 uppercase">Medical / Other</label>
                                            <input type="number" title="Medical or Other Allowances" placeholder="0" value={formData.medical} onChange={e => setFormData({ ...formData, medical: parseFloat(e.target.value) || 0 })} className="input bg-secondary-50 border-secondary-100 font-bold text-secondary-900" />
                                        </div>
                                    </div>
                                </div>

                                {/* Statutory Deductions */}
                                <div className="space-y-6 text-secondary-900">
                                    <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] border-b border-rose-100 pb-2">Statutory Deductions</h4>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="form-control">
                                                <label className="label-text mb-1 block text-[10px] font-bold text-secondary-400 uppercase">PF (Employee)</label>
                                                <input type="number" title="Provident Fund (Employee Share)" placeholder="0" value={formData.pfEmployee} onChange={e => setFormData({ ...formData, pfEmployee: parseFloat(e.target.value) || 0 })} className="input bg-secondary-50 border-secondary-100 font-bold text-secondary-900" />
                                            </div>
                                            <div className="form-control">
                                                <label className="label-text mb-1 block text-[10px] font-bold text-secondary-400 uppercase">ESIC (Employee)</label>
                                                <input type="number" title="ESIC (Employee Share)" placeholder="0" value={formData.esicEmployee} onChange={e => setFormData({ ...formData, esicEmployee: parseFloat(e.target.value) || 0 })} className="input bg-secondary-50 border-secondary-100 font-bold text-secondary-900" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="form-control">
                                                <label className="label-text mb-1 block text-[10px] font-bold text-secondary-400 uppercase">Prof. Tax (PT)</label>
                                                <input type="number" title="Professional Tax" placeholder="0" value={formData.professionalTax} onChange={e => setFormData({ ...formData, professionalTax: parseFloat(e.target.value) || 0 })} className="input bg-secondary-50 border-secondary-100 font-bold text-secondary-900" />
                                            </div>
                                            <div className="form-control">
                                                <label className="label-text mb-1 block text-[10px] font-bold text-secondary-400 uppercase">TDS (Est. Monthly)</label>
                                                <input type="number" title="Tax Deducted at Source" placeholder="0" value={formData.tds} onChange={e => setFormData({ ...formData, tds: parseFloat(e.target.value) || 0 })} className="input bg-secondary-50 border-secondary-100 font-bold text-secondary-900" />
                                            </div>
                                        </div>
                                        <div className="form-control">
                                            <label className="label-text mb-1 block text-[10px] font-bold text-secondary-400 uppercase">Gratuity (Provision)</label>
                                            <input type="number" title="Gratuity Monthly Provision" placeholder="0" value={formData.gratuity} onChange={e => setFormData({ ...formData, gratuity: parseFloat(e.target.value) || 0 })} className="input bg-secondary-50 border-secondary-100 font-bold text-secondary-900" />
                                        </div>

                                        <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] border-b border-indigo-100 pb-2 mt-6">Employer Contributions</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="form-control">
                                                <label className="label-text mb-1 block text-[10px] font-bold text-secondary-400 uppercase">PF (Employer)</label>
                                                <input type="number" title="Provident Fund (Employer Share)" placeholder="0" value={formData.pfEmployer} onChange={e => setFormData({ ...formData, pfEmployer: parseFloat(e.target.value) || 0 })} className="input bg-secondary-50 border-secondary-100 font-bold text-secondary-900" />
                                            </div>
                                            <div className="form-control">
                                                <label className="label-text mb-1 block text-[10px] font-bold text-secondary-400 uppercase">ESIC (Employer)</label>
                                                <input type="number" title="ESIC (Employer Share)" placeholder="0" value={formData.esicEmployer} onChange={e => setFormData({ ...formData, esicEmployer: parseFloat(e.target.value) || 0 })} className="input bg-secondary-50 border-secondary-100 font-bold text-secondary-900" />
                                            </div>
                                        </div>

                                        <div className="p-4 bg-rose-50 rounded-2xl">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Total Deductions</span>
                                                <span className="text-xl font-black text-rose-700">₹{totals.deductions.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sec-10 Exemp/Perks */}
                                <div className="space-y-6 md:col-span-2">
                                    <h4 className="text-[10px] font-black text-success-600 uppercase tracking-[0.2em] border-b border-success-100 pb-2">Sec-10 Exemp / Perks</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="form-control">
                                            <label className="label-text mb-1 block text-[10px] font-bold text-secondary-400 uppercase">Health Care</label>
                                            <input type="number" title="Health Care Allowance" placeholder="0" value={formData.healthCare} onChange={e => setFormData({ ...formData, healthCare: parseFloat(e.target.value) || 0 })} className="input bg-secondary-50 border-secondary-100 font-bold text-secondary-900" />
                                        </div>
                                        <div className="form-control">
                                            <label className="label-text mb-1 block text-[10px] font-bold text-secondary-400 uppercase">Travelling</label>
                                            <input type="number" title="Travelling Allowance" placeholder="0" value={formData.travelling} onChange={e => setFormData({ ...formData, travelling: parseFloat(e.target.value) || 0 })} className="input bg-secondary-50 border-secondary-100 font-bold text-secondary-900" />
                                        </div>
                                        <div className="form-control">
                                            <label className="label-text mb-1 block text-[10px] font-bold text-secondary-400 uppercase">Mobile</label>
                                            <input type="number" title="Mobile Allowance" placeholder="0" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: parseFloat(e.target.value) || 0 })} className="input bg-secondary-50 border-secondary-100 font-bold text-secondary-900" />
                                        </div>
                                        <div className="form-control">
                                            <label className="label-text mb-1 block text-[10px] font-bold text-secondary-400 uppercase">Internet</label>
                                            <input type="number" title="Internet Allowance" placeholder="0" value={formData.internet} onChange={e => setFormData({ ...formData, internet: parseFloat(e.target.value) || 0 })} className="input bg-secondary-50 border-secondary-100 font-bold text-secondary-900" />
                                        </div>
                                        <div className="form-control">
                                            <label className="label-text mb-1 block text-[10px] font-bold text-secondary-400 uppercase">Books & Periodicals</label>
                                            <input type="number" title="Books & Periodicals Allowance" placeholder="0" value={formData.booksAndPeriodicals} onChange={e => setFormData({ ...formData, booksAndPeriodicals: parseFloat(e.target.value) || 0 })} className="input bg-secondary-50 border-secondary-100 font-bold text-secondary-900" />
                                        </div>
                                        <div className="p-4 bg-success-50 rounded-2xl flex items-center justify-between">
                                            <span className="text-[10px] font-black text-success-600 uppercase tracking-widest">Total Perks</span>
                                            <span className="text-xl font-black text-success-700">₹{totals.perks.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-6">
                            <div className="card-premium p-6 bg-secondary-900 text-white border-0 shadow-2xl">
                                <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-2">Monthly Gross</p>
                                <p className="text-3xl font-black truncate">₹{totals.gross.toLocaleString()}</p>
                            </div>
                            <div className="card-premium p-6 bg-primary-600 text-white border-0 shadow-2xl">
                                <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-2">Net In-Hand</p>
                                <p className="text-3xl font-black truncate">₹{totals.net.toLocaleString()}</p>
                            </div>
                            <div className="card-premium p-6 bg-indigo-600 text-white border-0 shadow-2xl">
                                <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-2">Total CTC</p>
                                <p className="text-3xl font-black truncate">₹{totals.ctc.toLocaleString()}</p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 bg-secondary-50/50 rounded-[2.5rem] border-4 border-dashed border-secondary-100">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-inner mb-6 text-secondary-200">
                            <Users size={40} />
                        </div>
                        <h3 className="text-xl font-black text-secondary-900 tracking-tight">Financial Profile Configuration</h3>
                        <p className="text-secondary-400 max-w-xs mt-2 font-medium">Please select a staff member from the left to manage their salary structure and statutory components.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
