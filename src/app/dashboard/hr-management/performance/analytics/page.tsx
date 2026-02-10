
'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { TrendingUp, Users, Building, Calendar, Filter, DollarSign, Target, Award } from 'lucide-react';
import { FormattedNumber } from '@/components/common/FormattedNumber';
import PerformanceVsTargetChart from '@/components/dashboard/hr/PerformanceVsTargetChart';
import GoalAchievementChart from '@/components/dashboard/hr/GoalAchievementChart';

export default function PerformanceAnalyticsPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [analyticsData, setAnalyticsData] = useState<any>(null);

    const [filters, setFilters] = useState({
        scope: 'TEAM' as 'TEAM' | 'COMPANY',
        year: new Date().getFullYear(),
        companyId: '',
        departmentId: '',
    });

    const [availableFilters, setAvailableFilters] = useState({
        companies: [] as any[],
        departments: [] as any[],
    });

    useEffect(() => {
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const userData = await res.json();
                setUser(userData);

                // Admin roles default to COMPANY, others to TEAM
                const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(userData.role);
                setFilters(prev => ({
                    ...prev,
                    scope: isAdmin ? 'COMPANY' : 'TEAM'
                }));
            }
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    };

    const fetchCompanies = useCallback(async () => {
        try {
            const res = await fetch('/api/companies?limit=1000');
            const result = await res.json();
            if (result.data) {
                setAvailableFilters(prev => ({ ...prev, companies: result.data }));
            }
        } catch (error) {
            console.error('Error fetching companies:', error);
        }
    }, []);

    const fetchDepartments = useCallback(async () => {
        try {
            const url = filters.companyId
                ? `/api/hr/departments?companyId=${filters.companyId}`
                : '/api/hr/departments';
            const res = await fetch(url);
            const result = await res.json();
            if (Array.isArray(result)) {
                // Deduplicate by name
                const uniqueDepts: any[] = [];
                const seenNames = new Set();
                result.forEach(dept => {
                    if (!seenNames.has(dept.name)) {
                        seenNames.add(dept.name);
                        uniqueDepts.push(dept);
                    }
                });
                setAvailableFilters(prev => ({ ...prev, departments: uniqueDepts }));
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    }, [filters.companyId]);

    useEffect(() => {
        if (user?.role === 'SUPER_ADMIN') {
            fetchCompanies();
        }
    }, [user, fetchCompanies]);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    const fetchAnalytics = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value.toString());
            });

            const res = await fetch(`/api/hr/performance/analytics?${params.toString()}`);

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
                        <p className="text-secondary-500">Analyze revenue performance and goal achievement trends.</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="card-premium p-4 md:p-6 flex flex-wrap gap-4 items-end">
                    <div className="flex flex-col gap-2">
                        <label className="label block text-[10px] font-black uppercase text-secondary-400">Analysis Scope</label>
                        <div className="flex bg-secondary-100 p-1 rounded-xl">
                            {['TEAM', 'COMPANY'].map((scope) => (
                                <button
                                    key={scope}
                                    onClick={() => setFilters({ ...filters, scope: scope as any })}
                                    disabled={scope === 'COMPANY' && !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user?.role)}
                                    className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-2 ${filters.scope === scope
                                        ? 'bg-white text-primary-700 shadow-sm'
                                        : 'text-secondary-500 hover:text-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed'
                                        }`}
                                >
                                    {scope === 'TEAM' ? <Users size={12} /> : <Building size={12} />}
                                    {scope}
                                </button>
                            ))}
                        </div>
                    </div>

                    {user?.role === 'SUPER_ADMIN' && availableFilters.companies.length > 0 && (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                            <label className="label block text-[10px] font-black uppercase text-secondary-400">Company</label>
                            <select
                                className="input-premium py-2 text-xs font-bold"
                                value={filters.companyId}
                                onChange={(e) => setFilters({ ...filters, companyId: e.target.value })}
                            >
                                <option value="">All Companies</option>
                                {availableFilters.companies.map((company: any) => (
                                    <option key={company.id} value={company.id}>{company.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {availableFilters.departments.length > 0 && (
                        <div className="flex flex-col gap-2 min-w-[180px]">
                            <label className="label block text-[10px] font-black uppercase text-secondary-400">Department</label>
                            <select
                                className="input-premium py-2 text-xs font-bold"
                                value={filters.departmentId}
                                onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
                            >
                                <option value="">All Departments</option>
                                {availableFilters.departments.map((dept: any) => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <label className="label block text-[10px] font-black uppercase text-secondary-400">Year</label>
                        <select
                            className="input-premium py-2 w-28 text-xs font-bold"
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
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                            <div className="card-premium p-6 border-l-4 border-indigo-500">
                                <p className="text-secondary-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Target</p>
                                <h3 className="text-2xl font-black text-indigo-900">
                                    ₹<FormattedNumber value={analyticsData.summary.totalTarget} compact />
                                </h3>
                                <p className="text-[10px] text-secondary-400 font-bold mt-1">Annual Goal</p>
                            </div>
                            <div className="card-premium p-6 border-l-4 border-blue-500">
                                <p className="text-secondary-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Revenue</p>
                                <h3 className="text-2xl font-black text-blue-900">
                                    ₹<FormattedNumber value={analyticsData.summary.totalRevenue} compact />
                                </h3>
                                <p className="text-[10px] text-secondary-400 font-bold mt-1">Generated so far</p>
                            </div>
                            <div className="card-premium p-6 border-l-4 border-emerald-500">
                                <p className="text-secondary-400 text-[10px] font-black uppercase tracking-widest mb-1">Rev. Achievement</p>
                                <h3 className={`text-2xl font-black ${getAchievementColor(analyticsData.summary.overallAchievement)}`}>
                                    {analyticsData.summary.overallAchievement.toFixed(1)}%
                                </h3>
                                <p className="text-[10px] text-secondary-400 font-bold mt-1">Revenue Completion</p>
                            </div>
                            <div className="card-premium p-6 border-l-4 border-orange-500">
                                <p className="text-secondary-400 text-[10px] font-black uppercase tracking-widest mb-1">Goal Achievement</p>
                                <h3 className={`text-2xl font-black ${getAchievementColor(analyticsData.summary.overallGoalAchievement)}`}>
                                    {analyticsData.summary.overallGoalAchievement.toFixed(1)}%
                                </h3>
                                <p className="text-[10px] text-secondary-400 font-bold mt-1">KRA/KPI Completion</p>
                            </div>
                            <div className="card-premium p-6 border-l-4 border-purple-500">
                                <p className="text-secondary-400 text-[10px] font-black uppercase tracking-widest mb-1">Avg. Evaluation</p>
                                <h3 className="text-2xl font-black text-purple-900">
                                    {analyticsData.summary.avgEvaluationScore.toFixed(1)}/10
                                </h3>
                                <p className="text-[10px] text-secondary-400 font-bold mt-1">Performance Rating</p>
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <PerformanceVsTargetChart
                                data={analyticsData.trendData}
                                scope={filters.scope}
                            />
                            <GoalAchievementChart
                                data={analyticsData.trendData}
                            />
                        </div>
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
