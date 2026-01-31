
'use client';
import { useSession } from 'next-auth/react';
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
        <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black text-secondary-900 tracking-tight">Attendance & Leave Analysis</h1>
                <p className="text-secondary-500 font-medium">
                    Monitor attendance trends, track leave balances, and identify workforce patterns.
                </p>
            </div>

            {/* Analysis Dashboard */}
            <AttendanceAnalysis userRole={user.role} />
        </div>
    );
}
