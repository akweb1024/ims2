'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { CRMPageShell } from '@/components/crm/CRMPageShell';
import AgencyList from './AgencyList';
import InstitutionList from './InstitutionList';
import { Users, Building2, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PartnersPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialTab = searchParams.get('tab') || 'agencies';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            setUserRole(JSON.parse(user).role);
        }
    }, []);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        router.push(`?${params.toString()}`);
    };

    return (
        <DashboardLayout userRole={userRole}>
            <CRMPageShell
                title="Partner Ecosystem"
                subtitle="Manage your global network of agencies and institutions."
                breadcrumb={[{ label: 'CRM', href: '/dashboard/crm' }, { label: 'Partners' }]}
                icon={<LayoutGrid className="w-5 h-5" />}
            >
                {/* Navigation Tabs */}
                <div className="flex p-1 bg-secondary-100/50 backdrop-blur-md rounded-xl w-full max-w-sm border border-secondary-200">
                    <button
                        onClick={() => handleTabChange('agencies')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all duration-200 font-semibold text-sm ${
                            activeTab === 'agencies'
                                ? 'bg-white text-primary-600 shadow-sm ring-1 ring-secondary-200'
                                : 'text-secondary-500 hover:text-secondary-700'
                        }`}
                    >
                        <Users size={16} className={activeTab === 'agencies' ? 'text-primary-600' : 'text-secondary-400'} />
                        Agencies
                    </button>
                    <button
                        onClick={() => handleTabChange('institutions')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all duration-200 font-semibold text-sm ${
                            activeTab === 'institutions'
                                ? 'bg-white text-primary-600 shadow-sm ring-1 ring-secondary-200'
                                : 'text-secondary-500 hover:text-secondary-700'
                        }`}
                    >
                        <Building2 size={16} className={activeTab === 'institutions' ? 'text-primary-600' : 'text-secondary-400'} />
                        Institutions
                    </button>
                </div>

                {/* View Content */}
                <div className="mt-2">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'agencies' ? (
                                <AgencyList userRole={userRole} />
                            ) : (
                                <InstitutionList userRole={userRole} />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </CRMPageShell>
        </DashboardLayout>
    );
}
