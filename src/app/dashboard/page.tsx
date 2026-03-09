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
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
            <div className="text-center">
                <div className="relative w-14 h-14 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin"></div>
                    <div className="absolute inset-2 rounded-full" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)' }}></div>
                </div>
                <p className="text-slate-600 font-semibold text-sm">Crunching your dashboard data...</p>
                <p className="text-slate-400 text-xs mt-1">Just a moment</p>
            </div>
        </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
            <div className="text-center max-w-md px-6">
                <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4 text-3xl">⚠️</div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
                <p className="text-slate-500 mb-6 text-sm">{error}</p>
                <button onClick={fetchDashboardData} className="btn btn-primary">
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Welcome back, <span className="text-gradient-blue">{userName}</span>! 👋
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            {['CUSTOMER', 'AGENCY'].includes(userRole)
                                ? "Here's what's happening with your subscriptions today"
                                : "Here's your professional overview for today"}
                        </p>
                    </div>
                    <div>
                        {['CUSTOMER', 'AGENCY'].includes(userRole) ? (
                            <Link href="/dashboard/crm/subscriptions/new" className="btn btn-primary text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                New Subscription
                            </Link>
                        ) : (
                            <Link href="/dashboard/staff-portal" className="btn btn-primary text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                My Staff Portal
                            </Link>
                        )}
                    </div>
                </div>

                {/* HR Quick Stats for Staff */}
                {data.hrStats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="stat-card-premium">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl metric-icon-blue flex items-center justify-center text-lg">🕒</div>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${data.hrStats.hasCheckedIn ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                    {data.hrStats.hasCheckedIn ? 'Checked In' : 'Not Checked In'}
                                </span>
                            </div>
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Attendance</h3>
                            <p className="text-2xl font-black text-slate-900 mt-1">{data.hrStats.totalAttendance} <span className="text-sm font-semibold text-slate-400">Days</span></p>
                        </div>
                        <div className="stat-card-premium">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl metric-icon-purple flex items-center justify-center text-lg">📝</div>
                            </div>
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Work Reports</h3>
                            <p className="text-2xl font-black text-slate-900 mt-1">{data.hrStats.totalReports} <span className="text-sm font-semibold text-slate-400">Filed</span></p>
                        </div>
                        <div className="stat-card-premium">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl metric-icon-amber flex items-center justify-center text-lg">🏝️</div>
                            </div>
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Pending Leaves</h3>
                            <p className="text-2xl font-black text-slate-900 mt-1">{data.hrStats.pendingLeaves} <span className="text-sm font-semibold text-slate-400">Requests</span></p>
                        </div>
                        <div className="stat-card-premium">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl metric-icon-green flex items-center justify-center text-lg">🎓</div>
                            </div>
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">LMS Progress</h3>
                            <p className="text-2xl font-black text-slate-900 mt-1">On Track</p>
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats?.map((stat: any) => (
                        <div key={stat.name} className="stat-card-premium">
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${stat.color}`}>
                                    {stat.icon}
                                </div>
                                {stat.change && (
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stat.changePositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                                        {stat.changePositive ? '↑' : '↓'} {stat.change}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-slate-500 text-xs font-semibold">{stat.name}</h3>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Column - Left 2/3 */}
                    <div className="lg:col-span-2 space-y-5">
                        {/* Recent Activity */}
                        <div className="card-premium h-full">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-sm">⚡</span>
                                    Recent Activity
                                </h2>
                                <button className="text-blue-600 hover:text-blue-700 text-xs font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                                    View all
                                </button>
                            </div>
                            <div className="space-y-0">
                                {recentActivities?.map((activity: any) => (
                                    <div key={activity.id} className="activity-item">
                                        <div className="activity-avatar bg-blue-50 text-blue-600">{activity.icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-800 font-medium leading-snug">{activity.message}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{activity.time}</p>
                                        </div>
                                    </div>
                                ))}
                                {(!recentActivities || recentActivities.length === 0) && (
                                    <div className="py-10 text-center">
                                        <div className="text-3xl mb-2">📭</div>
                                        <p className="text-sm text-slate-400">No recent activity found.</p>
                                    </div>
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
                                            href="/dashboard/crm/subscriptions/new"
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
                    <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-sm">⚡</span>
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Link href="/dashboard/crm/subscriptions/new" className="quick-action-card group">
                            <span className="quick-action-card-icon">📋</span>
                            <span className="quick-action-card-label">New Subscription</span>
                        </Link>

                        {userRole !== 'CUSTOMER' && (
                            <Link href="/dashboard/customers/new" className="quick-action-card group">
                                <span className="quick-action-card-icon">👥</span>
                                <span className="quick-action-card-label">Add {userRole === 'AGENCY' ? 'Client' : 'Customer'}</span>
                            </Link>
                        )}

                        {['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE', 'TEAM_LEADER'].includes(userRole) && (
                            <Link href="/dashboard/customers" className="quick-action-card group">
                                <span className="quick-action-card-icon">💬</span>
                                <span className="quick-action-card-label">Log Activity</span>
                            </Link>
                        )}

                        {!['CUSTOMER', 'AGENCY'].includes(userRole) && (
                            <>
                                <Link href="/dashboard/staff-portal" className="quick-action-card group">
                                    <span className="quick-action-card-icon">🏢</span>
                                    <span className="quick-action-card-label">Punch Attendance</span>
                                </Link>
                                <Link href="/dashboard/staff-portal" className="quick-action-card group">
                                    <span className="quick-action-card-icon">📝</span>
                                    <span className="quick-action-card-label">Daily Report</span>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
