import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['FINANCE_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();
        const status = typeof body.status === 'string' ? body.status.toUpperCase() : '';
        const notes = typeof body.notes === 'string' ? body.notes.trim() : null;
        const paymentReference = typeof body.paymentReference === 'string' ? body.paymentReference.trim() : null;
        const method = typeof body.method === 'string' ? body.method.trim() : undefined;

        if (!['APPROVED', 'REJECTED', 'PAID', 'CANCELLED'].includes(status)) {
            return NextResponse.json({ error: 'Invalid payout status' }, { status: 400 });
        }

        const existing = await prisma.commissionPayout.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Payout request not found' }, { status: 404 });
        }

        if (user.companyId && existing.companyId && existing.companyId !== user.companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (status === 'PAID' && !paymentReference) {
            return NextResponse.json({ error: 'Payment reference is required when marking a payout as paid' }, { status: 400 });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const payout = await tx.commissionPayout.update({
                where: { id },
                data: {
                    status: status as any,
                    notes: notes ?? existing.notes,
                    method: method ?? existing.method,
                    paymentReference: status === 'PAID' ? paymentReference : existing.paymentReference,
                    reviewedByUserId: user.id,
                    reviewedAt: new Date(),
                    paidAt: status === 'PAID' ? new Date() : existing.paidAt,
                },
                include: {
                    agencyProfile: {
                        select: { id: true, name: true, organizationName: true, primaryEmail: true },
                    },
                    requestedBy: {
                        select: { id: true, email: true, name: true },
                    },
                    reviewedBy: {
                        select: { id: true, email: true, name: true },
                    },
                },
            });

            await tx.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'update',
                    entity: 'commission_payout',
                    entityId: id,
                    changes: JSON.stringify({
                        status,
                        notes,
                        paymentReference,
                        method,
                    }),
                },
            });

            return payout;
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('Commission payout PATCH error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
