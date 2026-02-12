'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    TrendingUp,
    DollarSign,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Calendar,
    Filter,
    Users
} from 'lucide-react';
import IncrementAnalyticsChart from '@/components/dashboard/hr/IncrementAnalyticsChart';


export default function IncrementAnalyticsTab() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [filters, setFilters] = useState({
        fiscalYear: '25-26',
        scope: 'COMPANY',
        status: 'APPROVED',
        departmentId: '',
        companyId: '',
    });

    const [availableFilters, setAvailableFilters] = useState({
        companies: [] as any[],
        departments: [] as any[],
        fiscalYears: [] as string[],
    });



    const fetchUser = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const userData = await res.json();
                const actualUser = userData.user;
                setUser(actualUser);
                // Default scope to TEAM for Managers
                if (actualUser.role === 'MANAGER') {
                    setFilters(prev => ({ ...prev, scope: 'TEAM' }));
                }
            }
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    }, []);

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

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) queryParams.append(key, value);
            });
            const res = await fetch(`/api/hr/increments/analytics?${queryParams.toString()}`);
            const result = await res.json();
            setData(result);
            if (result.availableFiscalYears) {
                setAvailableFilters(prev => ({ ...prev, fiscalYears: result.availableFiscalYears }));
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

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
        fetchUser();
    }, [fetchUser]);

    useEffect(() => {
        if (user) {
            fetchAnalytics();
        }
    }, [filters, user, fetchAnalytics]);

    useEffect(() => {
        fetchDepartments();
    }, [filters.companyId, fetchDepartments]);

    useEffect(() => {
        if (user?.role === 'SUPER_ADMIN') {
            fetchCompanies();
        }
    }, [user, fetchCompanies]);

    if (loading && !data) {
        return (
            <div className="h-96 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const stats = data?.stats || {};

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-secondary-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary-50 rounded-xl border border-secondary-200">
                        <Calendar size={14} className="text-secondary-400" />
                        <select
                            className="bg-transparent text-xs font-bold text-secondary-700 outline-none"
                            value={filters.fiscalYear}
                            onChange={(e) => setFilters({ ...filters, fiscalYear: e.target.value })}
                        >
                            {availableFilters.fiscalYears.length > 0 ? (
                                availableFilters.fiscalYears.map(year => (
                                    <option key={year} value={year}>{`FY 20${year.split('-').join('-20')}`}</option>
                                ))
                            ) : (
                                <>
                                    <option value="25-26">FY 2025-26</option>
                                    <option value="24-25">FY 2024-25</option>
                                    <option value="23-24">FY 2023-24</option>
                                </>
                            )}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary-50 rounded-xl border border-secondary-200">
                        <Filter size={14} className="text-secondary-400" />
                        <select
                            className="bg-transparent text-xs font-bold text-secondary-700 outline-none"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="APPROVED">Approved Only</option>
                            <option value="RECOMMENDED">Recommended</option>
                            <option value="ALL">All Status</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary-50 rounded-xl border border-secondary-200">
                        <Users size={14} className="text-secondary-400" />
                        <select
                            className="bg-transparent text-xs font-bold text-secondary-700 outline-none"
                            value={filters.scope}
                            onChange={(e) => setFilters({ ...filters, scope: e.target.value })}
                        >
                            <option value="COMPANY">Company Wide</option>
                            <option value="TEAM">My Team</option>
                        </select>
                    </div>

                    {user?.role === 'SUPER_ADMIN' && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary-50 rounded-xl border border-secondary-200">
                            <Search size={14} className="text-secondary-400" />
                            <select
                                className="bg-transparent text-xs font-bold text-secondary-700 outline-none"
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
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary-50 rounded-xl border border-secondary-200">
                            <Filter size={14} className="text-secondary-400" />
                            <select
                                className="bg-transparent text-xs font-bold text-secondary-700 outline-none"
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
                </div>

                <div className="text-[10px] uppercase font-black text-secondary-400 tracking-widest">
                    Showing Data for FY {filters.fiscalYear}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card
                    title="Total CTC Impact"
                    value={stats.totalApprovedBudgetImpact || 0}
                    icon={<TrendingUp size={20} />}
                    color="text-primary-600"
                    bg="bg-primary-50"
                    isCurrency
                />
                <Card
                    title="Revenue Target"
                    value={stats.targetBreakdown?.total || 0}
                    icon={<BarChart3 size={20} />}
                    color="text-success-600"
                    bg="bg-success-50"
                    isCurrency
                />
                <Card
                    title="Real Company Revenue"
                    value={stats.totalRealRevenue || 0}
                    icon={<TrendingUp size={20} />}
                    color="text-blue-600"
                    bg="bg-blue-50"
                    isCurrency
                    trend={stats.totalRealRevenue > stats.targetBreakdown?.total ? 'up' : 'down'}
                />
                <Card
                    title="Real Company Expenses"
                    value={stats.totalRealExpense || 0}
                    icon={<DollarSign size={20} />}
                    color="text-danger-600"
                    bg="bg-danger-50"
                    isCurrency
                />
            </div>

            {/* Main Graph */}
            <div className="bg-white p-6 rounded-3xl border border-secondary-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-black text-secondary-900 tracking-tight">Financial Performance & Increments</h3>
                        <p className="text-xs text-secondary-500 font-bold mt-0.5">Monthly relationship between CTC impact, revenue, and expenses</p>
                    </div>
                    <div className="flex gap-4">
                        <LegendItem color="bg-primary-600" label="CTC Impact" />
                        <LegendItem color="bg-success-500" label="Rev. Target" />
                        <LegendItem color="bg-blue-500" label="Real Revenue" />
                        <LegendItem color="bg-danger-500" label="Real Expense" />
                    </div>
                </div>
                <div className="h-[400px]">
                    <IncrementAnalyticsChart data={data?.trends || []} />
                </div>
            </div>

            {/* Bottom Grid: Department Impact & Top Adjustments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-secondary-200 shadow-sm">
                    <h3 className="text-sm font-black text-secondary-900 uppercase tracking-wider mb-4">Department Impact</h3>
                    <div className="space-y-4">
                        {(data?.departments || []).map((dept: any) => (
                            <div key={dept.name} className="space-y-1.5">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-secondary-600">{dept.name}</span>
                                    <span className="text-secondary-900">₹{dept.impact.toLocaleString()}</span>
                                </div>
                                <div className="h-2 bg-secondary-50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary-500 rounded-full"
                                        style={{ width: `${Math.min((dept.impact / stats.totalApprovedBudgetImpact) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-secondary-200 shadow-sm">
                    <h3 className="text-sm font-black text-secondary-900 uppercase tracking-wider mb-4">Top Adjustments</h3>
                    <div className="space-y-3">
                        {(data?.topAdjustments || []).map((inc: any) => (
                            <div key={inc.id} className="flex justify-between items-center p-3 bg-secondary-50/50 rounded-2xl border border-secondary-100">
                                <div>
                                    <p className="text-xs font-black text-secondary-900">{inc.name}</p>
                                    <p className="text-[10px] text-secondary-500 font-bold">{inc.designation}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-primary-600">₹{inc.amount.toLocaleString()}</p>
                                    <p className="text-[10px] text-success-600 font-bold">+{inc.percentage.toFixed(1)}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Card({ title, value, icon, color, bg, isCurrency, trend }: any) {
    return (
        <div className="bg-white p-5 rounded-3xl border border-secondary-200 shadow-sm flex items-start gap-4">
            <div className={`p-3 ${bg} ${color} rounded-2xl`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">{title}</p>
                <div className="flex items-center gap-2">
                    <h4 className="text-lg font-black text-secondary-900 tracking-tight">
                        {isCurrency ? `₹${value.toLocaleString()}` : value}
                    </h4>
                    {trend && (
                        <div className={`p-0.5 rounded-full ${trend === 'up' ? 'text-success-600 bg-success-50' : 'text-danger-600 bg-danger-50'}`}>
                            {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function LegendItem({ color, label }: any) {
    return (
        <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-[10px] font-black text-secondary-500 uppercase tracking-wider">{label}</span>
        </div>
    );
}
