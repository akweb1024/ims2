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

    return (
        <nav className={`bg-white border-b border-secondary-100 fixed w-full z-30 transition-all shadow-[0_4px_24px_rgba(0,0,0,0.02)] ${isImpersonating ? 'top-10' : 'top-0'}`}>
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        {/* Sidebar Toggle */}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="text-secondary-400 hover:text-primary-600 focus:outline-none lg:hidden transition-colors"
                        >
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        {/* Logo */}
                        <Link href="/dashboard" className="flex items-center ml-4 lg:ml-0">
                            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center mr-2.5 shadow-md shadow-primary-500/20">
                                <span className="text-white font-bold text-lg leading-none">S</span>
                            </div>
                            <h1 className="text-xl font-bold text-secondary-900 tracking-tight">STM <span className="text-primary-600 font-semibold">Customer</span></h1>
                        </Link>

                        {/* Global Search */}
                        <div className="ml-8 hidden xl:block">
                            <GlobalSearch />
                        </div>

                        {/* Module Switcher - Horizontal */}
                        <div className="hidden lg:flex items-center ml-10 space-x-2">
                            {navigationModules.map((mod) => (
                                <button
                                    key={mod.id}
                                    onClick={() => {
                                        setActiveModule(mod.id);
                                        // Auto-navigate to first link
                                        const firstLink = mod.categories[0]?.items[0]?.href;
                                        if (firstLink) router.push(firstLink);
                                    }}
                                    className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2 ${activeModule === mod.id
                                        ? 'bg-primary-50 text-primary-600'
                                        : 'text-secondary-500 hover:text-secondary-900 hover:bg-secondary-50'
                                        }`}
                                >
                                    <span className={activeModule === mod.id ? "text-primary-600" : "text-secondary-400"}>{mod.icon}</span>
                                    {mod.name.split(' ')[0]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right side - User menu */}
                    <div className="flex items-center space-x-4">
                        {/* Notifications */}
                        <div className="relative group">
                            <button className="text-secondary-500 hover:text-secondary-700 relative p-2 rounded-xl hover:bg-secondary-100 transition-colors">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                {notifications.filter(n => !n.isRead).length > 0 && (
                                    <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-danger-500 ring-2 ring-white"></span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            <div className="hidden group-hover:block absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-secondary-200 py-2 z-50 overflow-hidden">
                                <div className="px-4 py-3 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/50">
                                    <h3 className="text-sm font-bold text-secondary-900">Notifications</h3>
                                    {notifications.some(n => !n.isRead) && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-[10px] font-bold text-primary-600 uppercase hover:text-primary-700"
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-secondary-500 italic text-sm">
                                            No notifications yet.
                                        </div>
                                    ) : (
                                        notifications.map((n) => (
                                            <div
                                                key={n.id}
                                                onClick={() => handleNotificationClick(n)}
                                                className={`px-4 py-3 hover:bg-secondary-50 cursor-pointer transition-colors border-b border-secondary-50 last:border-0 ${!n.isRead ? 'bg-primary-50/30' : ''}`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <p className={`text-xs ${!n.isRead ? 'font-bold text-secondary-900' : 'text-secondary-700'}`}>{n.title}</p>
                                                    <span className="text-[10px] text-secondary-400">
                                                        {formatToISTTime(n.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-secondary-500 mt-1 line-clamp-2">{n.message}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* User Dropdown */}
                        <div className="relative group">
                            <button className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-secondary-100 transition-colors">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center font-bold text-sm shadow-lg">
                                    {displayRole.charAt(0)}
                                </div>
                                <div className="hidden md:block text-left">
                                    <p className="text-sm font-semibold text-secondary-900 leading-tight">
                                        {displayRole}
                                    </p>
                                    <p className="text-xs text-secondary-500">
                                        {displayEmail}
                                    </p>
                                </div>
                                <svg className="h-4 w-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown Menu - Enhanced */}
                            <div className="hidden group-hover:block absolute right-0 top-full pt-2 w-64 z-50">
                                <div className="bg-white rounded-2xl shadow-2xl border border-secondary-200 py-2 overflow-hidden">
                                    {/* User Info Header */}
                                    <div className="px-4 py-3 border-b border-secondary-100">
                                        <p className="text-sm font-bold text-secondary-900">
                                            {displayFullEmail}
                                        </p>
                                        <p className="text-xs text-secondary-500 mt-1">
                                            Role: <span className="font-semibold text-primary-600">{displayRole}</span>
                                        </p>
                                    </div>

                                    {/* Menu Items */}
                                    <div className="py-2">
                                        <Link
                                            href="/dashboard/profile"
                                            className="flex items-center px-4 py-2.5 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors"
                                        >
                                            <svg className="h-5 w-5 mr-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            Profile Settings
                                        </Link>

                                        <Link
                                            href="/dashboard"
                                            className="flex items-center px-4 py-2.5 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors"
                                        >
                                            <svg className="h-5 w-5 mr-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            Preferences
                                        </Link>
                                    </div>

                                    {/* Switch Company Section */}
                                    {availableCompanies.length > 1 && (
                                        <div className="border-t border-secondary-100 py-2">
                                            <p className="px-4 py-1 text-[10px] font-bold text-secondary-400 uppercase">Switch Company</p>
                                            <div className="max-h-40 overflow-y-auto">
                                                {/* All Company Option */}
                                                <button
                                                    onClick={() => handleSwitchCompany('ALL')}
                                                    className={`w-full text-left px-4 py-3 text-xs flex justify-between items-center transition-colors border-b border-secondary-50 ${!user?.companyId ? 'bg-primary-50 text-primary-700 font-bold' : 'text-secondary-600 hover:bg-secondary-50'}`}
                                                >
                                                    <div className="flex items-center">
                                                        <span className="mr-2 text-primary-500 font-bold">🌐</span>
                                                        <span>All Companies</span>
                                                    </div>
                                                    {!user?.companyId && <span className="text-primary-500 font-bold">✓</span>}
                                                </button>

                                                {availableCompanies.map((comp) => (
                                                    <button
                                                        key={comp.id}
                                                        onClick={() => handleSwitchCompany(comp.id)}
                                                        className={`w-full text-left px-4 py-2 text-xs flex justify-between items-center transition-colors ${comp.id === user?.companyId ? 'bg-primary-50 text-primary-700 font-bold' : 'text-secondary-600 hover:bg-secondary-50'}`}
                                                    >
                                                        <span className="truncate">{comp.name}</span>
                                                        {comp.id === user?.companyId && <span className="text-primary-500">✓</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Logout Button - Prominent */}
                                    <div className="border-t border-secondary-100 pt-2 px-2 pb-2">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-danger-500 to-danger-600 hover:from-danger-600 hover:to-danger-700 rounded-lg transition-all shadow-md hover:shadow-lg"
                                        >
                                            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
