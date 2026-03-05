import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { proformaStatusSchema, validateData } from '@/lib/validation/schemas';

const db = prisma as any;

// Allowed FSM transitions (CONVERTED + CANCELLED are terminal = not in map)
const VALID_TRANSITIONS: Record<string, string[]> = {
    DRAFT: ['PAYMENT_PENDING', 'CANCELLED'],
    PAYMENT_PENDING: ['DRAFT', 'CANCELLED'],
};

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE'],
    async (request: NextRequest, user: any, context?: any) => {
        try {
            const { id } = await context.params;

            let body: any;
            try { body = await request.json(); } catch {
                throw new ValidationError('Invalid JSON in request body');
            }

            // Zod validation
            const validation = validateData(proformaStatusSchema, body);
            if (!validation.success) {
                return NextResponse.json(
                    { error: 'Validation failed', details: validation.errors },
                    { status: 422 }
                );
            }
            const { toStatus, reason } = validation.data!;

            const proforma = await db.proformaInvoice.findFirst({
                where: { id, companyId: user.companyId, deletedAt: null }
            });

            if (!proforma) throw new NotFoundError('Proforma invoice not found');

            // Block already-at-target
            if (proforma.status === toStatus) {
                return NextResponse.json({
                    success: true,
                    message: `Proforma is already in ${toStatus} status`,
                    proforma,
                });
            }

            const allowedTransitions = VALID_TRANSITIONS[proforma.status] || [];
            if (!allowedTransitions.includes(toStatus)) {
                const isTerminal = ['CONVERTED', 'CANCELLED'].includes(proforma.status);
                throw new ValidationError(
                    isTerminal
                        ? `Proforma is in a terminal state (${proforma.status}) and cannot be transitioned.`
                        : `Invalid transition: ${proforma.status} → ${toStatus}. Allowed: ${allowedTransitions.join(', ')}`
                );
            }

            const updated = await db.$transaction(async (tx: any) => {
                const pf = await tx.proformaInvoice.update({
                    where: { id },
                    data: { status: toStatus }
                });

                // Immutable FSM audit event
                await tx.proformaAuditEvent.create({
                    data: {
                        proformaId: id,
                        actorUserId: user.id,
                        actorEmail: user.email || null,
                        fromStatus: proforma.status,
                        toStatus,
                        action: 'STATUS_CHANGE',
                        metadata: {
                            reason: reason || null,
                            ip: request.headers.get('x-forwarded-for') || null,
                        }
                    }
                });

                return pf;
            });

            logger.info('Proforma status transition', {
                proformaId: id,
                from: proforma.status,
                to: toStatus,
                userId: user.id,
            });

            return NextResponse.json({ success: true, proforma: updated });
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);
