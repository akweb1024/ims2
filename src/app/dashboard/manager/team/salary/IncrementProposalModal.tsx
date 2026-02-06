'use client';

import { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, FileText, CheckCircle, Calculator, TrendingUp, Award, Zap } from 'lucide-react';
import { proposeIncrement, getEmployeePerformance } from './actions';

interface IncrementProposalModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: {
        userId: string;
        userName: string | null;
        employeeProfile: {
            id: string; // The database ID we added
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
    const [performance, setPerformance] = useState<any>(null);
    const [formData, setFormData] = useState({
        newSalary: '',
        effectiveDate: '',
        reason: '',
    });

    // Reset form and fetch performance when employee changes
    useEffect(() => {
        if (employee && employee.employeeProfile) {
            setFormData(prev => ({
                ...prev,
                newSalary: (employee.employeeProfile?.baseSalary || 0).toString(),
            }));

            // Fetch performance data
            const fetchPerformance = async () => {
                const res = await getEmployeePerformance(employee.employeeProfile!.id);
                if (res.success) {
                    setPerformance(res.performance);
                }
            };
            fetchPerformance();
        }
    }, [employee]);

    if (!isOpen || !employee || !employee.employeeProfile) return null;

    const currentSalary = employee.employeeProfile.baseSalary || 0;
    const newSalaryNum = parseFloat(formData.newSalary) || 0;
    const incrementAmount = newSalaryNum - currentSalary;
    const percentage = currentSalary > 0 ? ((incrementAmount / currentSalary) * 100) : 0;

    const applyRecommendation = () => {
        if (performance?.suggestedPercentage !== undefined) {
            const suggestedSalary = Math.round(currentSalary * (1 + performance.suggestedPercentage / 100));
            setFormData(prev => ({
                ...prev,
                newSalary: suggestedSalary.toString(),
                reason: `Performance-based recommendation: ${performance.recommendation}`
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await proposeIncrement({
                employeeId: employee.employeeProfile!.id,
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
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Propose Increment</h2>
                        <p className="text-xs text-gray-500">{employee.userName} • {employee.employeeProfile.designation}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[85vh]">

                    {/* Performance Insights Section */}
                    {performance && (
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-blue-100 shadow-sm">
                            <h3 className="text-xs font-bold text-indigo-800 uppercase mb-3 flex items-center gap-1.5">
                                <Award className="h-3.5 w-3.5" />
                                Performance Insight
                            </h3>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <div className="bg-white/60 rounded-lg p-2.5 border border-indigo-100">
                                    <p className="text-[10px] text-indigo-600 font-medium uppercase leading-none mb-1">Goal Achievement</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="bg-indigo-500 h-full rounded-full"
                                                style={{ width: `${Math.min(performance.avgAchievement, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-bold text-indigo-900">{Math.round(performance.avgAchievement)}%</span>
                                    </div>
                                </div>
                                <div className="bg-white/60 rounded-lg p-2.5 border border-indigo-100">
                                    <p className="text-[10px] text-indigo-600 font-medium uppercase leading-none mb-1">Avg. Eval Score</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-sm font-bold text-indigo-900">{performance.avgEvaluation.toFixed(1)}</span>
                                        <span className="text-[10px] text-gray-400">/ 10</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-indigo-100">
                                <div className="bg-indigo-100 p-2 rounded-lg">
                                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-indigo-900">{performance.recommendation}</p>
                                    <button
                                        type="button"
                                        onClick={applyRecommendation}
                                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-1 group"
                                    >
                                        <Zap className="h-3 w-3 fill-indigo-600 group-hover:scale-110 transition-transform" />
                                        Auto-apply recommended {performance.suggestedPercentage}%
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Comparison Card */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-gray-200 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-slate-500 font-semibold uppercase">Current Salary</p>
                            <p className="text-lg font-bold text-slate-900">₹{currentSalary.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500 font-semibold uppercase">Proposed Salary</p>
                            <p className="text-lg font-bold text-slate-900">₹{newSalaryNum.toLocaleString()}</p>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                            <span className="text-xs font-medium text-slate-600">Total Increment</span>
                            <span className={`text-sm font-bold ${incrementAmount >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center gap-1`}>
                                {incrementAmount >= 0 ? <TrendingUp className="h-4 w-4" /> : null}
                                ₹{incrementAmount.toLocaleString()} ({percentage.toFixed(1)}%)
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
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-shadow"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[80px]"
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
                            className="flex-1 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4" />
                                    Propose Increment
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
