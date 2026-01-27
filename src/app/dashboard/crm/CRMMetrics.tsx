import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default async function CRMMetrics({ user }: { user: any }) {

    // Define Role-Based Filters
    const isGlobal = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(user.role);
    // Ideally Manager/TL should filter by their team, but for V1 parity with user request "hierarchy", 
    // we'll start with broad access for leaders or strictly self for executives.
    // For true hierarchy, we need to know who reports to whom. Assuming generic "Team" view for leaders if feasible, 
    // but without recursive queries, we'll restrict EXECUTIVE to self, others Global for now.

    const customerFilter = isGlobal ? {} : { assignedToUserId: user.id };

    // Revenue Filter: Invoices where subscription -> customer -> assignedTo matches user
    const revenueFilter = isGlobal ? {} : {
        subscription: {
            customerProfile: {
                assignedToUserId: user.id
            }
        }
    };

    const [
        totalCustomers,
        newCustomersThisMonth,
        totalInteractions,
        pendingFollowUps,
        revenueData,
        employeeProfile
    ] = await Promise.all([
        prisma.customerProfile.count({ where: customerFilter }),
        prisma.customerProfile.count({
            where: {
                ...customerFilter,
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
                // Note: Communication logs might not perfectly link to "assigned" customers if created by others,
                // but usually they are. For now, showing global logs for context or we'd need a join.
            }
        }),
        prisma.communicationLog.count({
            where: {
                nextFollowUpDate: { not: null },
                isFollowUpCompleted: false,
                // assigning user logic for tasks?
                // Ideally follow-ups are user specific.
                userId: isGlobal ? undefined : user.id
            }
        }),
        prisma.invoice.aggregate({
            _sum: { total: true },
            where: {
                status: 'PAID',
                ...revenueFilter,
                createdAt: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            }
        }),
        prisma.employeeProfile.findUnique({
            where: { userId: user.id }
        })
    ]);

    const currentRevenue = revenueData._sum.total || 0;
    const target = employeeProfile?.monthlyTarget || 1; // Avoid div by zero
    const achievementPercent = Math.min(Math.round((currentRevenue / target) * 100), 100);

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
                        +{newCustomersThisMonth} new this month
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Revenue (MTD)</CardTitle>
                    <span className="text-2xl">💰</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₹{currentRevenue.toLocaleString()}</div>
                    <div className="mt-2 h-2 w-full bg-secondary-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${achievementPercent >= 100 ? 'bg-success-500' : 'bg-primary-500'}`}
                            style={{ width: `${achievementPercent}%` }}
                        />
                    </div>
                    <p className="text-xs text-secondary-500 mt-1">
                        {achievementPercent}% of ₹{target.toLocaleString()} target
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
