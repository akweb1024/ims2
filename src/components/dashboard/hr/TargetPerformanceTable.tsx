'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, Calendar, Target, TrendingUp, Save, ChevronRight, ChevronDown } from 'lucide-react';
import { FormattedNumber } from '@/components/common/FormattedNumber';
import PerformanceVsTargetChart from '@/components/dashboard/hr/PerformanceVsTargetChart';

interface TargetPerformanceTableProps {
    employeeId: string;
    monthlyTarget: number;
    yearlyTarget: number;
    onUpdateTargets: () => void;
}

export default function TargetPerformanceTable({ employeeId, monthlyTarget, yearlyTarget, onUpdateTargets }: TargetPerformanceTableProps) {
    const [viewMode, setViewMode] = useState<'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
    const [snapshots, setSnapshots] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [year, setYear] = useState(new Date().getFullYear());

    // Target Editing State
    const [isEditingTargets, setIsEditingTargets] = useState(false);
    const [targetForm, setTargetForm] = useState({
        monthlyTarget: monthlyTarget || 0,
        yearlyTarget: yearlyTarget || 0
    });

    useEffect(() => {
        setTargetForm({
            monthlyTarget: monthlyTarget || 0,
            yearlyTarget: yearlyTarget || 0
        });
    }, [monthlyTarget, yearlyTarget]);

    const fetchSnapshots = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            params.append('employeeId', employeeId);
            params.append('year', year.toString());

            let endpoint = '';
            if (viewMode === 'MONTHLY') {
                endpoint = '/api/hr/performance/monthly';
            } else {
                endpoint = '/api/hr/performance/aggregate';
                params.append('period', viewMode);
            }

            const res = await fetch(`${endpoint}?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setSnapshots(data);
            }
        } catch (error) {
            console.error('Error fetching snapshots:', error);
        } finally {
            setLoading(false);
        }
    }, [employeeId, viewMode, year]);

    useEffect(() => {
        if (employeeId) {
            fetchSnapshots();
        }
    }, [fetchSnapshots, employeeId]);

    const handleCalculate = async (month: number) => {
        setCalculating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/performance/monthly', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    month,
                    year,
                    employeeId
                })
            });

            if (res.ok) {
                fetchSnapshots();
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (error) {
            console.error('Error calculating performance:', error);
        } finally {
            setCalculating(false);
        }
    };

    const handleSaveTargets = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/employees', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: employeeId,
                    monthlyTarget: parseFloat(targetForm.monthlyTarget.toString()),
                    yearlyTarget: parseFloat(targetForm.yearlyTarget.toString())
                })
            });

            if (res.ok) {
                setIsEditingTargets(false);
                onUpdateTargets(); // Refresh parent to show new values
                alert('Targets updated successfully!');
            } else {
                alert('Failed to update targets');
            }
        } catch (error) {
            console.error('Error updating targets:', error);
        }
    };

    const getAchievementColor = (percentage: number) => {
        if (percentage >= 100) return 'text-success-600 bg-success-50';
        if (percentage >= 80) return 'text-primary-600 bg-primary-50';
        if (percentage >= 50) return 'text-warning-600 bg-warning-50';
        return 'text-danger-600 bg-danger-50';
    };

    return (
        <div className="space-y-6">
            {/* Target Management Card */}
            <div className="card-premium p-6 border-l-4 border-indigo-500 bg-indigo-50/30">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-bold text-lg text-secondary-900 flex items-center gap-2">
                            <Target className="text-indigo-600" size={20} />
                            Revenue Targets
                        </h3>
                        <p className="text-secondary-500 text-sm">Define base targets for performance validation.</p>
                    </div>
                    {!isEditingTargets ? (
                        <button
                            onClick={() => setIsEditingTargets(true)}
                            className="btn btn-secondary text-xs"
                        >
                            Edit Targets
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsEditingTargets(false)}
                                className="btn btn-secondary text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveTargets}
                                className="btn btn-primary text-xs flex items-center gap-1"
                            >
                                <Save size={14} /> Save
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs font-bold text-secondary-500 uppercase mb-1 block">Monthly Target</label>
                        {isEditingTargets ? (
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 font-bold">₹</span>
                                <input
                                    type="number"
                                    className="input pl-8 font-bold text-lg"
                                    value={targetForm.monthlyTarget}
                                    onChange={e => setTargetForm({ ...targetForm, monthlyTarget: parseFloat(e.target.value) })}
                                />
                            </div>
                        ) : (
                            <div className="text-2xl font-black text-secondary-900">
                                ₹<FormattedNumber value={monthlyTarget} />
                            </div>
                        )}
                        <p className="text-[10px] text-secondary-400 mt-1">Base quota for monthly validation</p>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-secondary-500 uppercase mb-1 block">Yearly Target</label>
                        {isEditingTargets ? (
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 font-bold">₹</span>
                                <input
                                    type="number"
                                    className="input pl-8 font-bold text-lg"
                                    value={targetForm.yearlyTarget}
                                    onChange={e => setTargetForm({ ...targetForm, yearlyTarget: parseFloat(e.target.value) })}
                                />
                            </div>
                        ) : (
                            <div className="text-2xl font-black text-secondary-900">
                                ₹<FormattedNumber value={yearlyTarget} />
                            </div>
                        )}
                        <p className="text-[10px] text-secondary-400 mt-1">Cumulative annual goal</p>
                    </div>
                </div>
            </div>

            {/* Performance Table */}
            <div className="space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="flex bg-secondary-100 p-1 rounded-lg">
                        {['MONTHLY', 'QUARTERLY', 'YEARLY'].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode as any)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === mode
                                    ? 'bg-white text-primary-700 shadow-sm'
                                    : 'text-secondary-500 hover:text-secondary-700'
                                    }`}
                            >
                                {mode.charAt(0) + mode.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            className="input-premium py-1 text-sm w-32"
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                        >
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Performance Chart */}
                {snapshots.length > 0 && (
                    <PerformanceVsTargetChart data={snapshots} scope="INDIVIDUAL" />
                )}

                <div className="card-premium overflow-hidden p-0">
                    {loading ? (
                        <div className="p-12 text-center text-secondary-400">Loading performance data...</div>
                    ) : snapshots.length === 0 ? (
                        <div className="p-12 text-center">
                            <TrendingUp size={48} className="mx-auto text-secondary-200 mb-4" />
                            <h3 className="font-bold text-secondary-900">No Data Available</h3>
                            <p className="text-secondary-500 text-sm mb-4">No performance snapshots found for this period.</p>
                            {viewMode === 'MONTHLY' && (
                                <button className="btn btn-outline text-xs" onClick={() => handleCalculate(new Date().getMonth() + 1)}>
                                    Calculate Current Month
                                </button>
                            )}
                        </div>
                    ) : (
                        <table className="table w-full">
                            <thead className="bg-secondary-50 text-xs text-secondary-500 uppercase font-bold sticky top-0">
                                <tr>
                                    <th className="px-6 py-4 text-left">Period</th>
                                    <th className="px-6 py-4 text-right">Target</th>
                                    <th className="px-6 py-4 text-right">Actual Revenue</th>
                                    <th className="px-6 py-4 text-center">Achievement</th>
                                    <th className="px-6 py-4 text-center">Grade</th>
                                    {viewMode === 'MONTHLY' && <th className="px-6 py-4 text-center">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {snapshots.map((snap: any, index: number) => (
                                    <tr key={index} className="hover:bg-secondary-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-secondary-900 text-sm">
                                                {viewMode === 'MONTHLY' && new Date(year, snap.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                                                {viewMode === 'QUARTERLY' && `Q${snap.quarter} ${snap.year}`}
                                                {viewMode === 'YEARLY' && snap.year}
                                            </div>
                                            {viewMode === 'MONTHLY' && (
                                                <div className="text-[10px] text-secondary-400 flex items-center gap-1">
                                                    Working Days: {snap.daysPresent} / {snap.totalWorkingDays}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-secondary-600 text-sm">
                                            ₹<FormattedNumber value={snap.revenueTarget} />
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-secondary-900 text-sm">
                                            ₹<FormattedNumber value={snap.totalRevenueGenerated} />
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-black ${getAchievementColor(snap.revenueAchievement)}`}>
                                                {snap.revenueAchievement?.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="font-black text-secondary-900">{snap.performanceGrade}</div>
                                            <div className="text-[10px] text-secondary-400">{snap.overallScore?.toFixed(1)} pts</div>
                                        </td>
                                        {viewMode === 'MONTHLY' && (
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    className="p-1 hover:bg-secondary-200 rounded text-secondary-500"
                                                    title="Recalculate"
                                                    disabled={calculating}
                                                    onClick={() => handleCalculate(snap.month)}
                                                >
                                                    <Play size={14} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
