import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['AGENCY', 'SUPER_ADMIN', 'FINANCE_ADMIN'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        let agencyId: string | undefined;
        let commissionRate = 10;

        if (decoded.role === 'AGENCY') {
            const profile = await prisma.customerProfile.findUnique({
                where: { userId: decoded.id },
                include: { agencyDetails: true }
            });
            if (!profile || !profile.agencyDetails) {
                return NextResponse.json({
                    totalEarned: 0,
                    pendingPayout: 0,
                    rate: 10,
                    recentPayouts: [],
                    totalPaid: 0,
                    committedPayouts: 0
                });
            }
            agencyId = profile.id; // Use primary customer Profile ID, since subscriptions are attached directly!
            commissionRate = profile.discountOffered || profile.agencyDetails?.discountRate || 10;
        }

        // Calculate commissions
        // Rule: 10% commission on all ACTIVE subscriptions for this agency
        const where: any = {
            salesChannel: 'AGENCY',
            status: 'ACTIVE'
        };
        if (agencyId) where.agencyId = agencyId;

        const activeSubscriptions = await prisma.subscription.findMany({
            where,
            select: { total: true }
        });

        const totalValue = activeSubscriptions.reduce((acc, sub) => acc + sub.total, 0);
        const totalEarned = totalValue * (commissionRate / 100);

        const payoutWhere: any = {};
        if (decoded.companyId) payoutWhere.companyId = decoded.companyId;
        if (decoded.role === 'AGENCY') {
            const agencyProfile = await prisma.customerProfile.findUnique({
                where: { userId: decoded.id }
            });
            if (agencyProfile) {
                payoutWhere.agencyProfileId = agencyProfile.id;
            }
        }

        const [paidAgg, committedAgg, recentPayouts] = await Promise.all([
            prisma.commissionPayout.aggregate({
                where: { ...payoutWhere, status: 'PAID' },
                _sum: { amount: true }
            }),
            prisma.commissionPayout.aggregate({
                where: { ...payoutWhere, status: { in: ['REQUESTED', 'APPROVED'] } },
                _sum: { amount: true }
            }),
            prisma.commissionPayout.findMany({
                where: payoutWhere,
                orderBy: { requestedAt: 'desc' },
                take: 10
            })
        ]);

        const totalPaid = paidAgg._sum.amount || 0;
        const committedPayouts = committedAgg._sum.amount || 0;
        const availableForPayout = Math.max(totalEarned - totalPaid - committedPayouts, 0);

        return NextResponse.json({
            totalEarned,
            pendingPayout: availableForPayout,
            rate: commissionRate,
            payoutsCount: recentPayouts.length,
            recentPayouts,
            totalPaid,
            committedPayouts
        });

    } catch (error: any) {
        console.error('Commission API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
