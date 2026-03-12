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
            className={`fixed left-0 h-full transition-all duration-500 ease-in-out z-20 flex flex-col
                ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 w-64 lg:w-[70px]'}
                ${isImpersonating ? 'top-[calc(4rem+2.5rem)]' : 'top-16'}
            `}
            style={{
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderRight: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '8px 0 32px rgba(0,0,0,0.4)',
            }}
        >
            <nav className="p-3 space-y-1 flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar">
                {/* Mobile Module Selector */}
                <div className="lg:hidden mb-4 space-y-1.5 overflow-hidden">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-2">Switch Module</label>
                    <div className="px-2">
                        <select
                            className="w-full px-3 py-2 text-xs bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">{category.title}</span>
                                </div>
                            )}

                            {idx > 0 && !category.title && sidebarOpen && (
                                <div className="my-2 mx-3 border-t border-slate-700/30" />
                            )}
                            {idx > 0 && !category.title && !sidebarOpen && (
                                <div className="my-2 mx-2 border-t border-slate-700/30" />
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
                                            className={`
                                                relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                                                transition-all duration-300 group overflow-hidden
                                                ${isActive
                                                    ? 'bg-blue-600/10 text-blue-500 font-medium border border-blue-500/20'
                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                                }
                                            `}
                                            title={!sidebarOpen ? item.name : ''}
                                        >
                                            {/* Active left indicator */}
                                            {isActive && (
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                            )}

                                            <span className={`text-base flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-blue-500' : ''}`}>
                                                {item.icon}
                                            </span>
                                            
                                            <span className={`text-[13px] font-semibold tracking-wide whitespace-nowrap transition-all duration-300
                                                ${sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}
                                            >
                                                {item.name}
                                            </span>

                                            {/* Accent glow on hover */}
                                            {!isActive && sidebarOpen && (
                                                <span className="ml-auto w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_8px_#3b82f6]" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Logout Button */}
                <div className="border-t border-slate-700/40 pt-2 mt-1 overflow-hidden shrink-0">
                    <button
                        onClick={handleLogout}
                        title={!sidebarOpen ? 'Logout' : ''}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200 font-semibold text-[13px] group"
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
