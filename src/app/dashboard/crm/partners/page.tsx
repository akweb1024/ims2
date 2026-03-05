'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AgencyList from './AgencyList';
import InstitutionList from './InstitutionList';
import { Users, Building2, LayoutGrid, ListFilter } from 'lucide-react';
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
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-secondary-900 tracking-tight">Partner Ecosystem</h1>
                        <p className="text-secondary-500 font-medium">Manage your global network of agencies and institutions in one place.</p>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex p-1.5 bg-secondary-100/50 backdrop-blur-md rounded-2xl w-full max-w-md border border-secondary-200">
                    <button
                        onClick={() => handleTabChange('agencies')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300 font-black text-sm ${
                            activeTab === 'agencies'
                                ? 'bg-white text-primary-600 shadow-sm shadow-primary-100 ring-1 ring-secondary-200'
                                : 'text-secondary-500 hover:text-secondary-700'
                        }`}
                    >
                        <Users size={18} className={activeTab === 'agencies' ? 'text-primary-500' : 'text-secondary-400'} />
                        Agencies
                    </button>
                    <button
                        onClick={() => handleTabChange('institutions')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl transition-all duration-300 font-black text-sm ${
                            activeTab === 'institutions'
                                ? 'bg-white text-primary-600 shadow-sm shadow-primary-100 ring-1 ring-secondary-200'
                                : 'text-secondary-500 hover:text-secondary-700'
                        }`}
                    >
                        <Building2 size={18} className={activeTab === 'institutions' ? 'text-primary-500' : 'text-secondary-400'} />
                        Institutions
                    </button>
                </div>

                {/* View Content */}
                <div className="mt-8">
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
            </div>
        </DashboardLayout>
    );
}
