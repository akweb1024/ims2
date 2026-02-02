'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { TrendingUp, Users, Building, Filter, DollarSign, PieChart, CheckCircle, Clock } from 'lucide-react';
import { FormattedNumber } from '@/components/common/FormattedNumber';
import IncrementAnalyticsChart from '@/components/dashboard/hr/IncrementAnalyticsChart';

export default function IncrementAnalyticsPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [analytics, setAnalytics] = useState<any>(null);

    // Filters
    const [period, setPeriod] = useState(new Date().getFullYear().toString().slice(-2)); // e.g., "25"
    const [fiscalYear, setFiscalYear] = useState(''); // e.g., "2024-25"
    const [scope, setScope] = useState<'COMPANY' | 'TEAM' | 'INDIVIDUAL'>('COMPANY');
    const [status, setStatus] = useState<'APPROVED' | 'RECOMMENDED' | 'ALL'>('APPROVED');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);

            // Set default scope based on role
            if (['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'].includes(parsedUser.role)) {
                setScope('COMPANY');
            } else if (['MANAGER', 'TEAM_LEADER'].includes(parsedUser.role)) {
                setScope('TEAM');
            } else {
                setScope('INDIVIDUAL');
            }

            // Set default FY
            const year = new Date().getFullYear();
            const month = new Date().getMonth();
            const startYear = month >= 3 ? year : year - 1;
            setFiscalYear(`${startYear}-${(startYear + 1).toString().slice(-2)}`);
        }
    }, []);

    const fetchAnalytics = useCallback(async () => {
        if (!user || !fiscalYear) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            params.append('fiscalYear', fiscalYear);
            params.append('scope', scope);
            params.append('status', status);

            const res = await fetch(`/api/hr/increments/analytics?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setAnalytics(data);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    }, [fiscalYear, scope, status, user]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    return (
        <DashboardLayout userRole={user?.role}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Increment Analytics</h1>
                        <p className="text-secondary-500">Analyze salary revision trends, budget impact, and distribution.</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="card-premium p-4 md:p-6 flex flex-wrap gap-6 items-end">
                    {/* Scope Filter */}
                    <div>
                        <label className="label mb-2 block">Analysis Scope</label>
                        <div className="flex bg-secondary-100 p-1 rounded-lg">
                            {['INDIVIDUAL', 'TEAM', 'COMPANY'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setScope(s as any)}
                                    disabled={
                                        (s === 'COMPANY' && !['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'].includes(user?.role)) ||
                                        (s === 'TEAM' && !['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER', 'TEAM_LEADER'].includes(user?.role))
                                    }
                                    className={`px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${scope === s
                                        ? 'bg-white text-primary-700 shadow-sm'
                                        : 'text-secondary-500 hover:text-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed'
                                        }`}
                                >
                                    {s === 'COMPANY' && <Building size={14} />}
                                    {s === 'TEAM' && <Users size={14} />}
                                    {s === 'INDIVIDUAL' && <Users size={14} />}
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="label mb-2 block">Status Filter</label>
                        <div className="flex bg-secondary-100 p-1 rounded-lg">
                            {[
                                { val: 'APPROVED', label: 'Approved Final', icon: CheckCircle },
                                { val: 'RECOMMENDED', label: 'Processing', icon: Clock },
                                { val: 'ALL', label: 'All Records', icon: Filter }
                            ].map((s) => (
                                <button
                                    key={s.val}
                                    onClick={() => setStatus(s.val as any)}
                                    className={`px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${status === s.val
                                        ? 'bg-white text-primary-700 shadow-sm'
                                        : 'text-secondary-500 hover:text-secondary-700'
                                        }`}
                                >
                                    <s.icon size={14} />
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* FY Filter */}
                    <div>
                        <label className="label mb-2 block">Fiscal Year</label>
                        <select
                            className="input-premium py-2 w-32"
                            value={fiscalYear}
                            onChange={(e) => setFiscalYear(e.target.value)}
                        >
                            {Array.from({ length: 3 }, (_, i) => {
                                const y = new Date().getFullYear() - i;
                                const val = `${y}-${(y + 1).toString().slice(-2)}`;
                                return <option key={val} value={val}>FY {val}</option>;
                            })}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    </div>
                ) : analytics ? (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="card-premium p-6 border-l-4 border-indigo-500">
                                <p className="text-secondary-500 text-xs font-bold uppercase mb-1">Total Impact</p>
                                <h3 className="text-2xl font-black text-indigo-900">
                                    ₹<FormattedNumber value={analytics.summary.totalImpact} compact />
                                </h3>
                                <p className="text-xs text-secondary-400 mt-1">
                                    Across {analytics.summary.count} increments
                                </p>
                            </div>
                            <div className="card-premium p-6 border-l-4 border-emerald-500">
                                <p className="text-secondary-500 text-xs font-bold uppercase mb-1">Avg. Increase</p>
                                <h3 className="text-2xl font-black text-emerald-900">
                                    {analytics.summary.avgPercentage}%
                                </h3>
                                <p className="text-xs text-secondary-400 mt-1">Average percentage hike</p>
                            </div>
                            <div className="card-premium p-6 border-l-4 border-purple-500">
                                <p className="text-secondary-500 text-xs font-bold uppercase mb-1">Total Records</p>
                                <h3 className="text-2xl font-black text-purple-900">
                                    {analytics.summary.count}
                                </h3>
                                <p className="text-xs text-secondary-400 mt-1">Adjustments in period</p>
                            </div>
                        </div>

                        {/* Chart Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 card-premium">
                                <h3 className="font-bold text-lg text-secondary-900 mb-6 flex items-center gap-2">
                                    <TrendingUp size={20} className="text-primary-600" />
                                    Increment Impact Trend
                                </h3>
                                <IncrementAnalyticsChart data={analytics.trendData} />
                            </div>

                            {/* Department Dist (Only show for Company Scope) */}
                            {scope === 'COMPANY' && (
                                <div className="card-premium">
                                    <h3 className="font-bold text-lg text-secondary-900 mb-6 flex items-center gap-2">
                                        <PieChart size={20} className="text-primary-600" />
                                        Department Impact
                                    </h3>
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                        {analytics.departmentData.map((d: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-sm">
                                                <span className="text-secondary-600 font-medium">{d.name}</span>
                                                <div className="text-right">
                                                    <div className="font-bold text-secondary-900">₹<FormattedNumber value={d.value} compact /></div>
                                                    <div className="w-24 h-1.5 bg-secondary-100 rounded-full mt-1 overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary-500 rounded-full"
                                                            style={{ width: `${(d.value / analytics.summary.totalImpact) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {analytics.departmentData.length === 0 && (
                                            <p className="text-secondary-400 text-center py-8">No department data</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="card-premium p-12 text-center text-secondary-400">
                        Select filters to view analytics.
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
