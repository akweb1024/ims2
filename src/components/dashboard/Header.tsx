'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GlobalSearch from './GlobalSearch';
import { NavModule } from '@/config/navigation';
import { formatToISTTime } from '@/lib/date-utils';

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
    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <nav
            className={`fixed w-full z-30 transition-all ${isImpersonating ? 'top-10' : 'top-0'}`}
            style={{
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
                borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.03)',
            }}
        >
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center gap-4">
                        {/* Sidebar Toggle */}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="text-slate-500 hover:text-blue-600 focus:outline-none transition-all duration-200 p-2 rounded-xl hover:bg-blue-50/80 active:scale-95"
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
                                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 transition-all duration-300 group-hover:shadow-blue-500/40 group-hover:scale-110 rotate-0 group-hover:rotate-6 flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e293b 100%)' }}
                            >
                                <span className="text-white font-black text-base sm:text-lg leading-none italic">S</span>
                            </div>
                            <div className="hidden xs:block">
                                <h1 className="text-[14px] sm:text-[16px] font-black text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors">
                                    STM <span className="opacity-40">IMS</span>
                                </h1>
                                <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold mt-0.5 sm:mt-1 uppercase tracking-widest leading-none">Enterprise Suite</p>
                            </div>
                        </Link>

                        {/* Module Switcher - Scrollable on tablet/mobile if needed */}
                        <div className="hidden sm:flex items-center ml-2 sm:ml-4 lg:ml-8 p-1 bg-slate-100/50 rounded-xl border border-slate-200/40 overflow-x-auto no-scrollbar max-w-[200px] md:max-w-md">
                            {navigationModules.map((mod) => (
                                <button
                                    key={mod.id}
                                    onClick={() => {
                                        setActiveModule(mod.id);
                                        const firstLink = mod.categories[0]?.items[0]?.href;
                                        if (firstLink) router.push(firstLink);
                                    }}
                                    className={`
                                        relative px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold tracking-wide
                                        transition-all duration-300 flex items-center gap-1 sm:gap-2 whitespace-nowrap
                                        ${activeModule === mod.id
                                            ? 'text-blue-600 bg-white shadow-sm ring-1 ring-slate-200/50'
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                                        }
                                    `}
                                >
                                    <span className={`text-sm sm:text-base ${activeModule === mod.id ? 'scale-110 drop-shadow-sm' : 'grayscale opacity-70 group-hover:grayscale-0'}`}>
                                        {mod.icon}
                                    </span>
                                    <span className="hidden md:block">{mod.name.split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-1.5 sm:gap-3">
                        {/* Global Search - Integrated */}
                        <div className="hidden xl:block">
                            <GlobalSearch />
                        </div>

                        {/* Notification Bell */}
                        <div className="relative group">
                            <button className="relative p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 active:scale-95 group">
                                <svg className="h-5 w-5 sm:h-5.5 sm:w-5.5 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex items-center justify-center h-4 w-4 sm:h-4.5 sm:w-4.5 rounded-full bg-blue-600 text-white text-[8px] sm:text-[9px] font-black ring-2 ring-white shadow-blue-500/30 animate-pulse">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            <div className="hidden group-hover:block absolute right-[-50px] sm:right-0 mt-2 w-72 sm:w-84 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div
                                    className="glass-card-premium border-slate-200/60"
                                    style={{
                                        boxShadow: '0 20px 60px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)',
                                        borderRadius: '20px',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div className="px-3 py-2.5 sm:px-4 sm:py-3.5 border-b border-slate-100 flex justify-between items-center">
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                            <h3 className="text-xs sm:text-sm font-bold text-slate-900">Notifications</h3>
                                            {unreadCount > 0 && (
                                                <span className="bg-blue-100 text-blue-700 text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                                    {unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        {notifications.some(n => !n.isRead) && (
                                            <button
                                                onClick={markAllAsRead}
                                                className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-[300px] sm:max-h-[380px] overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="py-8 sm:py-10 text-center">
                                                <div className="text-2xl sm:text-3xl mb-2">🔔</div>
                                                <p className="text-xs sm:text-sm text-slate-400 font-medium">All caught up!</p>
                                            </div>
                                        ) : (
                                            notifications.map((n) => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => handleNotificationClick(n)}
                                                    className={`px-3 py-2.5 sm:px-4 sm:py-3.5 cursor-pointer transition-all duration-150 border-b border-slate-50 last:border-0 group/notif
                                                        ${!n.isRead
                                                            ? 'bg-blue-50/60 hover:bg-blue-50'
                                                            : 'hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start gap-2 sm:gap-3">
                                                        <div className="flex items-start gap-2 flex-1 min-w-0">
                                                            {!n.isRead && (
                                                                <span className="mt-1.5 w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-[11px] sm:text-xs leading-snug ${!n.isRead ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
                                                                <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] sm:text-[10px] text-slate-400 flex-shrink-0 mt-0.5">
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
                        <div className="relative group">
                            <button className="flex items-center gap-1.5 sm:gap-2.5 pl-1.5 sm:pl-2 pr-1 sm:pr-3 py-1 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-all duration-200 border border-transparent hover:border-slate-200">
                                <div
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm text-white shadow-md flex-shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}
                                >
                                    {displayRole.charAt(0).toUpperCase()}
                                </div>
                                <div className="hidden lg:block text-left">
                                    <p className="text-[12px] sm:text-[13px] font-semibold text-slate-900 leading-tight max-w-[100px] truncate">
                                        {displayRole}
                                    </p>
                                    <p className="text-[10px] sm:text-[11px] text-slate-500 leading-tight max-w-[100px] truncate">
                                        {displayEmail}
                                    </p>
                                </div>
                                <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            <div className="hidden group-hover:block absolute right-0 top-full pt-2 w-[260px] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div
                                    style={{
                                        background: 'rgba(255,255,255,0.98)',
                                        backdropFilter: 'blur(16px)',
                                        boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
                                        borderRadius: '16px',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* User Info Header */}
                                    <div
                                        className="px-4 py-4 border-b border-slate-100"
                                        style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f8faff 100%)' }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-base text-white shadow-lg flex-shrink-0"
                                                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}
                                            >
                                                {displayRole.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-900 truncate">{displayFullEmail}</p>
                                                <p className="text-[11px] mt-0.5">
                                                    <span className="text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">{displayRole}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Menu Items */}
                                    <div className="py-1.5">
                                        <Link
                                            href="/dashboard/profile"
                                            className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors gap-3"
                                        >
                                            <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </span>
                                            <span className="font-medium">Profile Settings</span>
                                        </Link>

                                        <Link
                                            href="/dashboard"
                                            className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors gap-3"
                                        >
                                            <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            </span>
                                            <span className="font-medium">Preferences</span>
                                        </Link>
                                    </div>

                                    {/* Switch Company */}
                                    {availableCompanies.length > 1 && (
                                        <div className="border-t border-slate-100 py-1.5">
                                            <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Switch Company</p>
                                            <div className="max-h-40 overflow-y-auto">
                                                <button
                                                    onClick={() => handleSwitchCompany('ALL')}
                                                    className={`w-full text-left px-4 py-2.5 text-xs flex justify-between items-center transition-colors gap-2
                                                        ${!user?.companyId ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-blue-500">🌐</span>
                                                        <span>All Companies</span>
                                                    </div>
                                                    {!user?.companyId && (
                                                        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </button>
                                                {availableCompanies.map((comp) => (
                                                    <button
                                                        key={comp.id}
                                                        onClick={() => handleSwitchCompany(comp.id)}
                                                        className={`w-full text-left px-4 py-2.5 text-xs flex justify-between items-center transition-colors
                                                            ${comp.id === user?.companyId ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                                    >
                                                        <span className="truncate">{comp.name}</span>
                                                        {comp.id === user?.companyId && (
                                                            <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Logout */}
                                    <div className="border-t border-slate-100 p-2">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all shadow-sm hover:shadow-md"
                                            style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
