import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { convertToINR, getLiveRates } from '@/lib/exchange-rates';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const role = user.role;
            const userId = user.id;
            const userCompanyId = user.companyId;

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
            } else if (role === 'EXECUTIVE') {
                whereClause = { ...whereClause, salesExecutiveId: userId };
            } else if (role === 'MANAGER' || role === 'TEAM_LEADER') {
                const subordinates = await prisma.user.findMany({
                    where: {
                        managerId: userId,
                        companyId: userCompanyId || undefined
                    },
                    select: { id: true }
                });

                const subordinateIds = subordinates.map((s) => s.id);
                whereClause = {
                    ...whereClause,
                    salesExecutiveId: { in: [userId, ...subordinateIds] }
                };
            }


            // Revenue calculation needs to match the hierarchy
            const revenueWhere: any = {};
            if (userCompanyId) {
                revenueWhere.companyId = userCompanyId;
            }

            if (customerProfileId) {
                revenueWhere.invoice = { subscription: { customerProfileId } };
            } else if (whereClause.agencyId) {
                revenueWhere.invoice = { subscription: { agencyId: whereClause.agencyId } };
            } else if (whereClause.salesExecutiveId) {
                revenueWhere.invoice = { subscription: { salesExecutiveId: whereClause.salesExecutiveId } };
            }


            // 2. Fetch Stats with Model-Specific Filters


            const [
                activeSubscriptionsCount,
                renewalsCount,
                pendingRequestsCount,
                totalCustomers
            ] = await Promise.all([
                prisma.subscription.count({ where: { ...whereClause, status: 'ACTIVE' } }),
                prisma.subscription.count({
                    where: {
                        ...whereClause,
                        endDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), gte: new Date() },
                        status: 'ACTIVE',
                    },
                }),
                prisma.subscription.count({ where: { ...whereClause, status: 'REQUESTED' } }),
                role === 'CUSTOMER' ? Promise.resolve(1) : prisma.customerProfile.count({
                    where: role === 'AGENCY'
                        ? { agencyDetails: { id: whereClause.agencyId || 'none' } }
                        : whereClause.salesExecutiveId
                            ? { subscriptions: { some: { salesExecutiveId: whereClause.salesExecutiveId } } }
                            : { companyId: userCompanyId || undefined }
                })
            ]);


            // D. Payments

            const paymentsByCurrency = await (prisma.payment as any).groupBy({
                where: revenueWhere,
                by: ['currency'],
                _sum: { amount: true },
            }) as any[];


            const totalRevenueINR = paymentsByCurrency.reduce((acc, curr) => {
                const amount = curr._sum?.amount || 0;
                return acc + convertToINR(amount, curr.currency || 'INR');
            }, 0);

            // F. Open Tickets

            const openTicketsCount = await (prisma as any).supportTicket.count({
                where: {
                    companyId: userCompanyId,
                    status: 'OPEN',
                    ...(customerProfileId ? { customerProfileId } : {})
                }
            });

            // G. Dispatches

            const dispatchWhere: any = { status: 'PENDING' };
            if (userCompanyId) dispatchWhere.companyId = userCompanyId;

            if (customerProfileId) {
                const subIds = await prisma.subscription.findMany({
                    where: { customerProfileId },
                    select: { id: true }
                }).then(s => s.map(x => x.id));
                dispatchWhere.subscriptionId = { in: subIds };
            } else if (whereClause.salesExecutiveId) {
                const subIds = await prisma.subscription.findMany({
                    where: { salesExecutiveId: whereClause.salesExecutiveId },
                    select: { id: true }
                }).then(s => s.map(x => x.id));
                dispatchWhere.subscriptionId = { in: subIds };
            }

            const pendingDispatches = await (prisma as any).dispatchOrder.count({
                where: dispatchWhere
            });

            // H. Active Courses

            let activeCourses = 0;
            if (role === 'CUSTOMER') {
                activeCourses = await (prisma as any).courseEnrollment.count({ where: { userId } });
            } else {
                activeCourses = await (prisma as any).course.count({
                    where: { isPublished: true, ...(userCompanyId ? { companyId: userCompanyId } : {}) }
                });
            }

            const [articlesInReview, upcomingEvents] = await Promise.all([
                (prisma as any).article.count({ where: { status: 'UNDER_REVIEW' } }),
                (prisma as any).conference.count({
                    where: { startDate: { gte: new Date() }, ...(userCompanyId ? { companyId: userCompanyId } : {}) }
                })
            ]);

            // HR Stats

            let hrStats: any = null;
            if (role !== 'CUSTOMER' && role !== 'AGENCY') {
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId },
                    include: {
                        _count: { select: { attendance: true, workReports: true, leaveRequests: true } }
                    }
                });

                if (profile) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const [todayAttendance, pendingLeaves] = await Promise.all([
                        prisma.attendance.findFirst({ where: { employeeId: profile.id, date: { gte: today } } }),
                        prisma.leaveRequest.count({ where: { employeeId: profile.id, status: 'PENDING' } })
                    ]);

                    hrStats = {
                        totalAttendance: profile._count.attendance,
                        totalReports: profile._count.workReports,
                        hasCheckedIn: !!todayAttendance?.checkIn,
                        hasCheckedOut: !!todayAttendance?.checkOut,
                        pendingLeaves
                    };
                }
            }


            const [recentActivities, upcomingRenewals] = await Promise.all([
                fetchRecentActivities(whereClause, customerProfileId),
                fetchUpcomingRenewals(whereClause, customerProfileId)
            ]);

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
                hrStats
            });
        } catch (error) {
            console.error('[DashboardStats] CRITICAL ERROR:', error);
            return createErrorResponse(error);
        }
    },
);

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
