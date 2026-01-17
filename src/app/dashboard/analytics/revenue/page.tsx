'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { DollarSign, TrendingUp, Users, CreditCard, Calendar, Award, Building2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function RevenueDashboard() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');
    const [revenueData, setRevenueData] = useState<any>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchRevenueData();
        }
    }, [user, period]);

    const fetchRevenueData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/analytics/revenue?period=${period}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setRevenueData(data);
            }
        } catch (error) {
            console.error('Error fetching revenue data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-IN').format(num);
    };

    if (loading || !revenueData) {
        return (
            <DashboardLayout userRole={user?.role}>
                <div className="flex justify-center items-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    const { summary, breakdown, trends, counts } = revenueData;

    return (
        <DashboardLayout userRole={user?.role}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-success-500 to-success-600 rounded-2xl shadow-lg">
                                <DollarSign className="w-8 h-8 text-white" />
                            </div>
                            Revenue Analytics
                        </h1>
                        <p className="text-secondary-500 mt-2">Track company revenue and performance metrics</p>
                    </div>
                    <div className="flex gap-3">
                        <select
                            className="input w-48"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                        >
                            <option value="week">Last 7 Days</option>
                            <option value="month">This Month</option>
                            <option value="quarter">This Quarter</option>
                            <option value="year">This Year</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="card-premium p-6 border-l-4 border-success-500 bg-gradient-to-br from-success-50 to-white">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-success-100 rounded-xl">
                                <DollarSign className="w-6 h-6 text-success-600" />
                            </div>
                            <div className="flex items-center gap-1 text-success-600 text-sm font-bold">
                                <TrendingUp size={16} />
                                <span>Total</span>
                            </div>
                        </div>
                        <h3 className="text-sm font-bold text-secondary-500 uppercase tracking-wider mb-1">Total Revenue</h3>
                        <p className="text-3xl font-black text-secondary-900">{formatCurrency(summary.totalRevenue)}</p>
                        <p className="text-xs text-secondary-400 mt-2">Period: {period}</p>
                    </div>

                    <div className="card-premium p-6 border-l-4 border-primary-500">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-primary-100 rounded-xl">
                                <CreditCard className="w-6 h-6 text-primary-600" />
                            </div>
                            <span className="badge bg-primary-100 text-primary-700">{counts.totalPayments}</span>
                        </div>
                        <h3 className="text-sm font-bold text-secondary-500 uppercase tracking-wider mb-1">Payment Revenue</h3>
                        <p className="text-3xl font-black text-secondary-900">{formatCurrency(summary.paymentRevenue)}</p>
                        <p className="text-xs text-secondary-400 mt-2">From Razorpay & others</p>
                    </div>

                    <div className="card-premium p-6 border-l-4 border-indigo-500">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-indigo-100 rounded-xl">
                                <Users className="w-6 h-6 text-indigo-600" />
                            </div>
                            <span className="badge bg-indigo-100 text-indigo-700">{counts.totalReports}</span>
                        </div>
                        <h3 className="text-sm font-bold text-secondary-500 uppercase tracking-wider mb-1">Work Reports</h3>
                        <p className="text-3xl font-black text-secondary-900">{formatCurrency(summary.workReportRevenue)}</p>
                        <p className="text-xs text-secondary-400 mt-2">Employee-generated</p>
                    </div>

                    <div className="card-premium p-6 border-l-4 border-warning-500">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-warning-100 rounded-xl">
                                <Calendar className="w-6 h-6 text-warning-600" />
                            </div>
                            <span className="badge bg-warning-100 text-warning-700">{counts.totalInvoices}</span>
                        </div>
                        <h3 className="text-sm font-bold text-secondary-500 uppercase tracking-wider mb-1">Invoice Revenue</h3>
                        <p className="text-3xl font-black text-secondary-900">{formatCurrency(summary.invoiceRevenue)}</p>
                        <p className="text-xs text-secondary-400 mt-2">Paid invoices</p>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Revenue Trend */}
                    <div className="card-premium p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <TrendingUp className="w-5 h-5 text-primary-600" />
                            <h2 className="font-bold text-lg text-secondary-900">Revenue Trend (Last 6 Months)</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trends.monthly}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                    formatter={(value: any) => formatCurrency(value)}
                                />
                                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Department Breakdown */}
                    <div className="card-premium p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Building2 className="w-5 h-5 text-indigo-600" />
                            <h2 className="font-bold text-lg text-secondary-900">Revenue by Department</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={breakdown.byDepartment}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="revenue"
                                >
                                    {breakdown.byDepartment.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Performers */}
                <div className="card-premium p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Award className="w-5 h-5 text-warning-600" />
                        <h2 className="font-bold text-lg text-secondary-900">Top Revenue Generators</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {breakdown.topPerformers.slice(0, 9).map((performer: any, index: number) => (
                            <div
                                key={performer.email}
                                className="p-4 border border-secondary-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all bg-white"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-white ${index === 0 ? 'bg-warning-500' :
                                            index === 1 ? 'bg-secondary-400' :
                                                index === 2 ? 'bg-orange-500' :
                                                    'bg-primary-500'
                                            }`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-bold text-secondary-900 text-sm">{performer.name}</p>
                                            <p className="text-xs text-secondary-500">{performer.email}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-secondary-100">
                                    <span className="text-xs font-bold text-secondary-500 uppercase">Revenue</span>
                                    <span className="text-lg font-black text-success-600">{formatCurrency(performer.revenue)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Payment Methods */}
                {breakdown.byPaymentMethod.length > 0 && (
                    <div className="card-premium p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <CreditCard className="w-5 h-5 text-primary-600" />
                            <h2 className="font-bold text-lg text-secondary-900">Payment Methods Breakdown</h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {breakdown.byPaymentMethod.map((method: any, index: number) => (
                                <div key={method.method} className="p-4 bg-secondary-50 rounded-xl border border-secondary-200">
                                    <p className="text-xs font-bold text-secondary-500 uppercase mb-2">{method.method}</p>
                                    <p className="text-2xl font-black text-secondary-900">{formatCurrency(method.amount)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Department Details Table */}
                <div className="card-premium overflow-hidden">
                    <div className="p-6 border-b border-secondary-100">
                        <h2 className="font-bold text-lg text-secondary-900">Department Revenue Details</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase">Department</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-secondary-500 uppercase">Revenue</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-secondary-500 uppercase">% of Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {breakdown.byDepartment
                                    .sort((a: any, b: any) => b.revenue - a.revenue)
                                    .map((dept: any) => {
                                        const percentage = (dept.revenue / summary.totalRevenue) * 100;
                                        return (
                                            <tr key={dept.name} className="hover:bg-secondary-50">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 size={16} className="text-primary-600" />
                                                        <span className="font-bold text-secondary-900">{dept.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-black text-success-600">{formatCurrency(dept.revenue)}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className="w-24 bg-secondary-200 rounded-full h-2">
                                                            <div
                                                                className="bg-primary-500 h-2 rounded-full"
                                                                style={{ width: `${Math.min(percentage, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm font-bold text-secondary-700 w-12">{percentage.toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
