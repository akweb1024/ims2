import { auth } from '@/lib/nextauth';
import { getUnifiedWorkReports } from '@/lib/team-service';
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

export default async function UnifiedWorkReportsPage({
    searchParams,
}: {
    searchParams: Promise<{ startDate?: string; endDate?: string; userId?: string; status?: string }>;
}) {
    const params = await searchParams;
    const session = await auth();
    if (!session?.user?.id) return <div>Unauthorized</div>;

    const reports = await getUnifiedWorkReports(session.user.id, {
        startDate: params.startDate,
        endDate: params.endDate,
        userId: params.userId,
        status: params.status,
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Work Reports</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Review daily work reports from your team members
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reports.map((report) => (
                                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {format(new Date(report.date), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs">
                                                {report.employee.user.name?.charAt(0) || 'U'}
                                            </div>
                                            <div className="ml-3">
                                                <div className="text-sm font-medium text-gray-900">{report.employee.user.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {report.companyName}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <div className="line-clamp-2 max-w-md">{report.content}</div>
                                        {report.comments.length > 0 && (
                                            <div className="mt-1 text-xs text-primary-600">
                                                {report.comments.length} comments
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={report.status} />
                                    </td>
                                </tr>
                            ))}
                            {reports.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No work reports found matching criteria.
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
