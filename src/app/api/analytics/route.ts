import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // 1. Verify Authentication
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Scope by Company (if not Super Admin)
        const companyId = decoded.companyId;
        const isSuper = decoded.role === 'SUPER_ADMIN';

        const companyFilter = (!isSuper && companyId) ? { companyId } : {};
        const subscriptionFilter = (!isSuper && companyId) ? { subscription: { companyId } } : {};

        // 2. Aggregate Data

        // Subscription Status Distribution
        const subscriptionsByStatus = await prisma.subscription.groupBy({
            by: ['status'],
            _count: { id: true },
            where: companyFilter
        });

        // Revenue by month (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const payments = await prisma.payment.findMany({
            where: {
                paymentDate: { gte: sixMonthsAgo },
                ...companyFilter
            },
            select: { amount: true, paymentDate: true }
        });

        const revenueByMonth = payments.reduce((acc: any, p) => {
            const month = p.paymentDate.toLocaleString('default', { month: 'short', year: '2-digit' });
            acc[month] = (acc[month] || 0) + p.amount;
            return acc;
        }, {});

        // Top Journals
        const journalStats = await prisma.subscriptionItem.groupBy({
            by: ['journalId'],
            _count: { id: true },
            _sum: { price: true },
            where: subscriptionFilter
        });

        const journals = await prisma.journal.findMany({
            where: { id: { in: journalStats.map(j => j.journalId) } },
            select: { id: true, name: true }
        });

        const topJournals = journalStats.map(stat => {
            const journal = journals.find(j => j.id === stat.journalId);
            return {
                name: journal?.name || 'Unknown',
                count: stat._count.id,
                revenue: stat._sum.price || 0
            };
        }).sort((a, b) => b.count - a.count).slice(0, 5);

        // Sales Channel Split
        const channels = await prisma.subscription.groupBy({
            by: ['salesChannel'],
            _count: { id: true },
            where: companyFilter
        });

        return NextResponse.json({
            statusSplit: subscriptionsByStatus.map(s => ({ name: s.status, value: s._count.id })),
            revenueHistory: Object.entries(revenueByMonth).map(([name, value]) => ({ name, value })),
            topJournals,
            channelSplit: channels.map(c => ({ name: c.salesChannel, value: c._count.id }))
        });

    } catch (error: any) {
        console.error('Analytics Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
