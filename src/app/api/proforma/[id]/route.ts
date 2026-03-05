import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError, NotFoundError, AuthorizationError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

const db = prisma as any;

// ─── GET: Single proforma invoice ─────────────────────────────────────────
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE'],
    async (request: NextRequest, user: any, context?: any) => {
        try {
            const { id } = await context.params;

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

// ─── PATCH: Update proforma (DRAFT status only) ───────────────────────────
export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE'],
    async (request: NextRequest, user: any, context?: any) => {
        try {
            const { id } = await context.params;
            const body = await request.json();

            const proforma = await db.proformaInvoice.findFirst({
                where: { id, companyId: user.companyId, deletedAt: null }
            });

            if (!proforma) throw new NotFoundError('Proforma invoice not found');
            if (proforma.status !== 'DRAFT') {
                throw new ValidationError(
                    `Cannot edit a proforma in ${proforma.status} status. Only DRAFT proformas can be edited.`
                );
            }

            const {
                lineItems, salesChannel, agencyId, startDate, endDate,
                autoRenew, currency, billingFrequency, taxRate,
                discountType, discountValue, notes, validUntil, subject,
            } = body;

            // Recompute financials if line items provided
            let financials: any = {};
            if (lineItems !== undefined) {
                let subtotal = 0;
                const processedLineItems = (lineItems as any[]).map((item: any) => {
                    const lineTotal = (item.unitPrice || 0) * (item.quantity || 1);
                    subtotal += lineTotal;
                    return { ...item, total: lineTotal };
                });

                const effDiscountType = discountType ?? proforma.discountType;
                const effDiscountValue = discountValue ?? proforma.discountValue ?? 0;
                const effTaxRate = taxRate ?? proforma.taxRate;

                let discountAmount = 0;
                if (effDiscountType === 'PERCENTAGE') discountAmount = subtotal * (effDiscountValue / 100);
                else if (effDiscountType === 'FIXED') discountAmount = effDiscountValue;

                const taxableAmount = subtotal - discountAmount;
                const taxAmt = taxableAmount * (Number(effTaxRate) / 100);
                const total = taxableAmount + taxAmt;

                let cgst = 0, sgst = 0, igst = 0;
                let cgstRate = 0, sgstRate = 0, igstRate = 0;
                if (Number(effTaxRate) > 0) {
                    if (proforma.companyStateCode && proforma.placeOfSupplyCode &&
                        proforma.companyStateCode === proforma.placeOfSupplyCode) {
                        cgstRate = Number(effTaxRate) / 2;
                        sgstRate = Number(effTaxRate) / 2;
                        cgst = taxAmt / 2;
                        sgst = taxAmt / 2;
                    } else {
                        igstRate = Number(effTaxRate);
                        igst = taxAmt;
                    }
                }

                financials = {
                    lineItems: processedLineItems,
                    subtotal, discountAmount,
                    discountType: effDiscountType,
                    discountValue: effDiscountValue,
                    taxRate: Number(effTaxRate),
                    taxAmount: taxAmt, total,
                    cgst, sgst, igst, cgstRate, sgstRate, igstRate,
                };
            }

            const updated = await db.$transaction(async (tx: any) => {
                const pf = await tx.proformaInvoice.update({
                    where: { id },
                    data: {
                        ...(salesChannel !== undefined && { salesChannel }),
                        ...(agencyId !== undefined && { agencyId: agencyId || null }),
                        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
                        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
                        ...(autoRenew !== undefined && { autoRenew }),
                        ...(currency !== undefined && { currency }),
                        ...(billingFrequency !== undefined && { billingFrequency }),
                        ...(notes !== undefined && { notes }),
                        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
                        ...(subject !== undefined && { subject }),
                        ...financials,
                    }
                });

                await tx.proformaAuditEvent.create({
                    data: {
                        proformaId: id,
                        actorUserId: user.id,
                        actorEmail: user.email || null,
                        fromStatus: 'DRAFT',
                        toStatus: 'DRAFT',
                        action: 'EDIT',
                        metadata: {
                            updatedFields: Object.keys(body),
                            newTotal: pf.total,
                        }
                    }
                });

                return pf;
            });

            logger.info('Proforma invoice updated', { proformaId: id, userId: user.id });
            return NextResponse.json(updated);
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);

// ─── DELETE: Soft or hard delete proforma ─────────────────────────────────
export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE'],
    async (request: NextRequest, user: any, context?: any) => {
        try {
            const { id } = await context.params;
            const { searchParams } = new URL(request.url);
            const hard = searchParams.get('hard') === 'true';
            const reason = searchParams.get('reason') || 'User requested deletion';

            const proforma = await db.proformaInvoice.findFirst({
                where: { id, companyId: user.companyId, deletedAt: null }
            });

            if (!proforma) throw new NotFoundError('Proforma invoice not found');

            // CONVERTED = fiscally bound — cannot delete
            if (proforma.status === 'CONVERTED') {
                throw new AuthorizationError(
                    'Cannot delete a CONVERTED proforma invoice. It is fiscally bound to an Invoice and Subscription.'
                );
            }

            // Only SUPER_ADMIN can hard delete
            if (hard && user.role !== 'SUPER_ADMIN') {
                throw new AuthorizationError('Hard deletion requires SUPER_ADMIN role');
            }

            await db.$transaction(async (tx: any) => {
                if (hard) {
                    await tx.proformaInvoice.delete({ where: { id } });
                } else {
                    await tx.proformaInvoice.update({
                        where: { id },
                        data: {
                            deletedAt: new Date(),
                            deletedByUserId: user.id,
                            deleteReason: reason,
                            status: proforma.status === 'PAYMENT_PENDING' ? 'CANCELLED' : proforma.status,
                        }
                    });

                    await tx.proformaAuditEvent.create({
                        data: {
                            proformaId: id,
                            actorUserId: user.id,
                            actorEmail: user.email || null,
                            fromStatus: proforma.status,
                            toStatus: 'CANCELLED',
                            action: 'DELETE',
                            metadata: { reason, hard: false }
                        }
                    });
                }
            });

            logger.info('Proforma invoice deleted', { proformaId: id, userId: user.id, hard });
            return NextResponse.json({ success: true, deleted: id });
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);
