'use client';

import {
    Users, FileText, Briefcase, Calendar,
    DollarSign, BarChart2, UserPlus, Map,
    Clock, Shield, Layers, Settings, ChevronDown, CheckCircle2,
    HelpCircle
} from 'lucide-react';
import { useState } from 'react';

const CATEGORIES = [
    {
        id: 'core',
        title: 'Core HR',
        icon: <Users size={16} />,
        tabs: [
            { id: 'employees', label: 'Employees' },
            { id: 'onboarding', label: 'Onboarding' },
            { id: 'documents', label: 'Documents' },
            { id: 'document-templates', label: 'Templates' },
        ]
    },
    {
        id: 'workforce',
        title: 'Workforce',
        icon: <Layers size={16} />,
        tabs: [
            { id: 'departments', label: 'Departments' },
            { id: 'shifts', label: 'Shifts' },
            { id: 'roster', label: 'Roster' },
            { id: 'map', label: 'Field Map' },
        ]
    },
    {
        id: 'time',
        title: 'Time & Leave',
        icon: <Calendar size={16} />,
        tabs: [
            { id: 'attendance', label: 'Attendance' },
            { id: 'leaves', label: 'Leaves' },
            { id: 'leave-ledger', label: 'Leave Ledger' },
            { id: 'holidays', label: 'Holidays' },
        ]
    },
    {
        id: 'finance',
        title: 'Payroll & Finance',
        icon: <DollarSign size={16} />,
        tabs: [
            { id: 'payroll', label: 'Payslips' },
            { id: 'salary-structures', label: 'Structure' },
            { id: 'advances', label: 'Advances' },
            { id: 'statutory', label: 'Statutory' },
            { id: 'budgets', label: 'Budgets' },
            { id: 'final-settlement', label: 'F&F' },
        ]
    },
    {
        id: 'recruitment',
        title: 'Recruitment',
        icon: <UserPlus size={16} />,
        tabs: [
            { id: 'recruitment', label: 'ATS & Jobs' },
        ]
    },
    {
        id: 'analytics',
        title: 'Analytics',
        icon: <BarChart2 size={16} />,
        tabs: [
            { id: 'analytics', label: 'Performance' },
            { id: 'reports', label: 'Work Reports' },
            { id: 'productivity', label: 'Productivity' },
        ]
    }
];

export default function HRNavigation({ activeTab, onTabChange, onHelpClick }: { activeTab: string, onTabChange: (t: string) => void, onHelpClick: () => void }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Find current category
    const currentCategory = CATEGORIES.find(c => c.tabs.some(t => t.id === activeTab)) || CATEGORIES[0];
    const currentTabLabel = CATEGORIES.flatMap(c => c.tabs).find(t => t.id === activeTab)?.label;

    return (
        <div className="w-full space-y-4">
            {/* Mobile View */}
            <div className="md:hidden">
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="w-full flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-secondary-200"
                >
                    <div className="flex items-center gap-3">
                        <span className="p-2 bg-primary-50 text-primary-600 rounded-lg">{currentCategory.icon}</span>
                        <div className="text-left">
                            <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-widest">{currentCategory.title}</p>
                            <p className="font-bold text-secondary-900">{currentTabLabel}</p>
                        </div>
                    </div>
                    <ChevronDown size={20} className={`transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {mobileMenuOpen && (
                    <div className="mt-2 bg-white rounded-xl shadow-xl border border-secondary-100 overflow-hidden animate-in slide-in-from-top-2">
                        {CATEGORIES.map(cat => (
                            <div key={cat.id} className="border-b border-secondary-50 last:border-0">
                                <div className="bg-secondary-50/50 px-4 py-2 text-[10px] font-black text-secondary-400 uppercase tracking-widest flex items-center gap-2">
                                    {cat.icon} {cat.title}
                                </div>
                                <div className="grid grid-cols-2 gap-1 p-2">
                                    {cat.tabs.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                onTabChange(tab.id);
                                                setMobileMenuOpen(false);
                                            }}
                                            className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-primary-50 text-primary-700' : 'text-secondary-600 hover:bg-secondary-50'}`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Desktop View: Grouped Pills */}
            <div className="hidden md:flex flex-wrap gap-6 bg-white p-4 rounded-2xl shadow-sm border border-secondary-100">
                {CATEGORIES.map(cat => (
                    <div key={cat.id} className="flex-1 min-w-[140px] flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 pl-1">
                            {cat.icon} {cat.title}
                        </div>
                        <div className="flex flex-col gap-1">
                            {cat.tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => onTabChange(tab.id)}
                                    className={`text-left px-3 py-2 rounded-lg text-[11px] font-bold transition-all flex justify-between items-center group relative ${activeTab === tab.id ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-secondary-500 hover:bg-secondary-50 hover:text-secondary-900'}`}
                                >
                                    {tab.label}
                                    {activeTab === tab.id && <CheckCircle2 size={12} className="text-primary-600" />}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Help & Documentation Bar */}
            <div className="flex justify-end">
                <button
                    onClick={onHelpClick}
                    className="flex items-center gap-2 text-[10px] font-bold text-secondary-500 hover:text-primary-600 uppercase tracking-widest transition-colors"
                >
                    <HelpCircle size={14} />
                    How to use this section?
                </button>
            </div>
        </div>
    );
}
