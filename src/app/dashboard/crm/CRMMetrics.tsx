import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default async function CRMMetrics() {
    const [
        totalCustomers,
        newCustomersThisMonth,
        totalInteractions,
        pendingFollowUps
    ] = await Promise.all([
        prisma.customerProfile.count(),
        prisma.customerProfile.count({
            where: {
                createdAt: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            }
        }),
        prisma.communicationLog.count({
            where: {
                createdAt: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            }
        }),
        prisma.communicationLog.count({
            where: {
                nextFollowUpDate: { not: null },
                isFollowUpCompleted: false
            }
        })
    ]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                    <span className="text-2xl">👥</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalCustomers}</div>
                    <p className="text-xs text-secondary-500">
                        +{newCustomersThisMonth} this month
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
                    <span className="text-2xl">⚡</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">--</div>
                    <p className="text-xs text-secondary-500">
                        Pipeline value: ₹0
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Interactions</CardTitle>
                    <span className="text-2xl">📞</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalInteractions}</div>
                    <p className="text-xs text-secondary-500">
                        This month (Calls/Emails)
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Follow-ups</CardTitle>
                    <span className="text-2xl">📅</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{pendingFollowUps}</div>
                    <p className="text-xs text-secondary-500">
                        Requires attention
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
