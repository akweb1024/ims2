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
        activeLeads,
        pipelineValue,
        revenueData,
        employeeProfile
    ] = await Promise.all([
        prisma.customerProfile.count({
            where: { ...customerFilter, leadStatus: null } // Only count regular customers, not leads
        }),
        prisma.customerProfile.count({
            where: {
                ...customerFilter,
                leadStatus: null, // Only count regular customers
                createdAt: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            }
        }),
        prisma.customerProfile.count({
            where: {
                ...customerFilter,
                leadStatus: {
                    not: null,
                    notIn: ['CONVERTED', 'LOST']
                }
            }
        }),
        prisma.deal.aggregate({
            _sum: { value: true },
            where: {
                ...customerFilter, // ownerId match if not global, deals linked to customer
                stage: { notIn: ['CLOSED_LOST', 'CLOSED_WON'] }
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
    const target = employeeProfile?.monthlyTarget || 1;
    const achievementPercent = Math.min(Math.round((currentRevenue / target) * 100), 100);
    const totalPipeline = pipelineValue._sum.value || 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
                    <span className="text-2xl">🎯</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{activeLeads}</div>
                    <p className="text-xs text-secondary-500">
                        Potential opportunities
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
                    <span className="text-2xl">💼</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₹{totalPipeline.toLocaleString()}</div>
                    <p className="text-xs text-secondary-500">
                        Open deals
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
        </div>
    );
}
