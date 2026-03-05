import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import {
    handleApiError,
    ValidationError,
    NotFoundError,
    AuthorizationError,
} from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { proformaUpdateSchema, validateData } from '@/lib/validation/schemas';

const db = prisma as any;

// ─── Shared financials recomputer (duplicated for module isolation) ─────────
function computeFinancials(
    lineItems: any[],
    discountType: string | null | undefined,
    discountValue: number,
    taxRate: number,
    companyStateCode?: string | null,
    placeOfSupplyCode?: string | null
) {
    let subtotal = 0;
    const processedItems = lineItems.map((item: any) => {
        const lineTotal = Number(item.unitPrice || 0) * Number(item.quantity || 1);
        subtotal += lineTotal;
        return { ...item, total: lineTotal };
    });

    let discountAmount = 0;
    if (discountType === 'PERCENTAGE') discountAmount = subtotal * ((discountValue || 0) / 100);
    else if (discountType === 'FIXED') discountAmount = Math.min(discountValue || 0, subtotal);

    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (taxRate / 100);
    const total = taxableAmount + taxAmount;

    let cgst = 0, sgst = 0, igst = 0;
    let cgstRate = 0, sgstRate = 0, igstRate = 0;
    if (taxRate > 0) {
        const intraState = companyStateCode && placeOfSupplyCode
            && companyStateCode === placeOfSupplyCode;
        if (intraState) {
            cgstRate = taxRate / 2; sgstRate = taxRate / 2;
            cgst = taxAmount / 2; sgst = taxAmount / 2;
        } else {
            igstRate = taxRate; igst = taxAmount;
        }
    }

    return { processedItems, subtotal, discountAmount, taxAmount, total, cgst, sgst, igst, cgstRate, sgstRate, igstRate };
}

