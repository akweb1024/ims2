import { Suspense } from 'react';
import { auth } from '@/lib/nextauth';
import { getUnifiedLeaveRequests } from '@/lib/team-service';
import LeaveActionButtons from './LeaveActionButtons';
import { format } from 'date-fns';

function StatusBadge({ status }: { status: string }) {
    const styles = {
        APPROVED: 'bg-green-100 text-green-800',
        REJECTED: 'bg-red-100 text-red-800',
        PENDING: 'bg-yellow-100 text-yellow-800',
    };

    const style = styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';

    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${style}`}>
            {status}
        </span>
    );
}

export default async function UnifiedLeavePage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; companyId?: string }>;
}) {
    const params = await searchParams;
    const session = await auth();
    if (!session?.user?.id) return <div>Unauthorized</div>;

    const leaves = await getUnifiedLeaveRequests(session.user.id, {
        status: params.status,
        companyId: params.companyId,
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Review and manage leave requests from all your teams
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type / Reason</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {leaves.map((leave) => (
                                <tr key={leave.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs">
                                                {leave.employee.user.name?.charAt(0) || 'U'}
                                            </div>
                                            <div className="ml-3">
                                                <div className="text-sm font-medium text-gray-900">{leave.employee.user.name}</div>
                                                <div className="text-xs text-gray-500">{leave.employee.user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                            {leave.companyName}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div>{format(new Date(leave.startDate), 'MMM d')} - {format(new Date(leave.endDate), 'MMM d, yyyy')}</div>
                                        {/* Add days calculation logic if needed */}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{leave.type}</div>
                                        <div className="text-xs text-gray-500 truncate max-w-xs" title={leave.reason || ''}>
                                            {leave.reason || 'No reason provided'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={leave.status} />
                                        {leave.approvedBy && (
                                            <div className="text-xs text-gray-400 mt-1">
                                                by {leave.approvedBy.name}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <LeaveActionButtons leaveId={leave.id} status={leave.status} />
                                    </td>
                                </tr>
                            ))}

                            {leaves.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No leave requests found.
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
