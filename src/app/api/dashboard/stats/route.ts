import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { convertToINR, getLiveRates } from '@/lib/exchange-rates';

export async function GET(req: NextRequest) {
    try {
        // 1. Verify Authentication
        const decoded = await getAuthenticatedUser();
        if (!decoded) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const role = decoded.role;
        const userId = decoded.id;
        const userCompanyId = decoded.companyId;

        // Fetch latest rates for precision
        await getLiveRates();

        // Determine filter based on role and company context
        let customerProfileId: string | undefined;
        let whereClause: any = {};

        if (userCompanyId) {
            whereClause.companyId = userCompanyId;
        }

        if (role === 'CUSTOMER') {
            const profile = await prisma.customerProfile.findUnique({ where: { userId } });
            if (profile) {
                customerProfileId = profile.id;
                whereClause = { ...whereClause, customerProfileId: profile.id };
            }
        } else if (role === 'AGENCY') {
            const profile = await prisma.customerProfile.findUnique({
                where: { userId },
                include: { agencyDetails: true }
            });
            if (profile?.agencyDetails) {
                whereClause = { ...whereClause, agencyId: profile.agencyDetails.id };
            }
        } else if (role === 'SALES_EXECUTIVE') {
            whereClause = { ...whereClause, salesExecutiveId: userId };
        } else if (role === 'MANAGER') {
            // Manager sees data for all their subordinates (Sales Executives) within their company
            const subordinates = await prisma.user.findMany({
                where: {
                    managerId: userId,
                    companyId: userCompanyId || undefined
                },
                select: { id: true }
            });

            const subordinateIds = subordinates.map((s) => s.id);

            // 2. Include Manager's own direct sales + Subordinates' sales
            whereClause = {
                ...whereClause,
                salesExecutiveId: { in: [userId, ...subordinateIds] }
            };
        }

        // Revenue calculation needs to match the hierarchy
        let revenueWhere: any = {};

        if (customerProfileId) {
            revenueWhere = { invoice: { subscription: { customerProfileId } } };
        } else if (whereClause.agencyId) {
            revenueWhere = { invoice: { subscription: { agencyId: whereClause.agencyId } } };
        } else if (whereClause.salesExecutiveId) {
            // Handles both Single Sales Exec and Manager (via 'in' array)
            revenueWhere = { invoice: { subscription: { salesExecutiveId: whereClause.salesExecutiveId } } };
        }

        // Renewals due in the next 30 days
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        // Customer Count logic
        let customerWhere: any = {};
        if (role === 'AGENCY') {
            customerWhere = { agencyDetails: { id: whereClause.agencyId || 'none' } };
        } else if (whereClause.salesExecutiveId) {
            customerWhere = { subscriptions: { some: { salesExecutiveId: whereClause.salesExecutiveId } } };
        }

        // 2. Fetch Stats sequentially to avoid overloading the local dev proxy
        const activeSubscriptionsCount = await prisma.subscription.count({
            where: { ...whereClause, status: 'ACTIVE' },
        });

        const paymentsByCurrency = await (prisma.payment as any).groupBy({
            where: revenueWhere,
            by: ['currency'],
            _sum: { amount: true },
        }) as any[];

        const totalRevenueINR = paymentsByCurrency.reduce((acc, curr) => {
            const amount = curr._sum?.amount || 0;
            return acc + convertToINR(amount, curr.currency || 'INR');
        }, 0);

        const renewalsCount = await prisma.subscription.count({
            where: {
                ...whereClause,
                endDate: { lte: thirtyDaysFromNow, gte: new Date() },
                status: 'ACTIVE',
            },
        });

        const totalCustomers = role === 'CUSTOMER' ? 1 : await prisma.customerProfile.count({
            where: customerWhere
        });

        const pendingRequestsCount = await prisma.subscription.count({
            where: { ...whereClause, status: 'REQUESTED' },
        });

        const openTicketsCount = await (prisma as any).supportTicket.count({
            where: {
                companyId: userCompanyId,
                status: 'OPEN',
                ...(role === 'CUSTOMER' ? { customerProfileId } : {})
            }
        });

        // New Module Stats
        const pendingDispatches = await (prisma as any).dispatchOrder.count({
            where: { ...whereClause, status: 'PENDING' }
        });

        const activeCourses = await (prisma as any).course.count({
            where: { ...whereClause, isPublished: true }
        });

        const articlesInReview = await (prisma as any).article.count({
            where: { status: 'UNDER_REVIEW' }
        });

        const upcomingEvents = await (prisma as any).conference.count({
            where: { ...whereClause, startDate: { gte: new Date() } }
        });

        const recentActivities = await fetchRecentActivities(whereClause, customerProfileId);
        const upcomingRenewals = await fetchUpcomingRenewals(whereClause, customerProfileId);

        return NextResponse.json({
            stats: [
                {
                    name: role === 'CUSTOMER' ? 'My Subscriptions' : 'Active Subscriptions',
                    value: activeSubscriptionsCount.toString(),
                    change: 'Active status',
                    icon: '📋',
                    color: 'bg-primary-500',
                    changePositive: true,
                },
                {
                    name: 'Global Revenue',
                    value: `₹${totalRevenueINR.toLocaleString()}`,
                    change: 'Unified (INR)',
                    icon: '🌍',
                    color: 'bg-emerald-600',
                    changePositive: true,
                },
                ...(role !== 'CUSTOMER' ? [
                    {
                        name: 'Logistics',
                        value: pendingDispatches.toString(),
                        change: 'Pending Dispatches',
                        icon: '🚚',
                        color: 'bg-indigo-600',
                        changePositive: pendingDispatches === 0,
                    },
                    {
                        name: 'JMS Workflow',
                        value: articlesInReview.toString(),
                        change: 'In Review',
                        icon: '✍️',
                        color: 'bg-purple-600',
                        changePositive: true,
                    },
                    {
                        name: 'Academy',
                        value: activeCourses.toString(),
                        change: 'Active Courses',
                        icon: '🎓',
                        color: 'bg-success-600',
                        changePositive: true,
                    },
                    {
                        name: 'Events',
                        value: upcomingEvents.toString(),
                        change: 'Upcoming',
                        icon: '🎤',
                        color: 'bg-blue-600',
                        changePositive: true,
                    }
                ] : [
                    {
                        name: 'Open Tickets',
                        value: openTicketsCount.toString(),
                        change: 'Requires attention',
                        icon: '🎫',
                        color: 'bg-danger-500',
                        changePositive: openTicketsCount === 0,
                    },
                    {
                        name: 'My Courses',
                        value: activeCourses.toString(),
                        change: 'Enrolled',
                        icon: '🎓',
                        color: 'bg-success-500',
                        changePositive: true,
                    },
                    {
                        name: 'Renewals Due',
                        value: renewalsCount.toString(),
                        change: 'Next 30 days',
                        icon: '🔔',
                        color: 'bg-warning-500',
                        changePositive: false,
                    }
                ]),
            ],
            recentActivities,
            upcomingRenewals,
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function fetchRecentActivities(whereClause: any, customerProfileId?: string) {
    const paymentWhere: any = {};

    if (customerProfileId) {
        paymentWhere.invoice = { subscription: { customerProfileId } };
    } else {
        if (whereClause.companyId) paymentWhere.companyId = whereClause.companyId;
        if (whereClause.agencyId) paymentWhere.invoice = { subscription: { agencyId: whereClause.agencyId } };
        if (whereClause.salesExecutiveId) paymentWhere.invoice = { subscription: { salesExecutiveId: whereClause.salesExecutiveId } };
    }

    const subscriptions = await prisma.subscription.findMany({
        where: whereClause,
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: { customerProfile: true },
    });

    const payments = await prisma.payment.findMany({
        where: paymentWhere,
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: { invoice: { include: { subscription: { include: { customerProfile: true } } } } },
    });

    const activities = [
        ...subscriptions.map((s) => ({
            id: `sub-${s.id}`,
            type: 'subscription',
            message: `Subscription ${s.status === 'ACTIVE' ? 'activated' : 'updated'} for ${s.customerProfile.name}`,
            time: formatTimeAgo(s.createdAt),
            date: s.createdAt,
            icon: '✅',
        })),
        ...payments.map((p) => ({
            id: `pay-${p.id}`,
            type: 'payment',
            message: `Payment received: $${p.amount.toLocaleString()}`,
            time: formatTimeAgo(p.createdAt),
            date: p.createdAt,
            icon: '💳',
        }))
    ];

    return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
}

async function fetchUpcomingRenewals(whereClause: any, customerProfileId?: string) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const renewals = await prisma.subscription.findMany({
        where: {
            ...whereClause,
            endDate: {
                lte: thirtyDaysFromNow,
                gte: new Date(),
            },
            status: 'ACTIVE',
        },
        include: { customerProfile: true, items: { include: { journal: true } } },
        take: 5,
        orderBy: { endDate: 'asc' },
    });

    return renewals.map((r) => ({
        id: r.id,
        customerProfileId: r.customerProfile.id,
        customer: r.customerProfile.name,
        journal: r.items[0]?.journal?.name || 'Journal Subscription',
        dueDate: r.endDate.toISOString().split('T')[0],
        amount: `$${r.total.toLocaleString()}`,
        status: r.autoRenew ? 'auto-renew' : 'pending',
    }));
}

function formatTimeAgo(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}