// ─── GET: Single proforma ──────────────────────────────────────────────────
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE'],
    async (request: NextRequest, user: any, context?: any) => {
        try {
            const { id } = await context.params;

            if (!id || typeof id !== 'string') throw new ValidationError('Invalid proforma ID');

            const proforma = await db.proformaInvoice.findFirst({
                where: { id, companyId: user.companyId, deletedAt: null },
                include: {
                    customerProfile: {
                        select: {
                            id: true, name: true, primaryEmail: true,
                            organizationName: true, billingAddress: true,
                            billingCity: true, billingState: true,
                            billingStateCode: true, billingPincode: true,
                            billingCountry: true, gstVatTaxId: true,
                        }
                    },
                    auditEvents: { orderBy: { createdAt: 'asc' } },
                }
            });

            if (!proforma) throw new NotFoundError('Proforma invoice not found');

            return NextResponse.json(proforma);
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);

// ─── PATCH: Update DRAFT proforma ─────────────────────────────────────────
export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE'],
    async (request: NextRequest, user: any, context?: any) => {
        try {
            const { id } = await context.params;

            let body: any;
            try { body = await request.json(); } catch {
                throw new ValidationError('Invalid JSON in request body');
            }

            // Zod validation
            const validation = validateData(proformaUpdateSchema, body);
            if (!validation.success) {
                return NextResponse.json(
                    { error: 'Validation failed', details: validation.errors },
                    { status: 422 }
                );
            }
            const input = validation.data!;

            const proforma = await db.proformaInvoice.findFirst({
                where: { id, companyId: user.companyId, deletedAt: null }
            });

            if (!proforma) throw new NotFoundError('Proforma invoice not found');

            // FSM guard: only DRAFT can be edited
            if (proforma.status !== 'DRAFT') {
                throw new ValidationError(
                    `Cannot edit a proforma in "${proforma.status}" status. ` +
                    `Only DRAFT proformas can be edited. ` +
                    `To make changes after sending for payment, recall it to DRAFT first.`
                );
            }

            // Recompute financials if line items changed
            let financials: any = {};
            if (input.lineItems !== undefined) {
                const effDiscountType = (input.discountType !== undefined ? input.discountType : proforma.discountType) as string | null;
                const effDiscountValue = input.discountValue !== undefined ? input.discountValue : (proforma.discountValue || 0);
                const effTaxRate = input.taxRate !== undefined ? input.taxRate : proforma.taxRate;

                const computed = computeFinancials(
                    input.lineItems,
                    effDiscountType,
                    effDiscountValue,
                    effTaxRate,
                    proforma.companyStateCode,
                    proforma.placeOfSupplyCode
                );

                financials = {
                    lineItems: computed.processedItems,
                    subtotal: computed.subtotal,
                    discountAmount: computed.discountAmount,
                    discountType: effDiscountType,
                    discountValue: effDiscountValue,
                    taxRate: effTaxRate,
                    taxAmount: computed.taxAmount,
                    total: computed.total,
                    cgst: computed.cgst,
                    sgst: computed.sgst,
                    igst: computed.igst,
                    cgstRate: computed.cgstRate,
                    sgstRate: computed.sgstRate,
                    igstRate: computed.igstRate,
                };
            } else if (
                input.discountType !== undefined ||
                input.discountValue !== undefined ||
                input.taxRate !== undefined
            ) {
                // Recompute with existing line items but changed tax/discount
                const effDiscountType = (input.discountType !== undefined ? input.discountType : proforma.discountType) as string | null;
                const effDiscountValue = input.discountValue !== undefined ? input.discountValue : (proforma.discountValue || 0);
                const effTaxRate = input.taxRate !== undefined ? input.taxRate : proforma.taxRate;

                const computed = computeFinancials(
                    (proforma.lineItems as any[]) || [],
                    effDiscountType,
                    effDiscountValue,
                    effTaxRate,
                    proforma.companyStateCode,
                    proforma.placeOfSupplyCode
                );

                financials = {
                    discountType: effDiscountType,
                    discountValue: effDiscountValue,
                    taxRate: effTaxRate,
                    subtotal: computed.subtotal,
                    discountAmount: computed.discountAmount,
                    taxAmount: computed.taxAmount,
                    total: computed.total,
                    cgst: computed.cgst,
                    sgst: computed.sgst,
                    igst: computed.igst,
                    cgstRate: computed.cgstRate,
                    sgstRate: computed.sgstRate,
                    igstRate: computed.igstRate,
                };
            }

            const updated = await db.$transaction(async (tx: any) => {
                const pf = await tx.proformaInvoice.update({
                    where: { id },
                    data: {
                        ...(input.subject !== undefined && { subject: input.subject }),
                        ...(input.salesChannel !== undefined && { salesChannel: input.salesChannel }),
                        ...(input.agencyId !== undefined && { agencyId: input.agencyId || null }),
                        ...(input.startDate !== undefined && { startDate: input.startDate ? new Date(input.startDate) : null }),
                        ...(input.endDate !== undefined && { endDate: input.endDate ? new Date(input.endDate) : null }),
                        ...(input.autoRenew !== undefined && { autoRenew: input.autoRenew }),
                        ...(input.currency !== undefined && { currency: input.currency }),
                        ...(input.billingFrequency !== undefined && { billingFrequency: input.billingFrequency }),
                        ...(input.notes !== undefined && { notes: input.notes }),
                        ...(input.validUntil !== undefined && { validUntil: input.validUntil ? new Date(input.validUntil) : null }),
                        ...financials,
                    }
                });

                // Immutable audit: EDIT
                await tx.proformaAuditEvent.create({
                    data: {
                        proformaId: id,
                        actorUserId: user.id,
                        actorEmail: user.email || null,
                        fromStatus: 'DRAFT',
                        toStatus: 'DRAFT',
                        action: 'EDIT',
                        metadata: {
                            updatedFields: Object.keys(body).filter(k => k !== 'lineItems'),
                            lineItemsChanged: input.lineItems !== undefined,
                            newTotal: pf.total,
                        }
                    }
                });

                return pf;
            });

            logger.info('Proforma invoice updated', { proformaId: id, userId: user.id, newTotal: updated.total });
            return NextResponse.json(updated);
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);

// ─── DELETE: Soft or hard delete ──────────────────────────────────────────
export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE'],
    async (request: NextRequest, user: any, context?: any) => {
        try {
            const { id } = await context.params;
            const { searchParams } = new URL(request.url);
            const hard = searchParams.get('hard') === 'true';
            const reason = (searchParams.get('reason') || '').trim();

            if (!reason) throw new ValidationError('Deletion reason is required');
            if (reason.length > 500) throw new ValidationError('Reason must be under 500 characters');

            const proforma = await db.proformaInvoice.findFirst({
                where: { id, companyId: user.companyId, deletedAt: null }
            });

            if (!proforma) throw new NotFoundError('Proforma invoice not found');

            // CONVERTED = fiscally bound document — never deletable
            if (proforma.status === 'CONVERTED') {
                throw new AuthorizationError(
                    'Cannot delete a CONVERTED proforma. It is fiscally bound to Invoice ' +
                    `${proforma.convertedInvoiceId}. Void the related Invoice through the billing module instead.`
                );
            }

            // Only SUPER_ADMIN can hard delete
            if (hard && user.role !== 'SUPER_ADMIN') {
                throw new AuthorizationError('Hard deletion requires SUPER_ADMIN role');
            }

            await db.$transaction(async (tx: any) => {
                if (hard) {
                    // Permanent: removes all audit events too (CASCADE)
                    await tx.proformaInvoice.delete({ where: { id } });
                } else {
                    // Soft delete: seal with deletedAt, preserve audit trail
                    const newStatus = proforma.status === 'PAYMENT_PENDING' ? 'CANCELLED' : proforma.status;
                    await tx.proformaInvoice.update({
                        where: { id },
                        data: {
                            deletedAt: new Date(),
                            deletedByUserId: user.id,
                            deleteReason: reason,
                            status: newStatus,
                        }
                    });

                    // Immutable audit: DELETE
                    await tx.proformaAuditEvent.create({
                        data: {
                            proformaId: id,
                            actorUserId: user.id,
                            actorEmail: user.email || null,
                            fromStatus: proforma.status,
                            toStatus: 'CANCELLED',
                            action: 'DELETE',
                            metadata: { reason, hard: false, newStatus }
                        }
                    });
                }
            });

            logger.info('Proforma invoice deleted', {
                proformaId: id, userId: user.id, hard, reason: reason.substring(0, 100),
            });

            return NextResponse.json({ success: true, deleted: id, hard });
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);
