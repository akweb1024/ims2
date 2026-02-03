'use client';

import { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, FileText, CheckCircle, Calculator } from 'lucide-react';
import { proposeIncrement } from './actions';

interface IncrementProposalModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: {
        userId: string;
        userName: string | null;
        employeeProfile: {
            employeeId: string | null;
            baseSalary: number | null;
            designation: string | null;
        } | null;
    } | null;
}

export default function IncrementProposalModal({
    isOpen,
    onClose,
    employee,
}: IncrementProposalModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        newSalary: '',
        effectiveDate: '',
        reason: '',
    });

    // Reset form when employee changes
    useEffect(() => {
        if (employee && employee.employeeProfile?.baseSalary) {
            setFormData(prev => ({
                ...prev,
                newSalary: (employee.employeeProfile?.baseSalary || 0).toString(),
            }));
        }
    }, [employee]);

    if (!isOpen || !employee || !employee.employeeProfile) return null;

    const currentSalary = employee.employeeProfile.baseSalary || 0;
    const newSalaryNum = parseFloat(formData.newSalary) || 0;
    const incrementAmount = newSalaryNum - currentSalary;
    const percentage = currentSalary > 0 ? ((incrementAmount / currentSalary) * 100) : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await proposeIncrement({
                // employeeProfile.employeeId is the human readable ID (EMP001).
                // API needs the hidden database ID of EmployeeProfile usually, or we pass user ID and find it.
                // Let's verify `actions.ts`. It uses `employeeProfileId: data.employeeId`.
                // So I need to pass the EmployeeProfile database ID.
                // The current `getUnifiedSalaries` returns `employeeProfile` object but might not include the DB ID.
                // Let's check `team-service.ts`.
                // It selects: `employeeId: true` (which is string ID), `baseSalary`, etc.
                // It does NOT select `id` of EmployeeProfile.
                // effectively `employeeProfile` in `getUnifiedSalaries` is a partial object.
                // I need to update `team-service.ts` to include `id` in `employeeProfile`.

                // Temporarily assuming I will fix team-service.ts to include `id`.
                employeeId: (employee.employeeProfile as any).id,

                currentSalary,
                newSalary: newSalaryNum,
                incrementAmount,
                percentage,
                effectiveDate: formData.effectiveDate,
                reason: formData.reason,
            });

            if (res.success) {
                onClose();
                setFormData({ newSalary: '', effectiveDate: '', reason: '' });
            } else {
                alert('Failed to propose increment');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Propose Increment</h2>
                        <p className="text-xs text-gray-500">{employee.userName} • {employee.employeeProfile.designation}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    {/* Comparison Card */}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-blue-600 font-semibold uppercase">Current Salary</p>
                            <p className="text-lg font-bold text-blue-900">₹{currentSalary.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-blue-600 font-semibold uppercase">New Salary</p>
                            <p className="text-lg font-bold text-blue-900">₹{newSalaryNum.toLocaleString()}</p>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-blue-100 flex justify-between items-center">
                            <span className="text-xs font-medium text-blue-700">Change</span>
                            <span className={`text-sm font-bold ${incrementAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {incrementAmount >= 0 ? '+' : ''}₹{incrementAmount.toLocaleString()} ({percentage.toFixed(1)}%)
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Base Salary</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    type="number"
                                    required
                                    value={formData.newSalary}
                                    onChange={(e) => setFormData({ ...formData, newSalary: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    type="date"
                                    required
                                    value={formData.effectiveDate}
                                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Justification</label>
                            <textarea
                                required
                                rows={3}
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                placeholder="Performance based increment..."
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                            {loading ? 'Submitting...' : 'Propose Increment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
