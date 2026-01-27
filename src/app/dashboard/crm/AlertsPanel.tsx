import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';

export default async function AlertsPanel({ user }: { user: any }) {
    const isGlobal = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);

    // Filters depend on role
    const invoiceFilter = isGlobal ? {} : {
        subscription: { customerProfile: { assignedToUserId: user.id } }
    };

    const taskFilter = isGlobal ? {} : { userId: user.id };

    const [overdueInvoices, todaysFollowUps] = await Promise.all([
        prisma.invoice.findMany({
            where: {
                status: 'UNPAID',
                dueDate: { lt: new Date() },
                ...invoiceFilter
            },
            take: 3,
            select: { id: true, invoiceNumber: true, total: true, dueDate: true, subscription: { select: { customerProfile: { select: { name: true } } } } }
        }),
        prisma.communicationLog.findMany({
            where: {
                nextFollowUpDate: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    lt: new Date(new Date().setHours(23, 59, 59, 999))
                },
                isFollowUpCompleted: false,
                ...taskFilter
            },
            take: 3,
            select: { id: true, subject: true, customerProfile: { select: { name: true } } }
        })
    ]);

    if (overdueInvoices.length === 0 && todaysFollowUps.length === 0) return null;

    return (
        <Card className="border-danger-100 bg-danger-50/10">
            <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-danger-700">
                    <span className="animate-pulse">🚨</span>
                    <span>Urgent Attention</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {overdueInvoices.length > 0 && (
                    <div>
                        <h4 className="text-xs font-bold text-secondary-500 uppercase mb-2">Overdue Invoices</h4>
                        <ul className="space-y-2">
                            {overdueInvoices.map(inv => (
                                <li key={inv.id} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-danger-100">
                                    <div>
                                        <Link href={`/dashboard/invoices/${inv.id}`} className="font-medium text-secondary-900 hover:text-primary-600 underline">
                                            {inv.invoiceNumber}
                                        </Link>
                                        <p className="text-[10px] text-secondary-500">{inv.subscription?.customerProfile?.name}</p>
                                    </div>
                                    <span className="font-bold text-danger-600">
                                        ₹{inv.total.toLocaleString()}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {todaysFollowUps.length > 0 && (
                    <div>
                        <h4 className="text-xs font-bold text-secondary-500 uppercase mb-2">Follow-ups Due Today</h4>
                        <ul className="space-y-2">
                            {todaysFollowUps.map(fu => (
                                <li key={fu.id} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-secondary-200">
                                    <span className="truncate max-w-[150px]">{fu.subject}</span>
                                    <span className="text-[10px] bg-secondary-100 px-2 py-0.5 rounded text-secondary-600">
                                        {fu.customerProfile.name}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
