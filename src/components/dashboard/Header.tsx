'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GlobalSearch from './GlobalSearch';
import { NavModule } from '@/config/navigation';
import { formatToISTDate, formatToISTTime } from '@/lib/date-utils';
import { Home } from 'lucide-react';

interface HeaderProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    activeModule: string;
    setActiveModule: (id: string) => void;
    navigationModules: NavModule[];
    notifications: any[];
    markAllAsRead: () => void;
    handleNotificationClick: (n: any) => void;
    user: any;
    displayRole: string;
    displayEmail: string;
    displayFullEmail: string;
    availableCompanies: any[];
    handleSwitchCompany: (companyId: string) => void;
    handleLogout: () => void;
    isImpersonating: boolean;
}

export default function Header({
    sidebarOpen,
    setSidebarOpen,
    activeModule,
    setActiveModule,
    navigationModules,
    notifications,
    markAllAsRead,
    handleNotificationClick,
    user,
    displayRole,
    displayEmail,
    displayFullEmail,
    availableCompanies,
    handleSwitchCompany,
    handleLogout,
    isImpersonating
}: HeaderProps) {
    const router = useRouter();
    const canUseAllCompanies = user?.role === 'SUPER_ADMIN' || user?.allowedModules?.includes('ALL_COMPANIES');
    const currentCompanyName = user?.company?.name
        || availableCompanies.find((comp) => comp.id === user?.companyId)?.name
        || (canUseAllCompanies && !user?.companyId ? 'All Companies' : 'No company selected');
    const registeredCompanyName = user?.companies?.[0]?.name || user?.company?.name || 'Not available';
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const [attendance, setAttendance] = useState<any[]>([]);
    const [elapsedTime, setElapsedTime] = useState('00h 00m 00s');
    const [remainingTime, setRemainingTime] = useState('08h 30m 00s');
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement | null>(null);

    const isStaff = user && !['CUSTOMER', 'AGENCY'].includes(user.role);
    const todayAttendance = attendance.find(a => {
        return formatToISTDate(a.date) === formatToISTDate(new Date());
    });

    const fetchTodayAttendance = useCallback(async () => {
        if (!isStaff) return;
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
            console.error('Failed to fetch attendance for header', err);
        }
    }, [isStaff]);

    // Timer Logic
    useEffect(() => {
        if (todayAttendance?.checkIn && !todayAttendance?.checkOut) {
            const calculateTime = () => {
                const now = new Date();
                const checkIn = new Date(todayAttendance.checkIn);
                const diffMs = now.getTime() - checkIn.getTime();

                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
                setElapsedTime(`${hours}h ${minutes}m ${seconds}s`);

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

    useEffect(() => {
        fetchTodayAttendance();
        const interval = setInterval(fetchTodayAttendance, 2 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchTodayAttendance]);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            if (!userMenuRef.current) return;
            if (event.target instanceof Node && !userMenuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
        <nav
            className={`fixed w-full z-30 transition-all ${isImpersonating ? 'top-10' : 'top-0'}`}
            style={{
                background: 'color-mix(in oklab, var(--background) 80%, transparent)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderBottom: '1px solid color-mix(in oklab, var(--border) 65%, transparent)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.03)',
            }}
        >
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex h-14 justify-between lg:h-[65px]">
                    <div className="flex items-center gap-4">
                        {/* Sidebar Toggle */}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="rounded-xl p-2 text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-primary focus:outline-none active:scale-95"
                            aria-label="Toggle sidebar"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {sidebarOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>

                        {/* Logo */}
                        <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 group">
                            <div
                                className="h-8 w-8 flex-shrink-0 rounded-xl border border-sidebar-border shadow-lg shadow-primary/10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-primary/20 flex items-center justify-center sm:h-9 sm:w-9"
                                style={{ background: '#0f172a' }}
                            >
                                <span className="text-primary-foreground font-black text-base sm:text-lg leading-none italic">S</span>
                            </div>
                            <div className="hidden xs:block">
                                <h1 className="text-[14px] sm:text-[16px] font-black text-foreground tracking-tight leading-none group-hover:text-primary transition-colors">
                                    STM <span className="opacity-40">IMS</span>
                                </h1>
                                <p className="text-[8px] sm:text-[10px] text-muted-foreground font-bold mt-0.5 sm:mt-1 uppercase tracking-widest leading-none">Enterprise Suite</p>
                            </div>
                        </Link>

                        {/* Module Switcher - Premium Dropdown */}
                        <div className="relative group/module-switcher hidden sm:block ml-2 sm:ml-4 lg:ml-8">
                            <button className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/50 px-4 py-2 transition-all duration-300 hover:border-border hover:bg-accent/50 hover:shadow-sm">
                                <span className="text-primary">
                                    {(() => {
                                        const ActiveIcon = navigationModules.find(m => m.id === activeModule)?.icon || Home;
                                        return <ActiveIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />;
                                    })()}
                                </span>
                                <span className="text-sm font-semibold text-foreground">
                                    {navigationModules.find(m => m.id === activeModule)?.name || 'Select Module'}
                                </span>
                                <svg className="w-4 h-4 text-muted-foreground group-hover/module-switcher:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            <div className="absolute top-full left-0 pt-2 w-64 z-50 opacity-0 invisible group-hover/module-switcher:opacity-100 group-hover/module-switcher:visible transition-all duration-200 translate-y-2 group-hover/module-switcher:translate-y-0">
                                <div className="p-2 rounded-2xl bg-background border border-border/80 shadow-[0_24px_70px_rgba(15,23,42,0.16)] ring-1 ring-black/5 grid gap-1">
                                    {navigationModules.map((mod) => (
                                        <button
                                            key={mod.id}
                                            onClick={() => {
                                                setActiveModule(mod.id);
                                                const firstLink = mod.categories[0]?.items[0]?.href;
                                                if (firstLink) router.push(firstLink);
                                                // Optional: close dropdown logic if needed, hover handles it mostly
                                            }}
                                            className={`
                                                flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 min-h-11
                                                ${activeModule === mod.id 
                                                    ? 'bg-primary/10 text-primary shadow-sm' 
                                                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                                                }
                                            `}
                                        >
                                            <span className={`transition-transform duration-200 ${activeModule === mod.id ? 'scale-110 text-primary' : 'text-muted-foreground'}`}>
                                                <mod.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                                            </span>
                                            <span className="font-semibold text-sm">
                                                {mod.name}
                                            </span>
                                            {activeModule === mod.id && (
                                                <svg className="w-4 h-4 ml-auto text-primary animate-fade-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-1.5 sm:gap-3">
                        {/* Global Search - Integrated */}
                        <div className="hidden xl:block">
                            <GlobalSearch />
                        </div>

                        {/* Attendance Timer Indicator */}
                        {isStaff && (
                            <button
                                onClick={() => router.push('/dashboard/staff-portal')}
                                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card/80 hover:bg-card shadow-sm text-foreground hover:text-primary transition-all"
                                title="View attendance details"
                            >
                                <span className="text-sm">⏱️</span>
                                {todayAttendance?.checkIn && !todayAttendance?.checkOut ? (
                                    <span className="text-[11px] font-black uppercase tracking-widest">
                                        {elapsedTime} · {remainingTime === 'Overtime' ? 'Overtime' : `Left ${remainingTime}`}
                                    </span>
                                ) : (
                                    <span className="text-[11px] font-black uppercase tracking-widest">
                                        Not Checked In
                                    </span>
                                )}
                            </button>
                        )}

                        {/* Notification Bell */}
                        <div className="relative group">
                            <button className="relative p-2 sm:p-2.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300 active:scale-95 group">
                                <svg className="h-5 w-5 sm:h-5.5 sm:w-5.5 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-black text-primary-foreground ring-2 ring-background animate-pulse sm:top-2 sm:right-2 sm:h-4.5 sm:w-4.5 sm:text-[9px]">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            <div className="hidden group-hover:block absolute right-[-50px] sm:right-0 mt-2 w-72 sm:w-84 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div
                                    className="bg-background border border-border/80"
                                    style={{
                                        boxShadow: '0 24px 70px rgba(15,23,42,0.16), 0 0 0 1px rgba(15,23,42,0.05)',
                                        borderRadius: '20px',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div className="px-3 py-2.5 sm:px-4 sm:py-3.5 border-b border-border/70 flex justify-between items-center bg-muted/40">
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                            <h3 className="text-xs sm:text-sm font-bold text-foreground">Notifications</h3>
                                            {unreadCount > 0 && (
                                                <span className="bg-primary/20 text-primary text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                                    {unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        {notifications.some(n => !n.isRead) && (
                                            <button
                                                onClick={markAllAsRead}
                                                className="text-[10px] font-semibold text-primary hover:text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-lg transition-colors"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-[300px] sm:max-h-[380px] overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="py-8 sm:py-10 text-center">
                                                <div className="text-2xl sm:text-3xl mb-2">🔔</div>
                                                <p className="text-xs sm:text-sm text-muted-foreground font-medium">All caught up!</p>
                                            </div>
                                        ) : (
                                            notifications.map((n) => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => handleNotificationClick(n)}
                                                className={`px-3 py-3 sm:px-4 sm:py-3.5 cursor-pointer transition-all duration-150 border-b border-border/50 last:border-0 group/notif
                                                        ${!n.isRead
                                                            ? 'bg-primary/10/60 hover:bg-primary/10'
                                                            : 'hover:bg-muted/60'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start gap-2 sm:gap-3">
                                                        <div className="flex items-start gap-2 flex-1 min-w-0">
                                                            {!n.isRead && (
                                                                <span className="mt-1.5 w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary/100 flex-shrink-0" />
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-[11px] sm:text-xs leading-snug ${!n.isRead ? 'font-semibold text-foreground' : 'text-foreground'}`}>{n.title}</p>
                                                                <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] sm:text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
                                                            {formatToISTTime(n.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* User Dropdown */}
                        <div ref={userMenuRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setIsUserMenuOpen((open) => !open)}
                                aria-haspopup="menu"
                                aria-expanded={isUserMenuOpen}
                                className="flex items-center gap-1.5 sm:gap-2.5 pl-1.5 sm:pl-2 pr-1 sm:pr-3 py-1 sm:py-1.5 rounded-xl hover:bg-muted transition-all duration-200 border border-transparent hover:border-border"
                            >
                                <div
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm text-primary-foreground shadow-md flex-shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)' }}
                                >
                                    {displayRole.charAt(0).toUpperCase()}
                                </div>
                                <div className="hidden lg:block text-left">
                                    <p className="text-[12px] sm:text-[13px] font-semibold text-foreground leading-tight max-w-[100px] truncate">
                                        {displayRole}
                                    </p>
                                    <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight max-w-[100px] truncate">
                                        {displayEmail}
                                    </p>
                                </div>
                                <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            <div
                                className={`absolute right-0 top-full pt-2 w-[280px] z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${
                                    isUserMenuOpen ? 'block' : 'hidden'
                                }`}
                            >
                                <div
                                    className="bg-background border border-border/80"
                                    style={{
                                        boxShadow: '0 24px 70px rgba(15,23,42,0.16), 0 0 0 1px rgba(15,23,42,0.05)',
                                        borderRadius: '16px',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* User Info Header */}
                                    <div
                                        className="px-4 py-4 border-b border-border/70 bg-muted/40"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-base text-primary-foreground shadow-sm flex-shrink-0"
                                                style={{ background: '#0f172a' }}
                                            >
                                                {displayRole.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-foreground truncate">{displayFullEmail}</p>
                                                <p className="text-[11px] mt-0.5">
                                                    <span className="text-primary font-semibold bg-primary/10 px-1.5 py-0.5 rounded text-[10px]">{displayRole}</span>
                                                </p>
                                                <p className="text-[10px] text-muted-foreground mt-1 truncate">
                                                    Current: <span className="font-semibold text-foreground">{currentCompanyName}</span>
                                                </p>
                                                <p className="text-[10px] text-muted-foreground truncate">
                                                    Registered: <span className="font-semibold text-foreground">{registeredCompanyName}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Menu Items */}
                                    <div className="py-1.5">
                                        <Link
                                            href="/dashboard/profile"
                                            onClick={() => setIsUserMenuOpen(false)}
                                            className="flex items-center px-4 py-3 text-sm text-foreground hover:bg-muted/70 transition-colors gap-3 min-h-11"
                                        >
                                            <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                                <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </span>
                                            <span className="font-medium">Profile Settings</span>
                                        </Link>

                                        <Link
                                            href="/dashboard"
                                            onClick={() => setIsUserMenuOpen(false)}
                                            className="flex items-center px-4 py-3 text-sm text-foreground hover:bg-muted/70 transition-colors gap-3 min-h-11"
                                        >
                                            <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                                <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            </span>
                                            <span className="font-medium">Preferences</span>
                                        </Link>
                                    </div>

                                    {/* Switch Company */}
                                    {availableCompanies.length > 1 && (
                                        <div className="border-t border-border/70 py-1.5">
                                            <p className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Switch Company</p>
                                            <div className="max-h-40 overflow-y-auto">
                                                {canUseAllCompanies && (
                                                    <button
                                                        onClick={() => handleSwitchCompany('ALL')}
                                                        type="button"
                                                        onMouseDown={(event) => event.preventDefault()}
                                                        onClickCapture={() => setIsUserMenuOpen(false)}
                                                        className={`w-full text-left px-4 py-3 text-xs flex justify-between items-center transition-colors gap-2 min-h-11
                                                            ${!user?.companyId ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted/70'}`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-primary">🌐</span>
                                                            <span>All Companies</span>
                                                        </div>
                                                        {!user?.companyId && (
                                                            <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                )}
                                                {availableCompanies.map((comp) => (
                                                    <button
                                                        key={comp.id}
                                                        type="button"
                                                        onMouseDown={(event) => event.preventDefault()}
                                                        onClickCapture={() => setIsUserMenuOpen(false)}
                                                        onClick={() => handleSwitchCompany(comp.id)}
                                                        className={`w-full text-left px-4 py-3 text-xs flex justify-between items-center transition-colors min-h-11
                                                            ${comp.id === user?.companyId ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted/70'}`}
                                                    >
                                                        <span className="truncate">{comp.name}</span>
                                                        {comp.id === user?.companyId && (
                                                            <svg className="w-3.5 h-3.5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Logout */}
                                    <div className="border-t border-border/70 p-2">
                                        <button
                                            onClick={handleLogout}
                                            type="button"
                                            onClickCapture={() => setIsUserMenuOpen(false)}
                                            className="w-full rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive transition-all hover:bg-destructive/20 flex items-center justify-center gap-2 min-h-11"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                            </svg>
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
