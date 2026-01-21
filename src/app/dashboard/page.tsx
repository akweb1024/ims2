'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import BulletinBoard from '@/components/dashboard/BulletinBoard';
import MarketMonitor from '@/components/dashboard/MarketMonitor';
import CashflowWidget from '@/components/dashboard/finance/CashflowWidget';
import AIInsightsWidget from '@/components/dashboard/AIInsightsWidget';
import { useSession } from 'next-auth/react';
import RevenueMismatchAlert from '@/components/dashboard/RevenueMismatchAlert';

export default function DashboardPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [loadingData, setLoadingData] = useState(false);
    const [data, setData] = useState<any>({
        stats: [],
        recentActivities: [],
        upcomingRenewals: []
    });

    const [error, setError] = useState<string | null>(null);

    const fetchDashboardData = useCallback(async () => {
        setLoadingData(true);
        setError(null);
        try {
            // Create a timeout promise to prevent hanging
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out')), 10000)
            );

            // Note: NextAuth cookies are sent automatically, but we add legacy token if present
            const token = localStorage.getItem('token');
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const fetchPromise = fetch('/api/dashboard/stats', { headers });

            const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

            if (response.ok) {
                const dashboardData = await response.json();
                setData(dashboardData);
            } else if (response.status === 401) {
                router.push('/login');
            } else {
                const errorData = await response.json().catch(() => ({}));
                const message = errorData.message || `Server responded with ${response.status}`;
                if (errorData.details) {
                    console.error('[Dashboard] Server error details:', errorData.details);
                }
                throw new Error(message);
            }
        } catch (error: any) {
            console.error('Error fetching dashboard data:', error);
            setError(error.message || 'Failed to load dashboard data');
        } finally {
            setLoadingData(false);
        }
    }, [router]);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchDashboardData();
        }
    }, [status, router, fetchDashboardData]);

    if (status === 'loading' || loadingData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-secondary-600 font-medium">Crunching your dashboard data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary-50">
                <div className="text-center max-w-md px-6">
                    <div className="text-danger-500 text-5xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-secondary-900 mb-2">Something went wrong</h2>
                    <p className="text-secondary-600 mb-6">{error}</p>
                    <button
                        onClick={fetchDashboardData}
                        className="btn btn-primary"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const { stats, recentActivities, upcomingRenewals } = data;
    const userRole = (session?.user as any)?.role;
    const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'User';

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                {['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'].includes(userRole) && (
                    <RevenueMismatchAlert />
                )}
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">
                            Welcome back, {userName}!
                        </h1>
                        <p className="text-secondary-600 mt-1">
                            {['CUSTOMER', 'AGENCY'].includes(userRole)
                                ? "Here's what's happening with your subscriptions today"
                                : "Here's your professional overview for today"}
                        </p>
                    </div>
                    <div className="mt-4 sm:mt-0">
                        {['CUSTOMER', 'AGENCY'].includes(userRole) ? (
                            <Link href="/dashboard/subscriptions/new" className="btn btn-primary">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                New Subscription
                            </Link>
                        ) : (
                            <Link href="/dashboard/staff-portal" className="btn btn-primary">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                My Staff Portal
                            </Link>
                        )}
                    </div>
                </div>

                {/* HR Quick Stats for Staff */}
                {data.hrStats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="stat-card border-l-4 border-primary-500">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl">🕒</span>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${data.hrStats.hasCheckedIn ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}`}>
                                    {data.hrStats.hasCheckedIn ? 'Checked In' : 'Not Checked In'}
                                </span>
                            </div>
                            <h3 className="text-secondary-500 text-xs font-bold uppercase tracking-wider">Attendance</h3>
                            <p className="text-2xl font-black text-secondary-900 mt-1">{data.hrStats.totalAttendance} Days</p>
                        </div>
                        <div className="stat-card border-l-4 border-success-500">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl">📝</span>
                            </div>
                            <h3 className="text-secondary-500 text-xs font-bold uppercase tracking-wider">Work Reports</h3>
                            <p className="text-2xl font-black text-secondary-900 mt-1">{data.hrStats.totalReports} Filed</p>
                        </div>
                        <div className="stat-card border-l-4 border-warning-500">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl">🏝️</span>
                            </div>
                            <h3 className="text-secondary-500 text-xs font-bold uppercase tracking-wider">Pending Leaves</h3>
                            <p className="text-2xl font-black text-secondary-900 mt-1">{data.hrStats.pendingLeaves} Requests</p>
                        </div>
                        <div className="stat-card border-l-4 border-indigo-500">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl">🎓</span>
                            </div>
                            <h3 className="text-secondary-500 text-xs font-bold uppercase tracking-wider">LMS Progress</h3>
                            <p className="text-2xl font-black text-secondary-900 mt-1">On Track</p>
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats?.map((stat: any) => (
                        <div key={stat.name} className="stat-card">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`stat-card-icon ${stat.color} text-white`}>
                                    {stat.icon}
                                </div>
                            </div>
                            <h3 className="text-secondary-600 text-sm font-medium">{stat.name}</h3>
                            <p className="text-3xl font-bold text-secondary-900 mt-2">{stat.value}</p>
                            <p className={`text-sm mt-2 ${stat.changePositive ? 'text-success-600' : 'text-warning-600'}`}>
                                {stat.change}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Column - Left 2/3 */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Recent Activity */}
                        <div className="card-premium h-full">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-secondary-900">Recent Activity</h2>
                                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                                    View all
                                </button>
                            </div>
                            <div className="space-y-4">
                                {recentActivities?.map((activity: any) => (
                                    <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b border-secondary-100 last:border-0 last:pb-0">
                                        <div className="text-2xl">{activity.icon}</div>
                                        <div className="flex-1">
                                            <p className="text-secondary-900">{activity.message}</p>
                                            <p className="text-sm text-secondary-500 mt-1">{activity.time}</p>
                                        </div>
                                    </div>
                                ))}
                                {(!recentActivities || recentActivities.length === 0) && (
                                    <p className="text-secondary-500 text-center py-4 italic">No recent activity found.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Column - Right 1/3 */}
                    <div className="space-y-6">
                        {/* Executive AI & Market Widgets */}
                        {['SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'].includes(userRole) && (
                            <>
                                <CashflowWidget />
                                <AIInsightsWidget role={userRole} />
                                <MarketMonitor />
                            </>
                        )}

                        {/* Announcements for Management or Bulletin Board */}
                        <div className="card-premium">
                            <h2 className="text-xl font-bold text-secondary-900 mb-6 flex items-center gap-2">
                                <span className="text-2xl">📢</span> Announcement Board
                            </h2>
                            <BulletinBoard limit={3} />
                        </div>

                        {/* Subscription Request Banner for Customers */}
                        {userRole === 'CUSTOMER' ? (
                            <div className="card-premium bg-gradient-to-br from-primary-600 to-primary-800 text-white border-0">
                                <div className="h-full flex flex-col justify-between">
                                    <div>
                                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Limited Offer</span>
                                        <h2 className="text-2xl font-bold mt-4">Expand Your Library</h2>
                                        <p className="mt-2 text-primary-100 text-sm">
                                            Request access to premium academic journals and stay ahead in your research field.
                                        </p>
                                    </div>
                                    <div className="mt-8">
                                        <Link
                                            href="/dashboard/subscriptions/new"
                                            className="inline-flex items-center px-6 py-3 bg-white text-primary-700 font-bold rounded-xl hover:bg-primary-50 transition-all shadow-lg text-sm"
                                        >
                                            Browse Journals
                                            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Upcoming Renewals for Staff */
                            <div className="card-premium">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-secondary-900">Upcoming Renewals</h2>
                                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                                        View all
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {upcomingRenewals?.map((renewal: any) => (
                                        <div key={renewal.id} className="p-4 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors group text-sm">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h4 className="font-semibold text-secondary-900">{renewal.customer}</h4>
                                                    <p className="text-xs text-secondary-600">{renewal.journal}</p>
                                                </div>
                                                <span className={`badge text-[10px] ${renewal.status === 'auto-renew' ? 'badge-success' : 'badge-warning'}`}>
                                                    {renewal.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-secondary-600 text-[10px]">Due: {renewal.dueDate}</span>
                                                <span className="font-bold text-secondary-900">{renewal.amount}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!upcomingRenewals || upcomingRenewals.length === 0) && (
                                        <p className="text-secondary-500 text-center py-4 italic text-sm">No upcoming renewals found.</p>
                                    )}
                                </div>
                            </div>
                        )}
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

                        {userRole !== 'CUSTOMER' && (
                            <Link href="/dashboard/customers/new" className="flex flex-col items-center justify-center p-6 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors text-center">
                                <span className="text-3xl mb-2">👥</span>
                                <span className="text-xs font-bold uppercase tracking-widest text-secondary-900">Add {userRole === 'AGENCY' ? 'Client' : 'Customer'}</span>
                            </Link>
                        )}

                        {['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE', 'TEAM_LEADER'].includes(userRole) && (
                            <Link href="/dashboard/customers" className="flex flex-col items-center justify-center p-6 bg-white border border-secondary-100 rounded-2xl hover:bg-secondary-50 transition-all text-center group shadow-sm">
                                <span className="text-3xl mb-3 group-hover:scale-110 transition-transform">💬</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-secondary-500">Log Activity</span>
                            </Link>
                        )}

                        {!['CUSTOMER', 'AGENCY'].includes(userRole) && (
                            <>
                                <Link href="/dashboard/staff-portal" className="flex flex-col items-center justify-center p-6 bg-white border border-secondary-100 rounded-2xl hover:bg-secondary-50 transition-all text-center group shadow-sm">
                                    <span className="text-3xl mb-3 group-hover:scale-110 transition-transform">🏢</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-secondary-500">Punch Attendance</span>
                                </Link>
                                <Link href="/dashboard/staff-portal" className="flex flex-col items-center justify-center p-6 bg-white border border-secondary-100 rounded-2xl hover:bg-secondary-50 transition-all text-center group shadow-sm">
                                    <span className="text-3xl mb-3 group-hover:scale-110 transition-transform">📝</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-secondary-500">Daily Report</span>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
