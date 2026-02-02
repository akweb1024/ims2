'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { TrendingUp, Award, AlertCircle, Calendar, Play, Download, Filter, Target, BarChart } from 'lucide-react';

export default function PerformanceDashboard() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [snapshots, setSnapshots] = useState<any[]>([]);

    const [viewMode, setViewMode] = useState<'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');

    const [filters, setFilters] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        quarter: Math.ceil((new Date().getMonth() + 1) / 3),
        departmentId: '',
        employeeId: ''
    });

    const fetchSnapshots = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();

            // Common Filters
            if (filters.year) params.append('year', filters.year.toString());
            if (filters.departmentId) params.append('departmentId', filters.departmentId);
            if (filters.employeeId) params.append('employeeId', filters.employeeId);

            let endpoint = '';

            if (viewMode === 'MONTHLY') {
                endpoint = '/api/hr/performance/monthly';
                if (filters.month) params.append('month', filters.month.toString());
            } else {
                endpoint = '/api/hr/performance/aggregate';
                params.append('period', viewMode);
                if (viewMode === 'QUARTERLY' && filters.quarter) {
                    params.append('quarter', filters.quarter.toString());
                }
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
    }, [viewMode, filters]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
        fetchSnapshots();
    }, [fetchSnapshots]);

    const handleCalculate = async () => {
        if (viewMode !== 'MONTHLY') {
            alert('Calculation can only be triggered for Monthly view. Aggregates are computed automatically.');
            return;
        }

        if (!confirm(`Calculate performance for ${filters.month}/${filters.year} for all employees?`)) return;

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
                    month: filters.month,
                    year: filters.year
                })
            });

            if (res.ok) {
                alert('Performance calculated successfully!');
                fetchSnapshots();
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (error) {
            console.error('Error calculating performance:', error);
            alert('Failed to calculate performance');
        } finally {
            setCalculating(false);
        }
    };

    const getGradeColor = (grade: string) => {
        if (grade?.startsWith('A')) return 'text-success-600 bg-success-50';
        if (grade?.startsWith('B')) return 'text-primary-600 bg-primary-50';
        if (grade?.startsWith('C')) return 'text-warning-600 bg-warning-50';
        return 'text-danger-600 bg-danger-50';
    };

    const getAchievementColor = (percentage: number) => {
        if (percentage >= 100) return 'text-success-600';
        if (percentage >= 80) return 'text-primary-600';
        if (percentage >= 50) return 'text-warning-600';
        return 'text-danger-600';
    };

    return (
        <DashboardLayout userRole={user?.role}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Performance Validation</h1>
                        <p className="text-secondary-500">Validate actual performance against targets (Monthly / Quarterly / Yearly)</p>
                    </div>
                    {viewMode === 'MONTHLY' && (
                        <button
                            onClick={handleCalculate}
                            disabled={calculating}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <Play size={18} />
                            {calculating ? 'Calculating...' : 'Calculate Performance'}
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-secondary-200">
                    {['MONTHLY', 'QUARTERLY', 'YEARLY'].map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode as any)}
                            className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 ${viewMode === mode
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-secondary-500 hover:text-secondary-700'
                                }`}
                        >
                            {mode.charAt(0) + mode.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="card-premium p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter size={20} className="text-primary-600" />
                        <h3 className="font-bold text-lg">Filters ({viewMode})</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {viewMode === 'MONTHLY' && (
                            <div>
                                <label className="label">Month</label>
                                <select
                                    className="input"
                                    value={filters.month}
                                    onChange={e => setFilters({ ...filters, month: parseInt(e.target.value) })}
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>
                                            {new Date(2024, m - 1).toLocaleString('default', { month: 'long' })}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {viewMode === 'QUARTERLY' && (
                            <div>
                                <label className="label">Quarter</label>
                                <select
                                    className="input"
                                    value={filters.quarter}
                                    onChange={e => setFilters({ ...filters, quarter: parseInt(e.target.value) })}
                                >
                                    <option value={1}>Q1 (Jan - Mar)</option>
                                    <option value={2}>Q2 (Apr - Jun)</option>
                                    <option value={3}>Q3 (Jul - Sep)</option>
                                    <option value={4}>Q4 (Oct - Dec)</option>
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="label">Year</label>
                            <select
                                className="input"
                                value={filters.year}
                                onChange={e => setFilters({ ...filters, year: parseInt(e.target.value) })}
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2 flex items-end gap-2">
                            <button
                                onClick={fetchSnapshots}
                                className="btn btn-secondary flex-1"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Performance List */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    </div>
                ) : snapshots.length === 0 ? (
                    <div className="card-premium p-12 text-center">
                        <Calendar size={48} className="mx-auto text-secondary-300 mb-4" />
                        <h3 className="text-xl font-bold text-secondary-900 mb-2">No Data Found</h3>
                        <p className="text-secondary-500 mb-4">
                            {viewMode === 'MONTHLY'
                                ? 'Click "Calculate Performance" to generate data.'
                                : 'No aggregated data found for this period.'}
                        </p>
                    </div>
                ) : (
                    <div className="card-premium overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead className="bg-secondary-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase">Employee</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase">
                                            {viewMode === 'MONTHLY' ? 'Month' : viewMode === 'QUARTERLY' ? 'Quarter' : 'Year'}
                                        </th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase">Revenue Target</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase">Revenue Actual</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase">Achievement</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase">Score / Grade</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase">Trend</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100">
                                    {snapshots.map((snapshot, index) => (
                                        <tr key={snapshot.id || index} className="hover:bg-secondary-50">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-bold text-secondary-900">{snapshot.employee.user.name || snapshot.employee.user.email}</p>
                                                    <p className="text-xs text-secondary-500">{snapshot.employee.user.role}</p>
                                                    <p className="text-xs text-secondary-400">{snapshot.department?.name}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-semibold text-secondary-700">
                                                {viewMode === 'MONTHLY' && new Date(snapshot.year, snapshot.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
                                                {viewMode === 'QUARTERLY' && `Q${snapshot.quarter} ${snapshot.year}`}
                                                {viewMode === 'YEARLY' && snapshot.year}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="text-sm font-bold text-secondary-500">₹{(snapshot.revenueTarget || 0).toLocaleString()}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="text-sm font-bold text-secondary-900">₹{snapshot.totalRevenueGenerated.toLocaleString()}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className={`text-lg font-black ${getAchievementColor(snapshot.revenueAchievement)}`}>
                                                    {snapshot.revenueAchievement.toFixed(1)}%
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-xl font-black text-secondary-900">{snapshot.overallScore.toFixed(1)}</span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${getGradeColor(snapshot.performanceGrade)}`}>
                                                        {snapshot.performanceGrade}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {viewMode === 'MONTHLY' && snapshot.trend && (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <span>{snapshot.trend === 'IMPROVING' ? '📈' : snapshot.trend === 'DECLINING' ? '📉' : '➡️'}</span>
                                                        <span className="text-xs text-secondary-500">{snapshot.trend}</span>
                                                    </div>
                                                )}
                                                {viewMode !== 'MONTHLY' && (
                                                    <span className="text-xs text-secondary-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
