'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { registerPush } from '@/lib/push-register';
import { useSession, signOut, signIn } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { getNavigationModules } from '@/config/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import FeedbackWidget from './FeedbackWidget';
import AIChatWidget from './AIChatWidget';
import ThanosSnapWrapper from '@/components/animations/ThanosSnapWrapper';
import { CommandNexus } from '@/components/nexus/CommandNexus';


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
    const [isTerminating, setIsTerminating] = useState(false);
    const [isInitialMount, setIsInitialMount] = useState(true);
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

        // Trigger materialization shortly after mount to ensure DOM is ready
        if (status === 'authenticated') {
            const timer = setTimeout(() => setIsInitialMount(false), 300);
            return () => {
                clearInterval(interval);
                clearTimeout(timer);
                if (cleanupSSE) cleanupSSE();
            }
        }

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
            // Trigger Disintegration Effect
            setIsTerminating(true);
            
            // Wait for snap duration (2.5s) + buffer
            await new Promise(resolve => setTimeout(resolve, 3000));
            
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
                await update({ companyId: companyId === 'ALL' ? null : companyId });

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

    const canUseAllCompanies = user?.role === 'SUPER_ADMIN' || user?.allowedModules?.includes('ALL_COMPANIES');
    const displayRole = mounted && user?.companyId
        ? (user.company?.name || finalRole.replace('_', ' '))
        : (mounted ? (canUseAllCompanies ? 'All Companies' : finalRole.replace('_', ' ')) : finalRole.replace('_', ' '));
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
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <Toaster position="top-right" />

            {/* Background Ambient Glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px] animate-pulse"></div>
                <div className="absolute top-[20%] -right-[5%] h-[30%] w-[30%] rounded-full bg-chart-3/5 blur-[100px]"></div>
                <div className="absolute -bottom-[10%] left-[20%] h-[50%] w-[50%] rounded-full bg-chart-1/5 blur-[150px]"></div>
            </div>

            {/* Impersonation Warning Bar */}
            {isImpersonating && (
                <div className="animate-in slide-in-from-top fixed top-0 z-50 flex w-full items-center justify-between bg-primary px-4 py-2 text-primary-foreground shadow-lg duration-300">
                    <div className="flex items-center gap-2 text-sm font-bold">
                        <span className="text-xl">👤</span>
                        <span>Impersonation Mode Active: Viewing as {mounted && user ? user.email : 'User'}</span>
                    </div>
                    <button
                        onClick={handleRevertAdmin}
                        className="rounded-full bg-background px-4 py-1 text-xs font-black uppercase text-foreground shadow-sm transition-all hover:bg-accent"
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

            {/* Mobile Backdrop Overlay */}
            {sidebarOpen && (
                <div 
                    className="animate-in fade-in fixed inset-0 z-10 bg-background/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Suspense: Sidebar reads useSearchParams for ?tab= active states */}
            <Suspense fallback={null}>
                <Sidebar
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    activeModule={activeModule}
                    setActiveModule={setActiveModule}
                    navigationModules={navigationModules}
                    isImpersonating={isImpersonating}
                    handleLogout={handleLogout}
                />
            </Suspense>

            <main
                className={`relative z-10 overflow-x-hidden transition-all duration-500
                    ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-12'} 
                    ${isImpersonating ? 'pt-[calc(4rem+2.5rem)]' : 'pt-14 lg:pt-[65px]'}`}
            >
                <div className="page-wrapper page-animate">
                    <ThanosSnapWrapper isSnapped={isInitialMount || isTerminating} snapDuration={2.5}>
                        {children}
                    </ThanosSnapWrapper>
                </div>
            </main>

            {/* AI Assistant Chat Widget — always visible */}
            <AIChatWidget />

            {/* Global Feedback Widget */}
            <FeedbackWidget />

            {/* Global Command Nexus (Sentinel AI) */}
            <CommandNexus />
        </div>
    );
}
