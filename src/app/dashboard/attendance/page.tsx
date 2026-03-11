
'use client';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AttendanceAnalysis from '@/components/dashboard/attendance/AttendanceAnalysis';

export default function AttendanceDashboardPage() {
    const { data: session, status } = useSession();
    const user = session?.user as any;

    if (status === 'loading') {
        return <div className="p-8 text-center animate-pulse text-secondary-500">Loading User Profile...</div>;
    }

    if (!user) {
        return <div className="p-8 text-center text-red-500">Access Denied</div>;
    }

    return (
        <DashboardLayout>
            <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-6 page-animate">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-secondary-900 tracking-tight">
                        Attendance & Leave Analysis
                    </h1>
                    <p className="text-sm sm:text-base text-secondary-500 font-medium">
                        Monitor attendance trends, track leave balances, and identify workforce patterns.
                    </p>
                </div>

                {/* Analysis Dashboard */}
                <AttendanceAnalysis userRole={user.role} />
            </div>
        </DashboardLayout>
    );
}
