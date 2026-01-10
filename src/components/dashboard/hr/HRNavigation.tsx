'use client';

import {
    Users, Briefcase, Calendar,
    DollarSign, BarChart2, UserPlus, Layers,
    ChevronDown, HelpCircle, LayoutGrid
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const CATEGORIES = [
    {
        id: 'core',
        title: 'Core HR',
        icon: <Users size={18} />,
        tabs: [
            { id: 'employees', label: 'All Employees' },
            { id: 'onboarding', label: 'Onboarding Pipeline' },
            { id: 'documents', label: 'Document Vault' },
            { id: 'document-templates', label: 'Offer/Contract Templates' },
        ]
    },
    {
        id: 'workforce',
        title: 'Workforce',
        icon: <Layers size={18} />,
        tabs: [
            { id: 'departments', label: 'Departments & Hierarchy' },
            { id: 'shifts', label: 'Shift Management' },
            { id: 'roster', label: 'Duty Roster' },
            { id: 'map', label: 'Field Force Map' },
        ]
    },
    {
        id: 'time',
        title: 'Time & Leave',
        icon: <Calendar size={18} />,
        tabs: [
            { id: 'attendance', label: 'Attendance Logs' },
            { id: 'leaves', label: 'Leave Requests' },
            { id: 'leave-ledger', label: 'Leave Balances' },
            { id: 'holidays', label: 'Holiday Calendar' },
        ]
    },
    {
        id: 'finance',
        title: 'Payroll',
        icon: <DollarSign size={18} />,
        tabs: [
            { id: 'payroll', label: 'Salary Slips' },
            { id: 'salary-structures', label: 'Salary Structures' },
            { id: 'advances', label: 'Advance/Loans' },
            { id: 'statutory', label: 'Statutory Compliance' },
            { id: 'budgets', label: 'Allocated Budgets' },
            { id: 'final-settlement', label: 'F&F Settlement' },
        ]
    },
    {
        id: 'recruitment',
        title: 'Recruitment',
        icon: <UserPlus size={18} />,
        tabs: [
            { id: 'recruitment', label: 'Job Board & ATS' },
        ]
    },
    {
        id: 'analytics',
        title: 'Analytics',
        icon: <BarChart2 size={18} />,
        tabs: [
            { id: 'analytics', label: 'Performance Reviews' },
            { id: 'reports', label: 'Work Reports' },
            { id: 'productivity', label: 'Productivity Insights' },
        ]
    }
];

export default function HRNavigation({ activeTab, onTabChange, onHelpClick }: { activeTab: string, onTabChange: (t: string) => void, onHelpClick: () => void }) {
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdown(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Find active category
    const activeCategory = CATEGORIES.find(c => c.tabs.some(t => t.id === activeTab)) || CATEGORIES[0];

    return (
        <div className="relative z-20" ref={dropdownRef}>
            {/* Main Navigation Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-1.5 flex items-center justify-between">

                {/* Desktop Tabs */}
                <div className="hidden md:flex items-center gap-1 w-full">
                    {CATEGORIES.map(cat => {
                        const isActive = activeCategory.id === cat.id;
                        const isOpen = openDropdown === cat.id;

                        return (
                            <div key={cat.id} className="relative group">
                                <button
                                    onClick={() => setOpenDropdown(isOpen ? null : cat.id)}
                                    // Make hover open dropdown too for better UX
                                    onMouseEnter={() => setOpenDropdown(cat.id)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200
                                        font-bold text-sm select-none
                                        ${isActive
                                            ? 'bg-secondary-900 text-white shadow-md'
                                            : 'text-secondary-500 hover:bg-secondary-50 hover:text-secondary-900'
                                        }
                                    `}
                                >
                                    {cat.icon}
                                    <span>{cat.title}</span>
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} opacity-60`} />
                                </button>

                                {/* Dropdown Menu */}
                                {isOpen && (
                                    <div
                                        className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-secondary-100 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50 p-2"
                                        onMouseLeave={() => setOpenDropdown(null)}
                                    >
                                        <div className="text-[10px] font-black text-secondary-400 uppercase tracking-widest px-3 py-2 mb-1 border-b border-secondary-50">
                                            {cat.title} Menu
                                        </div>
                                        {cat.tabs.map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => {
                                                    onTabChange(tab.id);
                                                    setOpenDropdown(null);
                                                }}
                                                className={`
                                                    w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all
                                                    flex items-center justify-between group/item
                                                    ${activeTab === tab.id
                                                        ? 'bg-primary-50 text-primary-700'
                                                        : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                                                    }
                                                `}
                                            >
                                                {tab.label}
                                                {activeTab === tab.id && <div className="w-1.5 h-1.5 rounded-full bg-primary-600" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Mobile Trigger */}
                <div className="md:hidden w-full">
                    <button
                        onClick={() => setOpenDropdown(openDropdown === 'mobile' ? null : 'mobile')}
                        className="w-full flex items-center justify-between p-2"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-secondary-900 text-white rounded-lg">
                                <LayoutGrid size={18} />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-widest">Current View</p>
                                <p className="font-bold text-secondary-900">
                                    {CATEGORIES.flatMap(c => c.tabs).find(t => t.id === activeTab)?.label || 'Menu'}
                                </p>
                            </div>
                        </div>
                        <ChevronDown className={`transition-transform ${openDropdown === 'mobile' ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* Help Button */}
                <div className="hidden md:block pl-2 border-l border-secondary-200 ml-2">
                    <button
                        onClick={onHelpClick}
                        className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                        title="Help & Documentation"
                    >
                        <HelpCircle size={20} />
                    </button>
                </div>
            </div>

            {/* Mobile Dropdown Menu (Full Width) */}
            {openDropdown === 'mobile' && (
                <div className="md:hidden absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-secondary-100 overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
                    {CATEGORIES.map(cat => (
                        <div key={cat.id} className="border-b border-secondary-50 last:border-none">
                            <div className="bg-secondary-50/50 px-4 py-2 text-[10px] font-black text-secondary-400 uppercase tracking-widest flex items-center gap-2">
                                {cat.icon} {cat.title}
                            </div>
                            <div className="p-2 space-y-1">
                                {cat.tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            onTabChange(tab.id);
                                            setOpenDropdown(null);
                                        }}
                                        className={`
                                            w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all
                                            ${activeTab === tab.id ? 'bg-primary-50 text-primary-900' : 'text-secondary-600 hover:bg-secondary-50'}
                                        `}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                    <div className="p-2 border-t border-secondary-100">
                        <button
                            onClick={onHelpClick}
                            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-secondary-500 hover:bg-secondary-50 rounded-xl"
                        >
                            <HelpCircle size={16} /> Help & Documentation
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
