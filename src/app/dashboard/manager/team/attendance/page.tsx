import { Suspense } from 'react';
import { auth } from '@/lib/nextauth';
import { getUnifiedAttendance } from '@/lib/team-service';
import AttendanceFilters from './AttendanceFilters';
import { format } from 'date-fns';

function StatusBadge({ status }: { status: string }) {
    const styles = {
        PRESENT: 'bg-green-100 text-green-800',
        ABSENT: 'bg-red-100 text-red-800',
        LATE: 'bg-yellow-100 text-yellow-800',
        HALF_DAY: 'bg-orange-100 text-orange-800',
        LEAVE: 'bg-blue-100 text-blue-800',
    };

    const style = styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';

    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${style}`}>
            {status}
        </span>
    );
}

export default async function UnifiedAttendancePage({
    searchParams,
}: {
    searchParams: Promise<{ month?: string; year?: string; userId?: string; companyId?: string }>;
}) {
    const params = await searchParams;
    const session = await auth();
    if (!session?.user?.id) return <div>Unauthorized</div>;

    const month = parseInt(params.month || String(new Date().getMonth() + 1));
    const year = parseInt(params.year || String(new Date().getFullYear()));

    const attendance = await getUnifiedAttendance(session.user.id, {
        month,
        year,
        userId: params.userId,
        companyId: params.companyId,
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Unified Attendance</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Monitor attendance across all your teams and companies
                </p>
            </div>

            <AttendanceFilters />

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In/Out</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {attendance.map((record) => (
                                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {format(new Date(record.date), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs">
                                                {record.employee.user.name?.charAt(0) || 'U'}
                                            </div>
                                            <div className="ml-3">
                                                <div className="text-sm font-medium text-gray-900">{record.employee.user.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {record.companyName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {record.shift?.name || 'Default'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div>In: {record.checkIn ? format(new Date(record.checkIn), 'HH:mm') : '-'}</div>
                                        <div>Out: {record.checkOut ? format(new Date(record.checkOut), 'HH:mm') : '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={record.status} />
                                        {record.lateMinutes && record.lateMinutes > 0 && (
                                            <span className="ml-2 text-xs text-red-600 font-medium">
                                                +{record.lateMinutes}m late
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {attendance.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No attendance records found for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
