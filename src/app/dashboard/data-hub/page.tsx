'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DataTransferActions from '@/components/dashboard/DataTransferActions';

export default function DataHubPage() {
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/dashboard/data-hub', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setStats(await res.json());
            }
        } catch (err) {
            console.error(err);
        }
    };

    const sections = [
        {
            title: 'Journal Catalog',
            description: 'Manage scientific journals, ISSNs, and base pricing.',
            type: 'journals' as const,
            icon: '📰',
            fields: ['Name', 'ISSN Print', 'ISSN Online', 'Frequency', 'Price INR', 'Price USD']
        },
        {
            title: 'User Management',
            description: 'Bulk invite staff and manage system access.',
            type: 'users' as const,
            icon: '👥',
            fields: ['Email', 'Password', 'Role', 'CompanyID']
        },
        {
            title: 'Company Records',
            description: 'Manage tenant organizations and their domains.',
            type: 'companies' as const,
            icon: '🏢',
            fields: ['Name', 'Domain', 'Email', 'Phone', 'Currency']
        },
        {
            title: 'Customer Directory',
            description: 'Import client profiles, institutional contacts, and agency partners.',
            type: 'customers' as const,
            icon: '🙍‍♂️',
            fields: ['Name', 'Email', 'CustomerType', 'OrganizationName', 'Country', 'Phone']
        },
        {
            title: 'Subscriptions',
            description: 'Registry of active and historic service agreements.',
            type: 'subscriptions' as const,
            icon: '📋',
            fields: ['CustomerID', 'PlanID', 'StartDate', 'EndDate', 'Status']
        },
        {
            title: 'Invoices',
            description: 'Financial ledger of all billing operations.',
            type: 'invoices' as const,
            icon: '🧾',
            fields: ['Invoice#', 'CustomerID', 'Amount', 'Status', 'DueDate']
        }
    ];

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-8 max-w-6xl mx-auto">
                <div>
                    <h1 className="text-4xl font-extrabold text-secondary-900 tracking-tight font-primary">Data Hub</h1>
                    <p className="text-secondary-600 mt-2 text-lg">Central command for bulk data operations across the system.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {sections.map((section) => (
                        <div key={section.type} className="card-premium p-8 border-t-4 border-primary-500 hover:shadow-2xl transition-all h-full flex flex-col">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                                    {section.icon}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-xl font-bold text-secondary-900">{section.title}</h3>
                                        {stats && (
                                            <span className="bg-secondary-900 text-white text-[10px] px-2 py-0.5 rounded-full font-black min-w-[60px] text-center">
                                                {stats[section.type] || 0} RECS
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-secondary-400 font-bold uppercase tracking-widest mt-1">Entity Module</p>
                                </div>
                            </div>

                            <p className="text-secondary-600 mb-6 flex-1">{section.description}</p>

                            <div className="bg-secondary-50 p-4 rounded-xl mb-6 border border-secondary-100">
                                <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] mb-2">Required Fields for CSV</h4>
                                <div className="flex flex-wrap gap-2">
                                    {section.fields.map(f => (
                                        <span key={f} className="px-2 py-1 bg-white border border-secondary-200 rounded text-[10px] text-secondary-700 font-medium">
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-secondary-50">
                                <DataTransferActions
                                    type={section.type}
                                    onSuccess={fetchStats}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Information Card */}
                <div className="card-premium p-10 bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <div className="relative z-10 max-w-2xl">
                        <h2 className="text-3xl font-bold mb-4">Export Guidelines</h2>
                        <ul className="space-y-3 text-primary-50">
                            <li className="flex items-start gap-3">
                                <span className="mt-1">✅</span>
                                <div>
                                    <strong className="text-white">Validation:</strong> All imported data is validated against existing records to prevent duplicates.
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1">✅</span>
                                <div>
                                    <strong className="text-white">IDs:</strong> You do not need to provide IDs during import; the system generates unique UUIDs automatically.
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1">✅</span>
                                <div>
                                    <strong className="text-white">Format:</strong> Ensure your CSV headers exactly match the required fields listed above for a smooth import.
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
