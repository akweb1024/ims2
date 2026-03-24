import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

async function resolveAgencyProfile(userId: string) {
    return prisma.customerProfile.findUnique({
        where: { userId },
        include: { agencyDetails: true },
    });
}

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['AGENCY', 'SUPER_ADMIN', 'FINANCE_ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') || undefined;

        let agencyProfileId: string | undefined;
        if (user.role === 'AGENCY') {
            const agencyProfile = await resolveAgencyProfile(user.id);
            if (!agencyProfile?.agencyDetails) {
                return NextResponse.json([]);
            }
            agencyProfileId = agencyProfile.id;
        } else {
            agencyProfileId = searchParams.get('agencyProfileId') || undefined;
        }

        const payouts = await prisma.commissionPayout.findMany({
            where: {
                ...(agencyProfileId ? { agencyProfileId } : {}),
                ...(user.companyId ? { companyId: user.companyId } : {}),
                ...(status ? { status: status as any } : {}),
            },
            include: {
                requestedBy: {
                    select: { id: true, email: true, name: true },
                },
                reviewedBy: {
                    select: { id: true, email: true, name: true },
                },
                agencyProfile: {
                    select: { id: true, name: true, organizationName: true, primaryEmail: true },
                },
            },
            orderBy: [{ requestedAt: 'desc' }],
        });

        return NextResponse.json(payouts);
    } catch (error: any) {
        console.error('Commission payout GET error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'AGENCY') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const agencyProfile = await resolveAgencyProfile(user.id);
        if (!agencyProfile?.agencyDetails) {
            return NextResponse.json({ error: 'Agency profile not found' }, { status: 404 });
        }

        const body = await req.json();
        const amount = Number(body.amount);
        const notes = typeof body.notes === 'string' ? body.notes.trim() : null;
        const method = typeof body.method === 'string' && body.method.trim() ? body.method.trim() : 'Bank Transfer';

        if (!Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json({ error: 'A valid payout amount is required' }, { status: 400 });
        }

        const activeSubscriptions = await prisma.subscription.findMany({
            where: {
                salesChannel: 'AGENCY',
                status: 'ACTIVE',
                agencyId: agencyProfile.agencyDetails.id,
            },
            select: { total: true },
        });

        const totalEarned = activeSubscriptions.reduce((acc, sub) => acc + sub.total, 0) * 0.1;

        const [paidAgg, committedAgg] = await Promise.all([
            prisma.commissionPayout.aggregate({
                where: {
                    agencyProfileId: agencyProfile.id,
                    status: 'PAID',
                },
                _sum: { amount: true },
            }),
            prisma.commissionPayout.aggregate({
                where: {
                    agencyProfileId: agencyProfile.id,
                    status: { in: ['REQUESTED', 'APPROVED'] },
                },
                _sum: { amount: true },
            }),
        ]);

        const paidAmount = paidAgg._sum.amount || 0;
        const committedAmount = committedAgg._sum.amount || 0;
        const availableForRequest = Math.max(totalEarned - paidAmount - committedAmount, 0);

        if (amount > availableForRequest) {
            return NextResponse.json(
                { error: `Requested amount exceeds available balance of ${availableForRequest.toFixed(2)}` },
                { status: 400 }
            );
        }

        const payout = await prisma.$transaction(async (tx) => {
            const created = await tx.commissionPayout.create({
                data: {
                    companyId: user.companyId,
                    agencyProfileId: agencyProfile.id,
                    requestedByUserId: user.id,
                    amount,
                    currency: 'INR',
                    method,
                    notes,
                    status: 'REQUESTED',
                },
            });

            await tx.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'create',
                    entity: 'commission_payout',
                    entityId: created.id,
                    changes: JSON.stringify({ amount, method, notes }),
                },
            });

            return created;
        });

        return NextResponse.json(payout, { status: 201 });
    } catch (error: any) {
        console.error('Commission payout POST error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
