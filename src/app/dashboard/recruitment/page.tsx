'use client';

import { useState, useEffect } from 'react';
import HRClientLayout from '../hr-management/HRClientLayout';
import RecruitmentDashboardComponent from '@/components/dashboard/hr/RecruitmentDashboard';
import { Users } from 'lucide-react';

export default function RecruitmentDashboardPage() {
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [jobsCount, setJobsCount] = useState(0);
    const [applicationsCount, setApplicationsCount] = useState(0);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUserRole(JSON.parse(userData).role);
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadCounts = async () => {
            try {
                const [jobsRes, applicationsRes] = await Promise.all([
                    fetch('/api/recruitment/jobs'),
                    fetch('/api/recruitment/applications'),
                ]);

                const jobs = jobsRes.ok ? await jobsRes.json() : [];
                const applications = applicationsRes.ok ? await applicationsRes.json() : [];

                if (!isMounted) return;
                setJobsCount(Array.isArray(jobs) ? jobs.length : 0);
                setApplicationsCount(Array.isArray(applications) ? applications.length : 0);
            } catch {
                if (!isMounted) return;
                setJobsCount(0);
                setApplicationsCount(0);
            }
        };

        loadCounts();
        return () => {
            isMounted = false;
        };
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
                        <p className="text-secondary-500 mt-1 text-sm">Manage open positions ({jobsCount})</p>
                        {applicationsCount === 0 && (
                            <p className="text-secondary-400 mt-1 text-xs italic">No active applications.</p>
                        )}
                    </div>
                </div>

                {/* Use the shared modular component */}
                <RecruitmentDashboardComponent />
            </div>
        </HRClientLayout>
    );
}
