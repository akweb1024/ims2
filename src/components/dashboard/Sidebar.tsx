'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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

    const activeMod = navigationModules.find(m => m.id === activeModule) || navigationModules[0];
    const sideNavigation = activeMod?.categories || [];

    return (
        <aside
            className={`fixed left-0 h-full bg-white border-r border-secondary-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 z-20 ${sidebarOpen ? 'w-64' : 'w-0 lg:w-20'} ${isImpersonating ? 'top-[calc(4rem+2.5rem)]' : 'top-16'}
                }`}
        >
            <nav className="p-4 space-y-2 h-full flex flex-col overflow-y-auto custom-scrollbar">
                {/* Mobile Module Selector */}
                <div className="lg:hidden mb-6 space-y-2">
                    <label className="text-[10px] font-black text-secondary-400 uppercase ml-2">Switch Module</label>
                    <select
                        className="input-premium py-2 text-xs"
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

                <div className="flex-1 space-y-4">
                    {sideNavigation.map((category: NavCategory, idx: number) => (
                        <div key={category.title || idx} className="group/category">
                            {/* Category Header - Only show when open */}
                            {sidebarOpen && category.title && (
                                <div className="px-3 mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-secondary-400">
                                    <span>{category.title}</span>
                                </div>
                            )}

                            {idx > 0 && !category.title && sidebarOpen && (
                                <div className="my-2 mx-3 border-t border-secondary-100" />
                            )}

                            <div className="space-y-1">
                                {category.items.map((item: NavItem) => {
                                    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => {
                                                if (window.innerWidth < 1024) {
                                                    setSidebarOpen(false);
                                                }
                                            }}
                                            className={`relative flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group overflow-hidden ${isActive
                                                ? 'bg-primary-50 text-primary-600 font-semibold'
                                                : 'text-secondary-500 hover:bg-secondary-50 hover:text-secondary-900 font-medium'
                                                }`}
                                            title={!sidebarOpen ? item.name : ''}
                                        >
                                            {/* Active Indicator Line */}
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary-600 rounded-r-full"></div>
                                            )}

                                            <span className={`text-lg transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}>
                                                {item.icon}
                                            </span>
                                            <span className={`text-sm tracking-wide ${sidebarOpen ? 'block opacity-100 translate-x-0' : 'hidden opacity-0 -translate-x-4'} transition-all duration-300 whitespace-nowrap`}>
                                                {item.name}
                                            </span>

                                            {/* Hover Chevron */}
                                            {sidebarOpen && !isActive && (
                                                <svg className="ml-auto w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Logout Button in Sidebar */}
                <div className={`border-t border-secondary-200 pt-4 ${sidebarOpen ? 'block' : 'hidden lg:hidden'}`}>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-danger-600 hover:bg-danger-50 transition-colors font-bold text-xs uppercase tracking-wider group"
                    >
                        <svg className="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                    </button>
                </div>
            </nav>
        </aside>
    );
}
