'use client';

import { useState, useEffect } from 'react';
import HRClientLayout from '../hr-management/HRClientLayout';
import RecruitmentDashboardComponent from '@/components/dashboard/hr/RecruitmentDashboard';
import { Users } from 'lucide-react';

export default function RecruitmentDashboardPage() {
    const [userRole, setUserRole] = useState('CUSTOMER');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUserRole(JSON.parse(userData).role);
    }, []);

    return (
        <HRClientLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 flex items-center gap-3">
                            <Users size={32} className="text-primary-600" />
                            Recruitment Hub
                        </h1>
                        <p className="text-secondary-500 mt-2 font-medium">Manage talent acquisition, interviews, and onboarding.</p>
                    </div>
                </div>

                {/* Use the shared modular component */}
                <RecruitmentDashboardComponent />
            </div>
        </HRClientLayout>
    );
}
