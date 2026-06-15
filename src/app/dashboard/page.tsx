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
import { formatToISTDate } from '@/lib/date-utils';

export default function DashboardPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const userRole = (session?.user as any)?.role;
    const [loadingData, setLoadingData] = useState(false);
    const [data, setData] = useState<any>({
        stats: [],
        recentActivities: [],
        upcomingRenewals: []
    });
    const [attendance, setAttendance] = useState<any[]>([]);
    const [teamAttendanceSummary, setTeamAttendanceSummary] = useState<{
        totalActiveTeamMembers: number;
        present: number;
        absent: number;
        out: number;
    } | null>(null);
    const [checkingIn, setCheckingIn] = useState(false);
    const [workFromMode, setWorkFromMode] = useState<'OFFICE' | 'REMOTE'>('OFFICE');
    const [elapsedTime, setElapsedTime] = useState('00h 00m 00s');
    const [remainingTime, setRemainingTime] = useState('08h 30m 00s');

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

    const fetchTodayAttendance = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();
            const res = await fetch(`/api/hr/attendance?year=${year}&month=${month}`, { headers });
            if (res.ok) {
                setAttendance(await res.json());
            }
        } catch (err) {
            console.error('Failed to fetch attendance for dashboard', err);
        }
    }, []);

    const fetchTeamAttendanceSummary = useCallback(async () => {
        const canViewTeamAttendance = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(userRole);

        if (!canViewTeamAttendance) {
            setTeamAttendanceSummary(null);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();
            const todayKey = formatToISTDate(now);

            const [membersRes, attendanceRes] = await Promise.all([
                fetch('/api/manager/team/members', { headers }),
                fetch(`/api/manager/team/attendance?year=${year}&month=${month}`, { headers })
            ]);

            if (membersRes.status === 401 || attendanceRes.status === 401) {
                router.push('/login');
                return;
            }

            if (!membersRes.ok || !attendanceRes.ok) {
                throw new Error('Failed to load team attendance summary');
            }

            const membersData = await membersRes.json();
            const attendanceData = await attendanceRes.json();
            const teamMembers = Array.isArray(membersData?.teamMembers) ? membersData.teamMembers : [];
            const monthlyAttendance = Array.isArray(attendanceData?.attendance) ? attendanceData.attendance : [];

            const activeTeamMembers = teamMembers.filter((member: any) => member?.isActive !== false);
            const todayAttendanceMap = new Map<string, any>();

            monthlyAttendance
                .filter((record: any) => formatToISTDate(record.date) === todayKey)
                .forEach((record: any) => {
                    const userId = record?.employee?.userId;
                    if (!userId) return;

                    const existing = todayAttendanceMap.get(userId);
                    if (!existing) {
                        todayAttendanceMap.set(userId, record);
                        return;
                    }

                    // Prefer the record that has a checkout if there are duplicates for the day.
                    if (!existing.checkOut && record.checkOut) {
                        todayAttendanceMap.set(userId, record);
                    }
                });

            const present = activeTeamMembers.filter((member: any) => {
                const record = todayAttendanceMap.get(member.userId);
                return !!record?.checkIn;
            }).length;

            const out = activeTeamMembers.filter((member: any) => {
                const record = todayAttendanceMap.get(member.userId);
                return !!record?.checkIn && !!record?.checkOut;
            }).length;

            setTeamAttendanceSummary({
                totalActiveTeamMembers: activeTeamMembers.length,
                present,
                absent: Math.max(0, activeTeamMembers.length - present),
                out
            });
        } catch (err) {
            console.error('Failed to fetch team attendance summary', err);
            setTeamAttendanceSummary(null);
        }
    }, [router, userRole]);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchDashboardData();
            fetchTodayAttendance();
            fetchTeamAttendanceSummary();
        }
    }, [status, router, fetchDashboardData, fetchTodayAttendance, fetchTeamAttendanceSummary]);

    const todayAttendance = attendance.find(a => {
        return formatToISTDate(a.date) === formatToISTDate(new Date());
    });

    // Timer Logic
    useEffect(() => {
        if (todayAttendance?.checkIn && !todayAttendance?.checkOut) {
            const calculateTime = () => {
                const now = new Date();
                const checkIn = new Date(todayAttendance.checkIn);
                const diffMs = now.getTime() - checkIn.getTime();

                // Calculate Working Hours
                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
                setElapsedTime(`${hours}h ${minutes}m ${seconds}s`);

                // Calculate Remaining (Target: 8h 30m)
                const targetMs = 8.5 * 60 * 60 * 1000;
                const remainingMs = targetMs - diffMs;

                if (remainingMs > 0) {
                    const rHours = Math.floor(remainingMs / (1000 * 60 * 60));
                    const rMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                    const rSeconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
                    setRemainingTime(`${rHours}h ${rMinutes}m ${rSeconds}s`);
                } else {
                    setRemainingTime('Overtime');
                }
            };

            calculateTime();
            const interval = setInterval(calculateTime, 1000);
            return () => clearInterval(interval);
        }
    }, [todayAttendance]);

    const handleAttendance = async (action: 'check-in' | 'check-out') => {
        setCheckingIn(true);
        try {
            let locationData: any = {};
            if ("geolocation" in navigator) {
                try {
                    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject);
                    });
                    locationData = {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    };
                } catch (e) {
                }
            }

            const token = localStorage.getItem('token');
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            headers['Content-Type'] = 'application/json';

            const res = await fetch('/api/hr/attendance', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    action,
                    workFrom: workFromMode,
                    ...locationData
                })
            });

            if (res.ok) {
                await fetchTodayAttendance();
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setCheckingIn(false);
        }
    };

    if (status === 'loading' || loadingData) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="text-center">
                <div className="relative w-14 h-14 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-border/50"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
                    <div className="absolute inset-2 rounded-full bg-primary/10"></div>
                </div>
                <p className="text-sm font-semibold text-foreground">Crunching your dashboard data...</p>
                <p className="mt-1 text-xs text-muted-foreground">Just a moment</p>
            </div>
        </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="text-center max-w-md px-6">
                <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4 text-3xl">⚠️</div>
                <h2 className="mb-2 text-xl font-bold text-foreground">Something went wrong</h2>
                <p className="mb-6 text-sm text-muted-foreground">{error}</p>
                <button onClick={fetchDashboardData} className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                    Try Again
                </button>
            </div>
        </div>
        );
    }

    const { stats, recentActivities, upcomingRenewals } = data;
    const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'User';
    const isStaff = !['CUSTOMER', 'AGENCY'].includes(userRole);
    const teamSummaryCards = teamAttendanceSummary ? [
        {
            label: 'Total Active Team Members',
            value: teamAttendanceSummary.totalActiveTeamMembers,
            icon: '👥',
            tone: 'bg-primary/10 text-primary',
            note: 'Active employees assigned to your team'
        },
        {
            label: 'Present',
            value: teamAttendanceSummary.present,
            icon: '🟢',
            tone: 'bg-emerald-500/10 text-emerald-600',
            note: 'Checked in today'
        },
        {
            label: 'Absent',
            value: teamAttendanceSummary.absent,
            icon: '⚪',
            tone: 'bg-muted text-muted-foreground',
            note: 'No check-in today'
        },
        {
            label: 'Out',
            value: teamAttendanceSummary.out,
            icon: '🚪',
            tone: 'bg-amber-500/10 text-amber-600',
            note: 'Checked in and checked out today'
        }
    ] : [];

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
                            <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
                                Global Dashboard
                            </span>
                            <span className="h-1 w-1 rounded-full bg-border"></span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                Real-time Analytics
                            </span>
                        </div>
                        <h1 className="text-3xl font-black leading-tight tracking-tight text-foreground md:text-4xl">
                            Welcome back, <span className="bg-gradient-to-r from-primary to-chart-3 bg-clip-text text-transparent">{userName}</span>! 👋
                        </h1>
                        <p className="text-sm font-medium text-muted-foreground">
                            {['CUSTOMER', 'AGENCY'].includes(userRole)
                                ? "Overview of your active subscriptions and support engagement."
                                : "Your unified command center for enterprise operations today."}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {['CUSTOMER', 'AGENCY'].includes(userRole) ? (
                            <Link href="/dashboard/crm/subscriptions/new" className="group relative px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20 overflow-hidden">
                                <span className="relative z-10 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    New Subscription
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-primary to-chart-3 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </Link>
                        ) : (
                            <Link href="/dashboard/staff-portal" className="group flex items-center gap-3 px-5 py-3 bg-card border border-border rounded-2xl font-bold text-sm text-foreground hover:border-primary/30 hover:bg-accent transition-all shadow-sm">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                My Staff Portal
                            </Link>
                        )}
                    </div>
                </div>

                {/* Check In/Out + Timer */}
                {isStaff && (
                    <div className="glass-card border-border/60 p-6 shadow-sm md:flex md:flex-row md:items-center md:justify-between md:p-8">
                        <div>
                            <h2 className="text-xl font-black text-foreground">Attendance Control</h2>
                            <p className="text-muted-foreground text-sm font-medium">Track your shift time right from the dashboard.</p>
                        </div>

                        <div className="flex flex-col items-start md:items-end gap-3">
                            {todayAttendance?.checkIn && !todayAttendance.checkOut && (
                                <div className="flex gap-4">
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Working</p>
                                        <p className="font-black text-foreground text-lg">{elapsedTime}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Remaining</p>
                                        <p className={`font-black text-lg ${remainingTime === 'Overtime' ? 'text-success-600' : 'text-primary'}`}>{remainingTime}</p>
                                    </div>
                                </div>
                            )}

                            {!todayAttendance?.checkIn && (
                                <div className="flex gap-2 p-1 bg-muted rounded-xl">
                                    <button
                                        onClick={() => setWorkFromMode('OFFICE')}
                                        className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${workFromMode === 'OFFICE' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        Office
                                    </button>
                                    <button
                                        onClick={() => setWorkFromMode('REMOTE')}
                                        className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${workFromMode === 'REMOTE' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        Remote
                                    </button>
                                </div>
                            )}

                            {!todayAttendance?.checkIn ? (
                                <button
                                    onClick={() => handleAttendance('check-in')}
                                    disabled={checkingIn}
                                    className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                                >
                                    {checkingIn ? '...' : `Check In (${workFromMode})`}
                                    <span className="group-hover:translate-x-1 transition-transform">🕒</span>
                                </button>
                            ) : !todayAttendance?.checkOut ? (
                                <button
                                    onClick={() => handleAttendance('check-out')}
                                    disabled={checkingIn}
                                    className="inline-flex h-9 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-semibold text-background shadow-sm transition-colors hover:opacity-90"
                                >
                                    {checkingIn ? '...' : 'Check Out'} 🚪
                                </button>
                            ) : (
                                <div className="bg-accent text-accent-foreground px-6 py-3 rounded-2xl border border-border font-bold flex items-center gap-2">
                                    ✅ Shift Completed
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {teamAttendanceSummary && (
                    <div className="glass-card p-6 shadow-sm">
                        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-black text-foreground">Today's Team Attendance</h2>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Live snapshot for the logged-in user's team
                                </p>
                            </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Out is included in Present
                        </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {teamSummaryCards.map((card) => (
                                <div key={card.label} className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg ${card.tone}`}>
                                            {card.icon}
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            Today
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                                        {card.label}
                                    </p>
                                    <div className="flex items-end gap-2">
                                        <p className="text-3xl font-black leading-none text-foreground">{card.value}</p>
                                    </div>
                                    <p className="mt-3 text-xs font-medium text-muted-foreground">
                                        {card.note}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* HR Quick Stats for Staff */}
                {data.hrStats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        <div className="glass-card p-6 group">
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">🕒</div>
                                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${data.hrStats.hasCheckedIn ? 'bg-primary/10 text-primary border-primary/20' : 'bg-accent text-accent-foreground border-border/60'}`}>
                                    {data.hrStats.hasCheckedIn ? 'Active Now' : 'Pending'}
                                </span>
                            </div>
                            <h3 className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">Attendance</h3>
                            <div className="flex items-baseline gap-2 relative z-10">
                                <p className="text-3xl font-black text-foreground leading-none">{data.hrStats.totalAttendance}</p>
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Days</span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between relative z-10">
                                <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden mr-3">
                                    <div className="h-full bg-primary rounded-full" style={{ width: '85%' }}></div>
                                </div>
                                <span className="text-[10px] font-bold text-primary">85%</span>
                            </div>
                        </div>

                        <div className="glass-card p-6 group">
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-chart-3/10 text-chart-3 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">📝</div>
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted/50 px-2 py-1 rounded-md border border-border/60">Monthly</span>
                            </div>
                            <h3 className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">Work Reports</h3>
                            <div className="flex items-baseline gap-2 relative z-10">
                                <p className="text-3xl font-black text-foreground leading-none">{data.hrStats.totalReports}</p>
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Filed</span>
                            </div>
                            <div className="mt-4 flex -space-x-2 relative z-10">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">R{i}</div>
                                ))}
                            </div>
                        </div>

                        <div className="glass-card p-6 group">
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">🏝️</div>
                                {data.hrStats.pendingLeaves > 0 && <span className="h-2.5 w-2.5 rounded-full bg-accent-foreground/60 animate-ping"></span>}
                            </div>
                            <h3 className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">Leave Requests</h3>
                            <div className="flex items-baseline gap-2 relative z-10">
                                <p className="text-3xl font-black text-foreground leading-none">{data.hrStats.pendingLeaves}</p>
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Pending</span>
                            </div>
                            <p className="mt-4 text-[10px] font-bold text-muted-foreground italic relative z-10">4.5 days balance remaining</p>
                        </div>

                        <div className="glass-card p-6 group">
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">🎓</div>
                                <div className="text-[10px] font-black text-primary flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                    On Track
                                </div>
                            </div>
                            <h3 className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">LMS Learning</h3>
                            <div className="flex items-baseline gap-2 relative z-10">
                                <p className="text-3xl font-black text-foreground leading-none">Level 4</p>
                            </div>
                            <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase text-muted-foreground tracking-tighter relative z-10">
                                <span>Exp.</span>
                                <div className="h-1 flex-1 mx-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: '65%' }}></div>
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
                            className="glass-card relative overflow-hidden p-6"
                        >
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-transform group-hover:scale-110 ${stat.color || 'bg-muted/50 text-muted-foreground'}`}>
                                    {stat.icon}
                                </div>
                                {stat.change && (
                                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${stat.changePositive ? 'bg-primary/10 text-primary border-primary/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                                        {stat.changePositive ? '↑' : '↓'} {stat.change}
                                    </div>
                                )}
                            </div>
                            <h3 className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">{stat.name}</h3>
                            <p className="text-3xl font-black text-foreground leading-none relative z-10 tracking-tight">{stat.value}</p>
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
                        <div className="glass-card p-6 group">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
                                    <span className="w-2 h-6 bg-chart-3 rounded-full"></span>
                                    Operational Flux
                                </h2>
                                <button className="rounded-md border border-border bg-card px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary transition-colors hover:bg-accent">
                                    View Full History
                                </button>
                            </div>
                            <div className="space-y-1">
                                {recentActivities?.map((activity: any, idx: number) => (
                                    <div key={activity.id} className="relative group/item">
                                        {idx !== recentActivities.length - 1 && (
                                            <div className="absolute left-[21px] top-10 bottom-0 w-0.5 bg-muted group-hover/item:bg-primary/10 transition-colors"></div>
                                        )}
                                        <div className="flex items-start gap-4 p-4 rounded-2xl transition-all duration-300 hover:bg-muted/50 relative z-10">
                                            <div className="w-11 h-11 shrink-0 rounded-2xl bg-white border border-border/60 shadow-sm flex items-center justify-center text-lg group-hover/item:scale-110 group-hover/item:border-primary/40 transition-transform">
                                                {activity.icon}
                                            </div>
                                            <div className="flex-1 min-w-0 pt-1">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <p className="text-sm text-foreground font-bold leading-none truncate">{activity.message}</p>
                                                    <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">{activity.time}</span>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground font-medium">System Interaction Log #{activity.id.slice(-6)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!recentActivities || recentActivities.length === 0) && (
                                    <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                                        <div className="text-4xl mb-3">📡</div>
                                        <p className="text-sm font-bold text-muted-foreground tracking-tight">Listening for signals...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Market Monitor - Integrated as a wide card if single, or grid item */}
                        {['SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'].includes(userRole) && (
                            <div className="glass-card p-1 overflow-hidden">
                                <MarketMonitor />
                            </div>
                        )}
                    </div>

                    {/* Right Column (Notifications & Bulletins) */}
                    <div className="lg:col-span-4 space-y-7">
                        <div className="glass-card p-6 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
                                    <span className="h-6 w-2 rounded-full bg-accent-foreground/60"></span>
                                    Briefing Room
                                </h2>
                                <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center text-xl">📢</div>
                            </div>
                            <BulletinBoard limit={5} />
                        </div>
                    </div>
                </div>

                {/* Contextual Intelligence & Support Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
                    <div className="lg:col-span-8 space-y-7">
                        {/* Quick Actions - Now more prominent */}
                        <div className="glass-card p-6 group">
                            <h2 className="text-xl font-black text-foreground mb-6 flex items-center gap-2 tracking-tight">
                                <span className="h-6 w-2 rounded-full bg-muted-foreground/60"></span>
                                Tactical Shortcuts
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Link href="/dashboard/crm/subscriptions/new" className="quick-action-card group/btn">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl group-hover/btn:scale-110 transition-transform mb-3">📋</div>
                                    <span className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">New Subscription</span>
                                </Link>

                                {userRole !== 'CUSTOMER' && (
                                    <Link href="/dashboard/customers/new" className="quick-action-card group/btn">
                                        <div className="w-12 h-12 rounded-2xl bg-chart-3/10 text-chart-3 flex items-center justify-center text-xl group-hover/btn:scale-110 transition-transform mb-3">👥</div>
                                        <span className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">Add {userRole === 'AGENCY' ? 'Client' : 'Customer'}</span>
                                    </Link>
                                )}

                                {['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE', 'TEAM_LEADER'].includes(userRole) && (
                                    <Link href="/dashboard/customers" className="quick-action-card group/btn">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl group-hover/btn:scale-110 transition-transform mb-3">💬</div>
                                        <span className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">Log Activity</span>
                                    </Link>
                                )}

                                {!['CUSTOMER', 'AGENCY'].includes(userRole) && (
                                    <Link href="/dashboard/staff-portal" className="quick-action-card group/btn">
                                        <div className="w-12 h-12 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center text-xl group-hover/btn:scale-110 transition-transform mb-3">🏢</div>
                                        <span className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">Attendance</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-7">
                        {/* Subscription Request Banner for Customers */}
                        {userRole === 'CUSTOMER' ? (
                            <div className="glass-card relative overflow-hidden border-0 bg-gradient-to-br from-chart-3 to-primary text-primary-foreground">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                <div className="p-7 relative z-10 flex flex-col justify-between h-full min-h-[280px]">
                                    <div>
                                        <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Premium Access</span>
                                        <h2 className="text-2xl font-black mt-4 leading-tight">Elevate Your Research</h2>
                                        <p className="mt-2 text-primary-foreground/80 text-xs font-medium leading-relaxed">
                                            Unlock massive repositories of academic journals and stay ahead.
                                        </p>
                                    </div>
                                    <Link
                                        href="/dashboard/crm/subscriptions/new"
                                        className="inline-flex items-center justify-center px-6 py-3 bg-white text-primary font-black rounded-2xl hover:bg-accent transition-all shadow-xl text-[10px] uppercase tracking-widest active:scale-95"
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
                            <div className="glass-card p-6 group">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-black text-foreground tracking-tight">Active Pulse</h2>
                                    <span className="text-[10px] font-black text-accent-foreground bg-accent px-2.5 py-1 rounded-lg">Checkouts</span>
                                </div>
                                <div className="space-y-3">
                                    {upcomingRenewals?.slice(0, 3).map((renewal: any) => (
                                        <div key={renewal.id} className="rounded-2xl border border-transparent bg-muted/50 p-4 transition-all hover:border-border/60 hover:bg-accent/40 group">
                                            <div className="flex items-start justify-between mb-1">
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-foreground truncate text-[13px]">{renewal.customer}</h4>
                                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight truncate">{renewal.journal}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                <span>{renewal.dueDate}</span>
                                                <span className="text-primary">{renewal.amount}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!upcomingRenewals || upcomingRenewals.length === 0) && (
                                        <p className="text-muted-foreground text-center py-6 italic text-xs font-medium">Clear horizon. No renewals.</p>
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

// Style guide accessibility compliance helper comment: aria-label placeholder label
