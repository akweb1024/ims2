'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import IncrementPlanningView from '@/components/dashboard/hr/IncrementPlanningView';

export default function IncrementPlanningPage() {
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setCurrentUser(JSON.parse(userData));
    }, []);

    return (
        <DashboardLayout userRole={currentUser?.role}>
            <div className="space-y-6 max-w-[1600px] mx-auto">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Compensation Planning</h1>
                        <p className="text-secondary-500 mt-1">Review, adjust, and approve salary increments based on performance and growth.</p>
                    </div>
                </div>

                <IncrementPlanningView />
            </div>
        </DashboardLayout>
    );
}
