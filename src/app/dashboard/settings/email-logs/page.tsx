import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import EmailLogFilters from './EmailLogFilters';
import Link from 'next/link';

export default async function EmailLogsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const user = await getAuthenticatedUser();

    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
        redirect('/login'); // Or show access denied
    }

    const params = await searchParams;

    // Parse Search Params
    const page = Number(params.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const query = typeof params.q === 'string' ? params.q : undefined;
    const status = typeof params.status === 'string' && params.status !== 'ALL' ? params.status : undefined;
    const dateFrom = typeof params.from === 'string' ? params.from : undefined;
    const dateTo = typeof params.to === 'string' ? params.to : undefined;

    // Build Where Clause
    const whereClause: any = {};

    if (query) {
        whereClause.OR = [
            { recipient: { contains: query, mode: 'insensitive' } },
            { subject: { contains: query, mode: 'insensitive' } }
        ];
    }

    if (status) {
        whereClause.status = status;
    }

    if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
        if (dateTo) whereClause.createdAt.lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }

    // Fetch Logs
    const [logs, totalCount] = await Promise.all([
        prisma.systemEmailLog.findMany({
            where: whereClause,
            take: limit,
            skip: skip,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.systemEmailLog.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return (
        <DashboardLayout userRole={user.role}>
            <div className="max-w-7xl mx-auto space-y-6 p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">System Email Logs</h1>
                        <p className="text-secondary-500 mt-1">Audit trail of system communications.</p>
                    </div>
                </div>

                <EmailLogFilters />

                <div className="card-premium p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-secondary-50 border-b border-secondary-200">
                                <tr>
                                    <th className="py-4 px-6 text-xs font-bold text-secondary-500 uppercase">Status</th>
                                    <th className="py-4 px-6 text-xs font-bold text-secondary-500 uppercase">Timestamp</th>
                                    <th className="py-4 px-6 text-xs font-bold text-secondary-500 uppercase">Recipient</th>
                                    <th className="py-4 px-6 text-xs font-bold text-secondary-500 uppercase">Subject</th>
                                    <th className="py-4 px-6 text-xs font-bold text-secondary-500 uppercase">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-secondary-500 italic">
                                            No logs found matching filters.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-secondary-50/50 transition-colors">
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${log.status === 'SENT'
                                                    ? 'bg-success-50 text-success-700 border-success-200'
                                                    : 'bg-danger-50 text-danger-700 border-danger-200'
                                                    }`}>
                                                    {log.status === 'SENT' ? '● Sent' : '✕ Failed'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-secondary-600 font-mono">
                                                <FormattedDate date={log.createdAt} />
                                            </td>
                                            <td className="py-4 px-6 text-sm font-medium text-secondary-900">
                                                {log.recipient}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-secondary-700 max-w-[250px] truncate" title={log.subject}>
                                                {log.subject}
                                            </td>
                                            <td className="py-4 px-6 text-xs font-mono text-secondary-500 max-w-[250px] truncate">
                                                {log.error ? (
                                                    <span className="text-danger-600 font-bold" title={log.error}>{log.error}</span>
                                                ) : (
                                                    <span title={log.messageId || ''}>{log.messageId || '-'}</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="border-t border-secondary-200 px-6 py-4 flex items-center justify-between">
                            <span className="text-sm text-secondary-500">
                                Page {page} of {totalPages}
                            </span>
                            <div className="flex space-x-2">
                                <Link
                                    href={`?page=${page > 1 ? page - 1 : 1}&${new URLSearchParams({ ...params as any, page: (page > 1 ? page - 1 : 1).toString() }).toString()}`}
                                    className={`px-3 py-1 rounded border text-sm font-medium ${page <= 1 ? 'pointer-events-none opacity-50 bg-secondary-100' : 'hover:bg-secondary-50'}`}
                                >
                                    Previous
                                </Link>
                                <Link
                                    href={`?page=${page < totalPages ? page + 1 : totalPages}&${new URLSearchParams({ ...params as any, page: (page < totalPages ? page + 1 : totalPages).toString() }).toString()}`}
                                    className={`px-3 py-1 rounded border text-sm font-medium ${page >= totalPages ? 'pointer-events-none opacity-50 bg-secondary-100' : 'hover:bg-secondary-50'}`}
                                >
                                    Next
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
