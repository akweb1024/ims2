'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>({
        stats: [],
        recentActivities: [],
        upcomingRenewals: []
    });

    useEffect(() => {
        // Check authentication
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            router.push('/login');
            return;
        }

        setUser(JSON.parse(userData));

        // Fetch dashboard data
        const fetchDashboardData = async () => {
            try {
                const response = await fetch('/api/dashboard/stats', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const dashboardData = await response.json();
                    setData(dashboardData);
                } else if (response.status === 401) {
                    router.push('/login');
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-secondary-600 font-medium">Crunching your subscription data...</p>
                </div>
            </div>
        );
    }

    const { stats, recentActivities, upcomingRenewals } = data;

    return (
        <DashboardLayout userRole={user?.role}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">
                            Welcome back, {user?.customerProfile?.name || user?.name || 'User'}!
                        </h1>
                        <p className="text-secondary-600 mt-1">
                            {user?.role === 'CUSTOMER'
                                ? "Manage your subscriptions and journals in one place"
                                : "Here's the latest update on your business metrics"}
                        </p>
                    </div>
                    {user?.role !== 'CUSTOMER' && (
                        <div className="mt-4 sm:mt-0">
                            <Link href="/dashboard/subscriptions/new" className="btn btn-primary">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                New Subscription
                            </Link>
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                {stats && stats.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {stats.map((stat: any) => (
                            <div key={stat.name} className="stat-card group hover:shadow-xl transition-all duration-300">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`stat-card-icon ${stat.color} text-white`}>
                                        {stat.icon}
                                    </div>
                                </div>
                                <h3 className="text-secondary-600 text-sm font-medium">{stat.name}</h3>
                                <p className="text-3xl font-bold text-secondary-900 mt-2">{stat.value}</p>
                                <p className={`text-sm mt-2 flex items-center ${stat.changePositive ? 'text-success-600' : 'text-warning-600'}`}>
                                    {stat.changePositive && <span className="mr-1">↑</span>}
                                    {stat.change}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-secondary-300">
                        <p className="text-secondary-500 italic">No statistics available for this account yet.</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Activity */}
                    <div className="card-premium">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-secondary-900">Recent Activity</h2>
                            <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                                View all
                            </button>
                        </div>
                        <div className="space-y-4">
                            {recentActivities && recentActivities.length > 0 ? (
                                recentActivities.map((activity: any) => (
                                    <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b border-secondary-100 last:border-0 last:pb-0">
                                        <div className="text-2xl">{activity.icon}</div>
                                        <div className="flex-1">
                                            <p className="text-secondary-900">{activity.message}</p>
                                            <p className="text-sm text-secondary-500 mt-1">{activity.time}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-10 text-center">
                                    <div className="text-4xl mb-3">🎐</div>
                                    <p className="text-secondary-500">No recent activity found.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Upcoming Renewals */}
                    <div className="card-premium">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-secondary-900">Upcoming Renewals</h2>
                            <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                                View all
                            </button>
                        </div>
                        <div className="space-y-4">
                            {upcomingRenewals && upcomingRenewals.length > 0 ? (
                                upcomingRenewals.map((renewal: any) => (
                                    <div key={renewal.id} className="p-4 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors border border-transparent hover:border-secondary-200">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h4 className="font-semibold text-secondary-900">{renewal.customer}</h4>
                                                <p className="text-sm text-secondary-600">{renewal.journal}</p>
                                            </div>
                                            <span className={`badge ${renewal.status === 'auto-renew' ? 'badge-success' : 'badge-warning'}`}>
                                                {renewal.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-secondary-600">Due: {renewal.dueDate}</span>
                                            <span className="font-bold text-secondary-900">{renewal.amount}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-10 text-center">
                                    <div className="text-4xl mb-3">📅</div>
                                    <p className="text-secondary-500">No renewals due in the next 30 days.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="card-premium">
                    <h2 className="text-xl font-bold text-secondary-900 mb-6">Quick Actions</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Link href="/dashboard/subscriptions/new" className="flex flex-col items-center justify-center p-6 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors text-center">
                            <span className="text-3xl mb-2">📋</span>
                            <span className="text-xs font-bold uppercase tracking-widest text-secondary-900">New Subscription</span>
                        </Link>

                        {user?.role !== 'CUSTOMER' && (
                            <Link href="/dashboard/customers/new" className="flex flex-col items-center justify-center p-6 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors text-center">
                                <span className="text-3xl mb-2">👥</span>
                                <span className="text-xs font-bold uppercase tracking-widest text-secondary-900">Add {user?.role === 'AGENCY' ? 'Client' : 'Customer'}</span>
                            </Link>
                        )}

                        {['SUPER_ADMIN', 'MANAGER', 'SALES_EXECUTIVE'].includes(user?.role) && (
                            <Link href="/dashboard/customers" className="flex flex-col items-center justify-center p-6 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors text-center">
                                <span className="text-3xl mb-2">💬</span>
                                <span className="text-xs font-bold uppercase tracking-widest text-secondary-900">Log Activity</span>
                            </Link>
                        )}

                        {['SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'].includes(user?.role) && (
                            <Link href="/dashboard/analytics" className="flex flex-col items-center justify-center p-6 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors text-center">
                                <span className="text-3xl mb-2">📊</span>
                                <span className="text-xs font-bold uppercase tracking-widest text-secondary-900">Reports</span>
                            </Link>
                        )}

                        {user?.role === 'CUSTOMER' && (
                            <>
                                <Link href="/dashboard/support" className="flex flex-col items-center justify-center p-6 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors text-center">
                                    <span className="text-3xl mb-2">❓</span>
                                    <span className="text-xs font-bold uppercase tracking-widest text-secondary-900">Get Help</span>
                                </Link>
                                <Link href="/dashboard/invoices" className="flex flex-col items-center justify-center p-6 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors text-center">
                                    <span className="text-3xl mb-2">🧾</span>
                                    <span className="text-xs font-bold uppercase tracking-widest text-secondary-900">My Invoices</span>
                                </Link>
                                <Link href="/dashboard/profile" className="flex flex-col items-center justify-center p-6 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors text-center">
                                    <span className="text-3xl mb-2">👤</span>
                                    <span className="text-xs font-bold uppercase tracking-widest text-secondary-900">Settings</span>
                                </Link>
                            </>
                        )}

                        {user?.role === 'AGENCY' && (
                            <Link href="/dashboard/commission" className="flex flex-col items-center justify-center p-6 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors text-center">
                                <span className="text-3xl mb-2">💰</span>
                                <span className="text-xs font-bold uppercase tracking-widest text-secondary-900">Earnings</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
