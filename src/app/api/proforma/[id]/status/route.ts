import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

const db = prisma as any;

// Valid FSM transitions (from → allowed_to[])
const VALID_TRANSITIONS: Record<string, string[]> = {
    DRAFT: ['PAYMENT_PENDING', 'CANCELLED'],
    PAYMENT_PENDING: ['DRAFT', 'CANCELLED'],
    // CONVERTED and CANCELLED are terminal states
};

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE'],
    async (request: NextRequest, user: any, context?: any) => {
        try {
            const { id } = await context.params;
            const body = await request.json();
            const { toStatus, reason } = body;

            if (!toStatus) throw new ValidationError('toStatus is required');

            const proforma = await db.proformaInvoice.findFirst({
                where: { id, companyId: user.companyId, deletedAt: null }
            });

            if (!proforma) throw new NotFoundError('Proforma invoice not found');

            const allowedTransitions = VALID_TRANSITIONS[proforma.status] || [];
            if (!allowedTransitions.includes(toStatus)) {
                throw new ValidationError(
                    `Invalid status transition: ${proforma.status} → ${toStatus}. ` +
                    `Allowed: ${allowedTransitions.join(', ') || 'none (terminal state)'}`
                );
            }

            const updated = await db.$transaction(async (tx: any) => {
                const pf = await tx.proformaInvoice.update({
                    where: { id },
                    data: { status: toStatus }
                });

                await tx.proformaAuditEvent.create({
                    data: {
                        proformaId: id,
                        actorUserId: user.id,
                        actorEmail: user.email || null,
                        fromStatus: proforma.status,
                        toStatus,
                        action: 'STATUS_CHANGE',
                        metadata: { reason: reason || null }
                    }
                });

                return pf;
            });

            logger.info(
                'Proforma status transition',
                { proformaId: id, from: proforma.status, to: toStatus, userId: user.id }
            );

            return NextResponse.json({ success: true, proforma: updated });
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);
