'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { TrendingUp, Users, Building, Calendar, Filter, DollarSign, Target, Award } from 'lucide-react';
import { FormattedNumber } from '@/components/common/FormattedNumber';
import PerformanceVsTargetChart from '@/components/dashboard/hr/PerformanceVsTargetChart';

export default function PerformanceAnalyticsPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [analyticsData, setAnalyticsData] = useState<any>(null);

    const [filters, setFilters] = useState({
        scope: 'TEAM' as 'TEAM' | 'COMPANY',
        year: new Date().getFullYear()
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            // Default to COMPANY for Admins
            if (['SUPER_ADMIN', 'ADMIN'].includes(parsedUser.role)) {
                setFilters(prev => ({ ...prev, scope: 'COMPANY' }));
            }
        }
    }, []);

    const fetchAnalytics = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            params.append('scope', filters.scope);
            params.append('year', filters.year.toString());

            const res = await fetch(`/api/hr/performance/analytics?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setAnalyticsData(data);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    }, [filters, user]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

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
                        <h1 className="text-3xl font-black text-secondary-900">Performance Analytics</h1>
                        <p className="text-secondary-500">Analyze revenue performance trends across the organization.</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="card-premium p-4 md:p-6 flex flex-wrap gap-6 items-end">
                    <div>
                        <label className="label mb-2 block">Analysis Scope</label>
                        <div className="flex bg-secondary-100 p-1 rounded-lg">
                            {['TEAM', 'COMPANY'].map((scope) => (
                                <button
                                    key={scope}
                                    onClick={() => setFilters({ ...filters, scope: scope as any })}
                                    disabled={scope === 'COMPANY' && !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user?.role)}
                                    className={`px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${filters.scope === scope
                                        ? 'bg-white text-primary-700 shadow-sm'
                                        : 'text-secondary-500 hover:text-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed'
                                        }`}
                                >
                                    {scope === 'TEAM' ? <Users size={14} /> : <Building size={14} />}
                                    {scope}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="label mb-2 block">Fiscal Year</label>
                        <select
                            className="input-premium py-2 w-32"
                            value={filters.year}
                            onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
                        >
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    </div>
                ) : analyticsData && analyticsData.summary ? (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="card-premium p-6 border-l-4 border-indigo-500">
                                <p className="text-secondary-500 text-xs font-bold uppercase mb-1">Total Target</p>
                                <h3 className="text-2xl font-black text-indigo-900">
                                    ₹<FormattedNumber value={analyticsData.summary.totalTarget} compact />
                                </h3>
                                <p className="text-xs text-secondary-400 mt-1">Annual Goal</p>
                            </div>
                            <div className="card-premium p-6 border-l-4 border-blue-500">
                                <p className="text-secondary-500 text-xs font-bold uppercase mb-1">Total Revenue</p>
                                <h3 className="text-2xl font-black text-blue-900">
                                    ₹<FormattedNumber value={analyticsData.summary.totalRevenue} compact />
                                </h3>
                                <p className="text-xs text-secondary-400 mt-1">Generated so far</p>
                            </div>
                            <div className="card-premium p-6 border-l-4 border-emerald-500">
                                <p className="text-secondary-500 text-xs font-bold uppercase mb-1">Achievement</p>
                                <h3 className={`text-2xl font-black ${getAchievementColor(analyticsData.summary.overallAchievement)}`}>
                                    {analyticsData.summary.overallAchievement.toFixed(1)}%
                                </h3>
                                <p className="text-xs text-secondary-400 mt-1">Overall Completion</p>
                            </div>
                            <div className="card-premium p-6 border-l-4 border-purple-500">
                                <p className="text-secondary-500 text-xs font-bold uppercase mb-1">Employees Tracked</p>
                                <h3 className="text-2xl font-black text-purple-900">
                                    {analyticsData.summary.employeeCount}
                                </h3>
                                <p className="text-xs text-secondary-400 mt-1">In selected scope</p>
                            </div>
                        </div>

                        {/* Chart */}
                        <PerformanceVsTargetChart
                            data={analyticsData.trendData}
                            scope={filters.scope}
                        />
                    </>
                ) : (
                    <div className="card-premium p-12 text-center text-secondary-400">
                        No analytics data available for this selection.
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
