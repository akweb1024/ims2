import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        // 1. Verify Authentication
        const authHeader = req.headers.get('authorization');
        const token = authHeader?.split(' ')[1] || req.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const role = decoded.role;
        const userId = decoded.id;

        // Determine filter based on role
        let customerProfileId: string | undefined;
        let whereClause: any = {};

        if (role === 'CUSTOMER') {
            const profile = await prisma.customerProfile.findUnique({ where: { userId } });
            if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
            customerProfileId = profile.id;
            whereClause = { customerProfileId: profile.id };
        } else if (role === 'AGENCY') {
            const profile = await prisma.customerProfile.findUnique({
                where: { userId },
                include: { agencyDetails: true }
            });
            if (profile?.agencyDetails) {
                whereClause = { agencyId: profile.agencyDetails.id };
            }
        } else if (role === 'SALES_EXECUTIVE') {
            whereClause = { salesExecutiveId: userId };
        }

        // 2. Fetch Stats
        const activeSubscriptionsCount = await prisma.subscription.count({
            where: { ...whereClause, status: 'ACTIVE' },
        });

        const totalRevenue = await prisma.payment.aggregate({
            where: customerProfileId ?
                { invoice: { subscription: { customerProfileId } } } :
                (role === 'AGENCY' ? { invoice: { subscription: { agencyId: whereClause.agencyId } } } :
                    (role === 'SALES_EXECUTIVE' ? { invoice: { subscription: { salesExecutiveId: userId } } } : {})),
            _sum: { amount: true },
        });

        // Renewals due in the next 30 days
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const renewalsCount = await prisma.subscription.count({
            where: {
                ...whereClause,
                endDate: { lte: thirtyDaysFromNow, gte: new Date() },
                status: 'ACTIVE',
            },
        });

        const totalCustomers = role === 'CUSTOMER' ? 1 : await prisma.customerProfile.count({
            where: role === 'AGENCY' ? { agencyDetails: { id: whereClause.agencyId || 'none' } } : (role === 'SALES_EXECUTIVE' ? { subscriptions: { some: { salesExecutiveId: userId } } } : {}),
        });

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
                    name: role === 'CUSTOMER' ? 'Total Spent' : 'Total Revenue',
                    value: `$${(totalRevenue._sum.amount || 0).toLocaleString()}`,
                    change: 'All time',
                    icon: '💰',
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
                },
                ...(role !== 'CUSTOMER' ? [{
                    name: role === 'AGENCY' ? 'My Managed Clients' : 'Total Customers',
                    value: totalCustomers.toString(),
                    change: 'Counted profiles',
                    icon: '👥',
                    color: 'bg-indigo-500',
                    changePositive: true,
                }] : []),
            ],
            recentActivities: await fetchRecentActivities(whereClause, customerProfileId),
            upcomingRenewals: await fetchUpcomingRenewals(whereClause, customerProfileId),
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function fetchRecentActivities(whereClause: any, customerProfileId?: string) {
    const paymentWhere = customerProfileId ?
        { invoice: { subscription: { customerProfileId } } } :
        (whereClause.agencyId ? { invoice: { subscription: { agencyId: whereClause.agencyId } } } :
            (whereClause.salesExecutiveId ? { invoice: { subscription: { salesExecutiveId: whereClause.salesExecutiveId } } } : {}));

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
        ...subscriptions.map((s: any) => ({
            id: `sub-${s.id}`,
            type: 'subscription',
            message: `Subscription ${s.status === 'ACTIVE' ? 'activated' : 'updated'} for ${s.customerProfile.name}`,
            time: formatTimeAgo(s.createdAt),
            timestamp: s.createdAt.getTime(),
            icon: '✅',
        })),
        ...payments.map((p: any) => ({
            id: `pay-${p.id}`,
            type: 'payment',
            message: `Payment received: $${p.amount.toLocaleString()}`,
            time: formatTimeAgo(p.createdAt),
            timestamp: p.createdAt.getTime(),
            icon: '💳',
        }))
    ];

    return activities.sort((a, b) => b.timestamp - a.timestamp);
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

    return renewals.map((r: any) => ({
        id: r.id,
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
