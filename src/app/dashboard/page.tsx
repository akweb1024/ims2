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
            <div className="space-y-6 page-animate">
                {['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'].includes(userRole) && (
                    <RevenueMismatchAlert />
                )}
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 text-[10px] font-black uppercase tracking-wider border border-blue-500/20">
                                Global Dashboard
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Real-time Analytics
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{userName}</span>! 👋
                        </h1>
                        <p className="text-slate-500 text-sm font-medium">
                            {['CUSTOMER', 'AGENCY'].includes(userRole)
                                ? "Overview of your active subscriptions and support engagement."
                                : "Your unified command center for enterprise operations today."}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {['CUSTOMER', 'AGENCY'].includes(userRole) ? (
                            <Link href="/dashboard/crm/subscriptions/new" className="group relative px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/10 overflow-hidden">
                                <span className="relative z-10 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    New Subscription
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </Link>
                        ) : (
                            <Link href="/dashboard/staff-portal" className="group flex items-center gap-3 px-5 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-sm text-slate-700 hover:border-blue-200 hover:bg-blue-50/30 transition-all shadow-sm">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                My Staff Portal
                            </Link>
                        )}
                    </div>
                </div>

                {/* HR Quick Stats for Staff */}
                {data.hrStats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        <div className="glass-card-premium p-6 group">
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">🕒</div>
                                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${data.hrStats.hasCheckedIn ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                    {data.hrStats.hasCheckedIn ? 'Active Now' : 'Pending'}
                                </span>
                            </div>
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">Attendance</h3>
                            <div className="flex items-baseline gap-2 relative z-10">
                                <p className="text-3xl font-black text-slate-900 leading-none">{data.hrStats.totalAttendance}</p>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Days</span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-100/50 flex items-center justify-between relative z-10">
                                <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden mr-3">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '85%' }}></div>
                                </div>
                                <span className="text-[10px] font-bold text-blue-600">85%</span>
                            </div>
                        </div>

                        <div className="glass-card-premium p-6 group">
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">📝</div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Monthly</span>
                            </div>
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">Work Reports</h3>
                            <div className="flex items-baseline gap-2 relative z-10">
                                <p className="text-3xl font-black text-slate-900 leading-none">{data.hrStats.totalReports}</p>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Filed</span>
                            </div>
                            <div className="mt-4 flex -space-x-2 relative z-10">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400">R{i}</div>
                                ))}
                            </div>
                        </div>

                        <div className="glass-card-premium p-6 group">
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">🏝️</div>
                                {data.hrStats.pendingLeaves > 0 && <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping"></span>}
                            </div>
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">Leave Requests</h3>
                            <div className="flex items-baseline gap-2 relative z-10">
                                <p className="text-3xl font-black text-slate-900 leading-none">{data.hrStats.pendingLeaves}</p>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Pending</span>
                            </div>
                            <p className="mt-4 text-[10px] font-bold text-slate-400 italic relative z-10">4.5 days balance remaining</p>
                        </div>

                        <div className="glass-card-premium p-6 group">
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">🎓</div>
                                <div className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    On Track
                                </div>
                            </div>
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">LMS Learning</h3>
                            <div className="flex items-baseline gap-2 relative z-10">
                                <p className="text-3xl font-black text-slate-900 leading-none">Level 4</p>
                            </div>
                            <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase text-slate-400 tracking-tighter relative z-10">
                                <span>Exp.</span>
                                <div className="h-1 flex-1 mx-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: '65%' }}></div>
                                </div>
                                <span>650/1000</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {stats?.map((stat: any, idx: number) => (
                        <div
                            key={stat.name}
                            className="glass-card-premium p-6 group overflow-hidden relative"
                        >
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-transform group-hover:scale-110 ${stat.color || 'bg-slate-50 text-slate-600'}`}>
                                    {stat.icon}
                                </div>
                                {stat.change && (
                                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${stat.changePositive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                        {stat.changePositive ? '↑' : '↓'} {stat.change}
                                    </div>
                                )}
                            </div>
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">{stat.name}</h3>
                            <p className="text-3xl font-black text-slate-900 leading-none relative z-10 tracking-tight">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Dynamic Analytics & Interactivity Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
                    {/* Left & Middle Column (Activities & Detailed Stats) */}
                    <div className="lg:col-span-8 space-y-7">
                        {/* Executive AI & Financial Insights */}
                        {['SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'].includes(userRole) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                                <CashflowWidget />
                                <AIInsightsWidget role={userRole} />
                            </div>
                        )}

                        {/* Recent Activity Feed */}
                        <div className="glass-card-premium p-6 group">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
                                    Operational Flux
                                </h2>
                                <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-all active:scale-95">
                                    View Full History
                                </button>
                            </div>
                            <div className="space-y-1">
                                {recentActivities?.map((activity: any, idx: number) => (
                                    <div key={activity.id} className="relative group/item">
                                        {idx !== recentActivities.length - 1 && (
                                            <div className="absolute left-[21px] top-10 bottom-0 w-0.5 bg-slate-100 group-hover/item:bg-blue-100 transition-colors"></div>
                                        )}
                                        <div className="flex items-start gap-4 p-4 rounded-2xl transition-all duration-300 hover:bg-slate-50 relative z-10">
                                            <div className="w-11 h-11 shrink-0 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-lg group-hover/item:scale-110 group-hover/item:border-blue-200 transition-transform">
                                                {activity.icon}
                                            </div>
                                            <div className="flex-1 min-w-0 pt-1">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <p className="text-sm text-slate-900 font-bold leading-none truncate">{activity.message}</p>
                                                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{activity.time}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 font-medium">System Interaction Log #{activity.id.slice(-6)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!recentActivities || recentActivities.length === 0) && (
                                    <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                                        <div className="text-4xl mb-3">📡</div>
                                        <p className="text-sm font-bold text-slate-400 tracking-tight">Listening for signals...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Market Monitor - Integrated as a wide card if single, or grid item */}
                        {['SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'].includes(userRole) && (
                            <div className="glass-card-premium p-1 overflow-hidden">
                                <MarketMonitor />
                            </div>
                        )}
                    </div>

                    {/* Right Column (Notifications & Bulletins) */}
                    <div className="lg:col-span-4 space-y-7">
                        <div className="glass-card-premium p-6 h-full flex flex-col shadow-blue-500/[0.02]">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    <span className="w-2 h-6 bg-amber-500 rounded-full"></span>
                                    Briefing Room
                                </h2>
                                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">📢</div>
                            </div>
                            <BulletinBoard limit={5} />
                        </div>
                    </div>
                </div>

                {/* Contextual Intelligence & Support Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
                    <div className="lg:col-span-8 space-y-7">
                        {/* Quick Actions - Now more prominent */}
                        <div className="glass-card-premium p-6 group">
                            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2 tracking-tight">
                                <span className="w-2 h-6 bg-slate-400 rounded-full"></span>
                                Tactical Shortcuts
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Link href="/dashboard/crm/subscriptions/new" className="quick-action-card group/btn">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover/btn:scale-110 transition-transform mb-3">📋</div>
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">New Subscription</span>
                                </Link>

                                {userRole !== 'CUSTOMER' && (
                                    <Link href="/dashboard/customers/new" className="quick-action-card group/btn">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl group-hover/btn:scale-110 transition-transform mb-3">👥</div>
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Add {userRole === 'AGENCY' ? 'Client' : 'Customer'}</span>
                                    </Link>
                                )}

                                {['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE', 'TEAM_LEADER'].includes(userRole) && (
                                    <Link href="/dashboard/customers" className="quick-action-card group/btn">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl group-hover/btn:scale-110 transition-transform mb-3">💬</div>
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Log Activity</span>
                                    </Link>
                                )}

                                {!['CUSTOMER', 'AGENCY'].includes(userRole) && (
                                    <Link href="/dashboard/staff-portal" className="quick-action-card group/btn">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl group-hover/btn:scale-110 transition-transform mb-3">🏢</div>
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Attendance</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-7">
                        {/* Subscription Request Banner for Customers */}
                        {userRole === 'CUSTOMER' ? (
                            <div className="glass-card-premium bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-0 overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                <div className="p-7 relative z-10 flex flex-col justify-between h-full min-h-[280px]">
                                    <div>
                                        <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Premium Access</span>
                                        <h2 className="text-2xl font-black mt-4 leading-tight">Elevate Your Research</h2>
                                        <p className="mt-2 text-blue-100 text-xs font-medium leading-relaxed">
                                            Unlock massive repositories of academic journals and stay ahead.
                                        </p>
                                    </div>
                                    <Link
                                        href="/dashboard/crm/subscriptions/new"
                                        className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 font-black rounded-2xl hover:bg-blue-50 transition-all shadow-xl text-[10px] uppercase tracking-widest active:scale-95"
                                    >
                                        Explore Journals
                                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            /* Upcoming Renewals for Staff */
                            <div className="glass-card-premium p-6 group">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Active Pulse</h2>
                                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">Checkouts</span>
                                </div>
                                <div className="space-y-3">
                                    {upcomingRenewals?.slice(0, 3).map((renewal: any) => (
                                        <div key={renewal.id} className="p-4 bg-slate-50/50 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                                            <div className="flex items-start justify-between mb-1">
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-slate-900 truncate text-[13px]">{renewal.customer}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight truncate">{renewal.journal}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                <span>{renewal.dueDate}</span>
                                                <span className="text-emerald-600">{renewal.amount}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!upcomingRenewals || upcomingRenewals.length === 0) && (
                                        <p className="text-slate-400 text-center py-6 italic text-xs font-medium">Clear horizon. No renewals.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
