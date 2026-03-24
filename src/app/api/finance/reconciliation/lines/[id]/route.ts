import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

async function recomputeSession(sessionId: string) {
    const [matchedCount, pendingCount, unmatchedCount] = await Promise.all([
        (prisma as any).bankReconciliationLine.count({ where: { sessionId, status: 'MATCHED' } }),
        (prisma as any).bankReconciliationLine.count({ where: { sessionId, status: 'PENDING' } }),
        (prisma as any).bankReconciliationLine.count({ where: { sessionId, status: 'UNMATCHED' } }),
    ]);

    const status =
        pendingCount > 0
            ? 'PENDING_REVIEW'
            : matchedCount > 0 && unmatchedCount > 0
                ? 'PARTIALLY_RECONCILED'
                : matchedCount > 0
                    ? 'RECONCILED'
                    : 'ANALYZED';

    return (prisma as any).bankReconciliationSession.update({
        where: { id: sessionId },
        data: {
            matchedCount,
            pendingCount,
            unmatchedCount,
            status,
            reviewedAt: pendingCount === 0 ? new Date() : null,
        },
    });
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 });

        const { id } = await params;
        const { action } = await req.json();
        if (!['ACCEPT', 'IGNORE'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        const line = await (prisma as any).bankReconciliationLine.findUnique({
            where: { id },
            include: {
                session: true,
            },
        });

        if (!line) return NextResponse.json({ error: 'Reconciliation line not found' }, { status: 404 });
        if (line.session.companyId !== user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

        const updatedLine = await prisma.$transaction(async (tx) => {
            if (action === 'ACCEPT') {
                if (!line.journalEntryId) {
                    throw new Error('No journal entry is linked to this reconciliation line');
                }

                await tx.journalEntry.update({
                    where: { id: line.journalEntryId },
                    data: { status: 'RECONCILED' },
                });
            }

            const nextLine = await (tx as any).bankReconciliationLine.update({
                where: { id },
                data: {
                    status: action === 'ACCEPT' ? 'MATCHED' : 'UNMATCHED',
                    reconciledAt: action === 'ACCEPT' ? new Date() : line.reconciledAt,
                    ignoredAt: action === 'IGNORE' ? new Date() : line.ignoredAt,
                },
                include: {
                    journalEntry: true,
                },
            });

            await tx.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'update',
                    entity: 'bank_reconciliation_line',
                    entityId: id,
                    changes: JSON.stringify({
                        action,
                        sessionId: line.sessionId,
                        journalEntryId: line.journalEntryId,
                    }),
                },
            });

            return nextLine;
        });

        const session = await recomputeSession(line.sessionId);

        return NextResponse.json({
            line: updatedLine,
            session,
        });
    } catch (error: any) {
        console.error('Reconciliation Line PATCH Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
