'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { TrendingUp, Users, Building, Filter, DollarSign, PieChart, CheckCircle, Clock, Target } from 'lucide-react';
import { FormattedNumber } from '@/components/common/FormattedNumber';
import IncrementAnalyticsChart from '@/components/dashboard/hr/IncrementAnalyticsChart';
import IncrementDistributionChart from '@/components/dashboard/hr/IncrementDistributionChart';
import TopIncrementsTable from '@/components/dashboard/hr/TopIncrementsTable';

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
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[
                                { title: 'Total Budget Impact', value: analytics.stats.totalApprovedBudgetImpact, sub: `Across ${analytics.stats.approvedCount} increments`, border: 'border-indigo-500', text: 'text-indigo-900', prefix: '₹', compact: true },
                                { title: 'Avg. Increase', value: analytics.stats.averagePercentage, sub: 'Average percentage hike', border: 'border-emerald-500', text: 'text-emerald-900', suffix: '%', dec: 1 },
                                { title: 'Revenue Coverage', value: analytics.stats.roiMultiplier, sub: 'Revenue target / Salary cost', border: 'border-orange-500', text: 'text-orange-900', suffix: 'x', dec: 1 },
                                { title: 'Total Records', value: analytics.stats.approvedCount, sub: 'Adjustments in period', border: 'border-purple-500', text: 'text-purple-900' }
                            ].map((card, idx) => (
                                <div key={idx} className={`card-premium p-6 border-l-4 ${card.border} flex flex-col justify-between h-full`}>
                                    <div>
                                        <p className="text-secondary-500 text-[10px] font-black uppercase tracking-widest mb-2">{card.title}</p>
                                        <h3 className={`text-2xl font-black ${card.text}`}>
                                            {card.prefix}<FormattedNumber value={card.value} compact={card.compact} />{card.suffix}
                                            {card.dec !== undefined && card.value.toFixed(card.dec)}
                                            {card.dec === undefined && !card.compact && card.value}
                                        </h3>
                                    </div>
                                    <p className="text-[10px] font-bold text-secondary-400 mt-2 uppercase">{card.sub}</p>
                                </div>
                            ))}
                        </div>

                        {/* Quarterly Aggregate Targets */}
                        <div className="card-premium p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-black text-secondary-900 flex items-center gap-2">
                                        <Target className="text-teal-500" size={20} />
                                        Quarterly Target Aggregates
                                    </h3>
                                    <p className="text-xs text-secondary-500 font-bold uppercase mt-1">Total combined revenue commitment</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => {
                                    const val = analytics.quarterlyBreakdown?.[q.toLowerCase()] || 0;
                                    return (
                                        <div key={q} className="p-4 bg-secondary-50 rounded-2xl border border-secondary-100/50">
                                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">{q} Total Target</p>
                                            <p className="text-xl font-black text-secondary-900 mt-1">₹<FormattedNumber value={val} compact /></p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>


                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 card-premium">
                                <h3 className="font-bold text-lg text-secondary-900 mb-6 flex items-center gap-2">
                                    <TrendingUp size={20} className="text-primary-600" />
                                    Impact vs Revenue Trend
                                </h3>
                                <div className="h-80">
                                    <IncrementAnalyticsChart data={analytics.trends} />
                                </div>
                            </div>

                            {/* Department Dist (Only show for Company Scope) */}
                            {scope === 'COMPANY' && (
                                <div className="card-premium">
                                    <h3 className="font-bold text-lg text-secondary-900 mb-6 flex items-center gap-2">
                                        <PieChart size={20} className="text-primary-600" />
                                        Department Impact
                                    </h3>
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                                        {analytics.departments.map((d: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-sm">
                                                <span className="text-secondary-600 font-medium">{d.name}</span>
                                                <div className="text-right">
                                                    <div className="font-bold text-secondary-900 text-xs">₹<FormattedNumber value={d.impact} compact /></div>
                                                    <div className="w-28 h-2.5 bg-secondary-100 rounded-full mt-1 overflow-hidden border border-secondary-200/50">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-1000 ${i % 3 === 0 ? 'bg-indigo-500' : i % 3 === 1 ? 'bg-emerald-500' : 'bg-orange-500'
                                                                }`}
                                                            style={{ width: `${(d.impact / (analytics.stats.totalApprovedBudgetImpact || 1)) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {analytics.departments.length === 0 && (
                                            <p className="text-secondary-400 text-center py-8">No department data</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Distribution and Top Performers */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Distribution Chart */}
                            <div className="card-premium">
                                <h3 className="font-bold text-lg text-secondary-900 mb-6 flex items-center gap-2">
                                    <PieChart size={20} className="text-primary-600" />
                                    Increment Percentage Distribution
                                </h3>
                                <IncrementDistributionChart data={analytics.distribution} />
                            </div>

                            {/* Top Increments */}
                            <div className="card-premium">
                                <h3 className="font-bold text-lg text-secondary-900 mb-6 flex items-center gap-2">
                                    <Users size={20} className="text-primary-600" />
                                    High Impact Adjustments
                                </h3>
                                <TopIncrementsTable data={analytics.topAdjustments} />
                            </div>
                        </div>

                        {/* Designation Impact (Horizontal Bars) - reusing Dept logic structure customized for designations */}
                        {scope === 'COMPANY' && (
                            <div className="card-premium">
                                <h3 className="font-bold text-lg text-secondary-900 mb-6 flex items-center gap-2">
                                    <Building size={20} className="text-primary-600" />
                                    Impact by Designation
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {analytics.designationData.map((d: any, i: number) => (
                                        <div key={i} className="bg-secondary-50 p-4 rounded-lg border border-secondary-100">
                                            <p className="text-xs text-secondary-500 font-bold uppercase truncate" title={d.name}>{d.name}</p>
                                            <p className="text-lg font-black text-secondary-900 mt-1">₹<FormattedNumber value={d.value} compact /></p>
                                            <div className="w-full h-2.5 bg-secondary-200 rounded-full mt-2 overflow-hidden border border-secondary-200/50">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${i % 2 === 0 ? 'bg-indigo-500' : 'bg-purple-500'
                                                        }`}
                                                    style={{ width: `${(d.value / (analytics.stats.totalApprovedBudgetImpact || 1)) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="card-premium p-12 text-center text-secondary-400">
                        Select filters to view analytics.
                    </div>
                )}
            </div>
        </DashboardLayout >
    );
}

