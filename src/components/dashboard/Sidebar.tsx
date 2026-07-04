'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { NavModule, NavCategory, NavItem } from '@/config/navigation';

interface SidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    activeModule: string;
    setActiveModule: (id: string) => void;
    navigationModules: NavModule[];
    isImpersonating: boolean;
    handleLogout: () => void;
}

export default function Sidebar({
    sidebarOpen,
    setSidebarOpen,
    activeModule,
    setActiveModule,
    navigationModules,
    isImpersonating,
    handleLogout
}: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const activeMod = navigationModules.find(m => m.id === activeModule) || navigationModules[0];
    const sideNavigation = activeMod?.categories || [];

    // An item like "/dashboard/hr-management?tab=attendance" is active only when
    // the path AND its query params match; a query-less item yields to its tab
    // siblings whenever a ?tab= is present on the same path.
    const isItemActive = (href: string) => {
        const [itemPath, itemQuery] = href.split('?');
        if (itemQuery) {
            if (pathname !== itemPath) return false;
            return Array.from(new URLSearchParams(itemQuery).entries())
                .every(([key, value]) => searchParams.get(key) === value);
        }
        const pathMatch = itemPath === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === itemPath || pathname?.startsWith(`${itemPath}/`);
        return !!pathMatch && !(pathname === itemPath && searchParams.get('tab'));
    };

    return (
        <aside
            className={`fixed left-0 h-full transition-all duration-500 ease-in-out z-20 flex flex-col
                ${sidebarOpen ? 'translate-x-0 w-72 lg:w-64' : '-translate-x-full lg:translate-x-0 w-72 lg:w-12'}
                ${isImpersonating ? 'top-[calc(4rem+2.5rem)]' : 'top-14 lg:top-[65px]'}
            `}
            style={{
                background: 'var(--sidebar)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderRight: '1px solid color-mix(in oklab, var(--sidebar-border) 70%, transparent)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            }}
        >
            <nav aria-label="Sidebar" className="custom-scrollbar flex flex-1 flex-col space-y-1 overflow-x-hidden overflow-y-auto p-3">
                {/* Mobile Module Selector */}
                <div className="lg:hidden mb-4 space-y-1.5 overflow-hidden">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-2">Switch Module</label>
                    <div className="px-2">
                        <select
                            className="w-full rounded-lg border border-sidebar-border bg-sidebar-accent px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-[3px] focus:ring-sidebar-ring"
                            value={activeModule}
                            onChange={(e) => {
                                const newModId = e.target.value;
                                setActiveModule(newModId);
                                const mod = navigationModules.find(m => m.id === newModId);
                                const firstLink = mod?.categories[0]?.items[0]?.href;
                                if (firstLink) router.push(firstLink);
                            }}
                        >
                            {navigationModules.map(mod => (
                                <option key={mod.id} value={mod.id}>{mod.icon} {mod.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex-1 space-y-1 overflow-hidden">
                    {sideNavigation.map((category: NavCategory, idx: number) => (
                        <div key={category.title || idx} className="group/category">
                            {/* Category Header */}
                            {sidebarOpen && category.title && (
                                <div className="px-3 pt-5 pb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{category.title}</span>
                                </div>
                            )}

                            {idx > 0 && !category.title && sidebarOpen && (
                                <div className="my-2 mx-3 border-t border-sidebar-border/60" />
                            )}
                            {idx > 0 && !category.title && !sidebarOpen && (
                                <div className="my-2 mx-2 border-t border-sidebar-border/60" />
                            )}

                            <div className="space-y-1">
                                {category.items.map((item: NavItem) => {
                                    const isActive = isItemActive(item.href);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            aria-current={isActive ? 'page' : undefined}
                                            onClick={() => {
                                                if (window.innerWidth < 1024) {
                                                    setSidebarOpen(false);
                                                }
                                            }}
                                            className={`
                                                relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                                                transition-all duration-300 group overflow-hidden
                                                ${isActive
                                                    ? 'border border-primary/20 bg-primary/10 text-primary font-medium'
                                                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                                }
                                            `}
                                            title={!sidebarOpen ? item.name : ''}
                                        >
                                            {/* Active left indicator */}
                                            {isActive && (
                                                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                                            )}

                                                <span className={`text-base flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-primary' : ''}`}>
                                                {item.icon}
                                            </span>
                                            
                                            <span className={`text-[13px] font-semibold tracking-wide whitespace-nowrap transition-all duration-300
                                                ${sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}
                                            >
                                                {item.name}
                                            </span>

                                            {/* Accent glow on hover */}
                                            {!isActive && sidebarOpen && (
                                                <span className="ml-auto w-1 h-1 rounded-full bg-primary/100 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_8px_#3b82f6]" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Logout Button */}
                <div className="border-t border-sidebar-border/60 pt-2 mt-1 overflow-hidden shrink-0">
                    <button
                        onClick={handleLogout}
                        title={!sidebarOpen ? 'Logout' : ''}
                        className="group w-full rounded-xl px-3 py-2 text-[13px] font-semibold text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-foreground flex items-center gap-3"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className={`whitespace-nowrap transition-all duration-300 ${sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}>
                            Logout
                        </span>
                    </button>
                </div>
            </nav>
        </aside>
    );
}
