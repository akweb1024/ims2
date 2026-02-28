'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { registerPush } from '@/lib/push-register';
import { useSession, signOut, signIn } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { getNavigationModules } from '@/config/navigation';
import Header from './Header';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
    children: React.ReactNode;
    userRole?: string;
}

export default function DashboardLayout({ children, userRole: propUserRole = 'CUSTOMER' }: DashboardLayoutProps) {
    const { data: session, status, update } = useSession();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isImpersonating, setIsImpersonating] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
    const pathname = usePathname();
    const router = useRouter();

    // Handle responsive sidebar behavior
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setSidebarOpen(true);
            } else {
                setSidebarOpen(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchNotifications = useCallback(() => {
        // We set up SSE event source for real-time notifications
        try {
            const eventSource = new EventSource('/api/notifications/stream');
            
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // Standardize read status explicitly just in case
                    setNotifications(prev => {
                        // Merge logic: Add new, update existing, don't overwrite if read in frontend
                        const merged = [...prev];
                        data.forEach((newNotif: any) => {
                            const existsIndex = merged.findIndex(n => n.id === newNotif.id);
                            if (existsIndex >= 0) {
                                if (merged[existsIndex].isRead === false) {
                                    merged[existsIndex] = newNotif;
                                }
                            } else {
                                merged.push(newNotif);
                            }
                        });
                        return merged.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    });
                } catch (e) {
                    console.error("Failed to parse SSE notification:", e);
                }
            };
            
            eventSource.onerror = () => {
                eventSource.close();
                // Optionally retry after delay or just rely on fallback fetch
                setTimeout(fetchNotificationsFallback, 10000);
            };

            return () => {
                eventSource.close();
            };
        } catch (err) {
            console.error('SSE initialization error:', err);
            fetchNotificationsFallback();
        }
    }, []);

    const fetchNotificationsFallback = async () => {
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (err) {
            console.error('Fallback fetch error:', err);
        }
    };

    const fetchUserContext = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setAvailableCompanies(data.availableCompanies || []);
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('availableCompanies', JSON.stringify(data.availableCompanies));
            }
        } catch (err) {
            console.error('Fetch user context error:', err);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        let cleanupSSE: (() => void) | undefined;
        
        if (status === 'authenticated') {
            cleanupSSE = fetchNotifications();
            fetchUserContext();
            registerPush();
        }

        if (status === 'unauthenticated') {
            router.push('/login');
        }

        if (typeof window !== 'undefined') {
            setIsImpersonating(!!localStorage.getItem('adminToken'));
        }

        const interval = setInterval(() => {
            if (document.visibilityState === 'visible' && status === 'authenticated') {
                fetch('/api/it/monitoring/check', { method: 'POST' }).catch(() => { });
            }
        }, 60000);

        return () => {
            clearInterval(interval);
            if (cleanupSSE) cleanupSSE();
        };
    }, [fetchNotifications, fetchUserContext, status, router]);

    const markAllAsRead = async () => {
        try {
            await fetch('/api/notifications', { method: 'PATCH' });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error('Mark read error:', err);
        }
    };

    const handleNotificationClick = async (notification: any) => {
        try {
            if (!notification.isRead) {
                await fetch(`/api/notifications/${notification.id}`, { method: 'PATCH' });
                setNotifications(prev => prev.map(n =>
                    n.id === notification.id ? { ...n, isRead: true } : n
                ));
            }
            if (notification.link) {
                router.push(notification.link);
            }
        } catch (err) {
            console.error('Notification click error:', err);
        }
    };

    const handleLogout = async () => {
        try {
            localStorage.clear();
            // Use NextAuth to sign out and redirect, ensuring the server cleans up the session
            await signOut({ callbackUrl: '/login', redirect: true });
        } catch (error) {
            console.error("Logout failed", error);
            // Fallback only if NextAuth method fails completely
            window.location.href = '/login';
        }
    };

    const handleRevertAdmin = async () => {
        const adminToken = localStorage.getItem('adminToken');
        const adminUser = localStorage.getItem('adminUser');

        if (adminToken && adminUser) {
            const result = await signIn('credentials', {
                token: adminToken,
                redirect: false
            });

            if (result?.ok) {
                localStorage.setItem('token', adminToken);
                localStorage.setItem('user', adminUser);
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                window.location.href = '/dashboard';
            } else {
                console.error("Failed to revert session");
                window.location.href = '/dashboard';
            }
        }
    };

    const handleSwitchCompany = async (companyId: string) => {
        try {
            const res = await fetch('/api/auth/select-company', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.token) localStorage.setItem('token', data.token);

                // Trigger NextAuth session update
                await update({ companyId });

                // Clear client-side router cache to ensure fresh data
                router.refresh();

                // Allow small buffer for cookie propagation before reload
                setTimeout(() => {
                    window.location.reload();
                }, 100);
            }
        } catch (error) {
            console.error("Switch company failed", error);
            // Don't leave the user stuck if API fails
            router.refresh();
        }
    };

    const user = session?.user as any;
    const finalRole = user?.role || propUserRole;

    const displayRole = mounted && user?.companyId
        ? (user.company?.name || finalRole.replace('_', ' '))
        : (mounted ? 'All Companies' : finalRole.replace('_', ' '));
    const displayEmail = mounted && user?.email ? user.email.split('@')[0] : 'User';
    const displayFullEmail = mounted && user?.email ? user.email : 'user@example.com';

    // Module state
    const [activeModule, setActiveModule] = useState<string>('CORE');

    // Navigation items based on role and module
    const navigationModules = useMemo(() => {
        const userAllowedModules = user?.allowedModules || ['CORE'];
        return getNavigationModules(finalRole, userAllowedModules);
    }, [finalRole, user?.allowedModules]);

    // Sync active module with current path
    useEffect(() => {
        if (!pathname || !navigationModules.length) return;

        let bestMatchModule = '';
        let longestMatchLen = 0;

        navigationModules.forEach(mod => {
            mod.categories.forEach(cat => {
                cat.items.forEach(item => {
                    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
                        if (item.href.length > longestMatchLen) {
                            longestMatchLen = item.href.length;
                            bestMatchModule = mod.id;
                        }
                    }
                });
            });
        });

        if (pathname === '/dashboard' && !bestMatchModule) {
            bestMatchModule = 'CORE';
        }

        if (bestMatchModule && bestMatchModule !== activeModule) {
            setActiveModule(bestMatchModule);
        }
    }, [pathname, navigationModules, activeModule]);

    return (
        <div className="min-h-screen bg-secondary-50">
            <Toaster position="top-right" />

            {/* Impersonation Warning Bar */}
            {isImpersonating && (
                <div className="bg-primary-600 text-white px-4 py-2 flex items-center justify-between fixed w-full z-50 top-0 shadow-lg animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-2 text-sm font-bold">
                        <span className="text-xl">👤</span>
                        <span>Impersonation Mode Active: Viewing as {mounted && user ? user.email : 'User'}</span>
                    </div>
                    <button
                        onClick={handleRevertAdmin}
                        className="bg-white text-primary-600 px-4 py-1 rounded-full text-xs font-black uppercase hover:bg-secondary-50 transition-all shadow-sm"
                    >
                        Back to Admin Identity
                    </button>
                </div>
            )}

            <Header
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                activeModule={activeModule}
                setActiveModule={setActiveModule}
                navigationModules={navigationModules}
                notifications={notifications}
                markAllAsRead={markAllAsRead}
                handleNotificationClick={handleNotificationClick}
                user={user}
                displayRole={displayRole}
                displayEmail={displayEmail}
                displayFullEmail={displayFullEmail}
                availableCompanies={availableCompanies}
                handleSwitchCompany={handleSwitchCompany}
                handleLogout={handleLogout}
                isImpersonating={isImpersonating}
            />

            <Sidebar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                activeModule={activeModule}
                setActiveModule={setActiveModule}
                navigationModules={navigationModules}
                isImpersonating={isImpersonating}
                handleLogout={handleLogout}
            />

            <main
                className={`transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'} ${isImpersonating ? 'pt-[calc(4rem+2.5rem)]' : 'pt-16'}
                    }`}
            >
                <div className="p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
