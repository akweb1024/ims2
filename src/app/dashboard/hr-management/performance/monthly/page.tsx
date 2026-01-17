'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { TrendingUp, Award, AlertCircle, Calendar, Play, Download, Filter } from 'lucide-react';

export default function MonthlyPerformancePage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [snapshots, setSnapshots] = useState<any[]>([]);

    const [filters, setFilters] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        departmentId: '',
        employeeId: ''
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
        fetchSnapshots();
    }, []);

    const fetchSnapshots = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            if (filters.month) params.append('month', filters.month.toString());
            if (filters.year) params.append('year', filters.year.toString());
            if (filters.departmentId) params.append('departmentId', filters.departmentId);
            if (filters.employeeId) params.append('employeeId', filters.employeeId);

            const res = await fetch(`/api/hr/performance/monthly?${params.toString()}`, {
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
    };

    const handleCalculate = async () => {
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

    const getTrendIcon = (trend: string) => {
        if (trend === 'IMPROVING') return '📈';
        if (trend === 'DECLINING') return '📉';
        return '➡️';
    };

    return (
        <DashboardLayout userRole={user?.role}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Monthly Performance Analytics</h1>
                        <p className="text-secondary-500">Comprehensive employee performance tracking and insights</p>
                    </div>
                    <button
                        onClick={handleCalculate}
                        disabled={calculating}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Play size={18} />
                        {calculating ? 'Calculating...' : 'Calculate Performance'}
                    </button>
                </div>

                {/* Filters */}
                <div className="card-premium p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter size={20} className="text-primary-600" />
                        <h3 className="font-bold text-lg">Filters</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

                {/* Summary Stats */}
                {snapshots.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="card-premium p-6 border-t-4 border-success-500">
                            <p className="text-xs font-bold text-secondary-400 uppercase mb-2">Top Performers</p>
                            <p className="text-3xl font-black text-success-600">
                                {snapshots.filter(s => s.isTopPerformer).length}
                            </p>
                        </div>
                        <div className="card-premium p-6 border-t-4 border-warning-500">
                            <p className="text-xs font-bold text-secondary-400 uppercase mb-2">Need Attention</p>
                            <p className="text-3xl font-black text-warning-600">
                                {snapshots.filter(s => s.needsAttention).length}
                            </p>
                        </div>
                        <div className="card-premium p-6 border-t-4 border-primary-500">
                            <p className="text-xs font-bold text-secondary-400 uppercase mb-2">Avg Score</p>
                            <p className="text-3xl font-black text-primary-600">
                                {(snapshots.reduce((sum, s) => sum + s.overallScore, 0) / snapshots.length).toFixed(1)}
                            </p>
                        </div>
                        <div className="card-premium p-6 border-t-4 border-indigo-500">
                            <p className="text-xs font-bold text-secondary-400 uppercase mb-2">Total Employees</p>
                            <p className="text-3xl font-black text-indigo-600">{snapshots.length}</p>
                        </div>
                    </div>
                )}

                {/* Performance List */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    </div>
                ) : snapshots.length === 0 ? (
                    <div className="card-premium p-12 text-center">
                        <Calendar size={48} className="mx-auto text-secondary-300 mb-4" />
                        <h3 className="text-xl font-bold text-secondary-900 mb-2">No Performance Data</h3>
                        <p className="text-secondary-500 mb-4">
                            Click "Calculate Performance" to generate monthly analytics
                        </p>
                    </div>
                ) : (
                    <div className="card-premium overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead className="bg-secondary-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase">Employee</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase">Department</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase">Score</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase">Grade</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase">Attendance</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase">Points</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase">Reports</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase">Trend</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100">
                                    {snapshots.map(snapshot => (
                                        <tr key={snapshot.id} className="hover:bg-secondary-50">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-bold text-secondary-900">{snapshot.employee.user.name || snapshot.employee.user.email}</p>
                                                    <p className="text-xs text-secondary-500">{snapshot.employee.user.role}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-secondary-700">{snapshot.department?.name || '-'}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="text-2xl font-black text-primary-600">{snapshot.overallScore.toFixed(1)}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-sm font-black ${getGradeColor(snapshot.performanceGrade)}`}>
                                                    {snapshot.performanceGrade}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="text-sm font-bold text-secondary-900">{snapshot.attendanceScore.toFixed(0)}%</div>
                                                <div className="text-xs text-secondary-500">{snapshot.daysPresent}/{snapshot.totalWorkingDays} days</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Award size={16} className="text-warning-500" />
                                                    <span className="font-bold text-secondary-900">{snapshot.totalPointsEarned}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="text-sm font-bold text-secondary-900">{snapshot.reportSubmissionRate.toFixed(0)}%</div>
                                                <div className="text-xs text-secondary-500">{snapshot.reportsSubmitted}/{snapshot.reportsExpected}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className="text-xl">{getTrendIcon(snapshot.trend)}</span>
                                                    <span className="text-xs font-bold text-secondary-600">{snapshot.trend}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {snapshot.isTopPerformer && (
                                                    <span className="badge bg-success-100 text-success-700 text-xs">⭐ Top</span>
                                                )}
                                                {snapshot.needsAttention && (
                                                    <span className="badge bg-warning-100 text-warning-700 text-xs flex items-center gap-1">
                                                        <AlertCircle size={12} /> Alert
                                                    </span>
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
