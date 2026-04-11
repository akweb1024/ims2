import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import {
    proformaCreateSchema,
    validateData,
} from '@/lib/validation/schemas';
import { calculateInvoiceTaxBreakdown } from '@/lib/invoice-tax';

const db = prisma as any;

// ─── Shared helpers ────────────────────────────────────────────────────────

/** Recompute all financials from line items + discount + tax */
function computeFinancials(
    lineItems: any[],
    discountType: string | null | undefined,
    discountValue: number,
    taxRate: number,
    companyStateCode?: string | null,
    placeOfSupplyCode?: string | null
) {
    let subtotal = 0;
    const itemsWithTotal = lineItems.map((item: any) => {
        const lineTotal = Number(item.unitPrice || 0) * Number(item.quantity || 1);
        subtotal += lineTotal;
        return { ...item, total: lineTotal, amount: lineTotal }; // Map total to amount for tax breakdown
    });

    let discountAmount = 0;
    if (discountType === 'PERCENTAGE') discountAmount = subtotal * ((discountValue || 0) / 100);
    else if (discountType === 'FIXED') discountAmount = Math.min(discountValue || 0, subtotal);

    const taxBreakdown = calculateInvoiceTaxBreakdown({
        customer: { currency: 'INR' }, // mock mostly for defaults
        company: { stateCode: companyStateCode },
        items: itemsWithTotal,
        discountAmount,
        defaultTaxRate: taxRate,
    });

    // We must manually overwrite placeOfSupply for proforma logic here if needed
    // However taxBreakdown determines jurisdiction dynamically which is generally preferred
    const finalPlaceOfSupply = placeOfSupplyCode || taxBreakdown.placeOfSupplyCode;

    return {
        processedItems: itemsWithTotal,
        subtotal,
        discountAmount,
        taxAmount: taxBreakdown.tax,
        total: taxBreakdown.taxableSubtotal + taxBreakdown.tax,
        cgst: taxBreakdown.cgst,
        sgst: taxBreakdown.sgst,
        igst: taxBreakdown.igst,
        cgstRate: taxBreakdown.cgstRate,
        sgstRate: taxBreakdown.sgstRate,
        igstRate: taxBreakdown.igstRate,
    };
}

/** Generate next proforma number for a company */
async function nextProformaNumber(companyId: string): Promise<string> {
    const count = await db.proformaInvoice.count({ where: { companyId } });
    return `PRF-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

// ─── GET: List proforma invoices ───────────────────────────────────────────
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE'],
    async (request: NextRequest, user: any) => {
        try {
            const { searchParams } = new URL(request.url);
            const customerId = searchParams.get('customerId');
            const status = searchParams.get('status');
            const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
            const pageSize = Math.min(Math.max(1, parseInt(searchParams.get('pageSize') || '20')), 100);

            const validStatuses = ['DRAFT', 'PAYMENT_PENDING', 'CONVERTED', 'CANCELLED'];
            if (status && !validStatuses.includes(status)) {
                throw new ValidationError(`status must be one of: ${validStatuses.join(', ')}`);
            }

            const where: any = { deletedAt: null };
            if (user.companyId) where.companyId = user.companyId;
            if (customerId) where.customerProfileId = customerId;
            if (status) where.status = status;

            const [proformas, total] = await Promise.all([
                db.proformaInvoice.findMany({
                    where,
                    include: {
                        customerProfile: {
                            select: {
                                id: true, name: true,
                                primaryEmail: true, organizationName: true,
                            }
                        },
                        auditEvents: {
                            orderBy: { createdAt: 'desc' },
                            take: 5,
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * pageSize,
                    take: pageSize,
                }),
                db.proformaInvoice.count({ where }),
            ]);

            return NextResponse.json({
                data: proformas,
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize),
                }
            });
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);

// ─── POST: Create proforma draft ───────────────────────────────────────────
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE'],
    async (request: NextRequest, user: any) => {
        try {
            let body: any;
            try {
                body = await request.json();
            } catch {
                throw new ValidationError('Invalid JSON in request body');
            }

            // Zod validation
            const validation = validateData(proformaCreateSchema, body);
            if (!validation.success) {
                return NextResponse.json(
                    { error: 'Validation failed', details: validation.errors },
                    { status: 422 }
                );
            }
            const input = validation.data!;

            // Idempotency guard
            if (input.idempotencyKey) {
                const existing = await db.proformaInvoice.findUnique({
                    where: { idempotencyKey: input.idempotencyKey },
                });
                if (existing) {
                    if (existing.companyId !== user.companyId) {
                        throw new ValidationError('Idempotency key belongs to a different company');
                    }
                    logger.info('Proforma idempotency hit — returning existing', {
                        proformaId: existing.id,
                    });
                    return NextResponse.json(existing, { status: 200 });
                }
            }

            // Verify customer belongs to this company
            const customer = await prisma.customerProfile.findFirst({
                where: { id: input.customerProfileId, companyId: user.companyId },
                include: { company: true }
            });
            if (!customer) throw new ValidationError('Customer not found or access denied');

            const company = customer.company as any;
            const companyStateCode = company?.stateCode;
            const placeOfSupplyCode = customer.shippingStateCode || customer.billingStateCode;

            const financials = computeFinancials(
                input.lineItems,
                input.discountType || null,
                input.discountValue || 0,
                input.taxRate || 18,
                companyStateCode,
                placeOfSupplyCode || customer.shippingStateCode || customer.billingStateCode
            );

            const proformaNumber = await nextProformaNumber(user.companyId);

            const proforma = await db.$transaction(async (tx: any) => {
                const pf = await tx.proformaInvoice.create({
                    data: {
                        proformaNumber,
                        customerProfileId: input.customerProfileId,
                        companyId: user.companyId,
                        status: 'DRAFT',
                        subject: input.subject,
                        salesChannel: input.salesChannel,
                        agencyId: input.agencyId || null,
                        startDate: input.startDate ? new Date(input.startDate) : null,
                        endDate: input.endDate ? new Date(input.endDate) : null,
                        autoRenew: input.autoRenew,
                        currency: input.currency,
                        billingFrequency: input.billingFrequency,
                        subtotal: financials.subtotal,
                        discountAmount: financials.discountAmount,
                        discountType: input.discountType || null,
                        discountValue: input.discountValue || 0,
                        taxRate: input.taxRate || 18,
                        taxAmount: financials.taxAmount,
                        total: financials.total,
                        cgst: financials.cgst,
                        sgst: financials.sgst,
                        igst: financials.igst,
                        cgstRate: financials.cgstRate,
                        sgstRate: financials.sgstRate,
                        igstRate: financials.igstRate,
                        placeOfSupplyCode: placeOfSupplyCode || null,
                        companyStateCode: companyStateCode || null,
                        lineItems: financials.processedItems,
                        notes: input.notes || null,
                        validUntil: input.validUntil ? new Date(input.validUntil) : null,
                        idempotencyKey: input.idempotencyKey || null,
                        createdByUserId: user.id,
                        // Address snapshots from customer
                        billingAddress: customer.billingAddress || null,
                        billingCity: customer.billingCity || null,
                        billingState: customer.billingState || null,
                        billingStateCode: customer.billingStateCode || null,
                        billingPincode: customer.billingPincode || null,
                        billingCountry: customer.billingCountry || 'India',
                    }
                });

                // Immutable FSM audit: CREATE
                await tx.proformaAuditEvent.create({
                    data: {
                        proformaId: pf.id,
                        actorUserId: user.id,
                        actorEmail: user.email || null,
                        fromStatus: null,
                        toStatus: 'DRAFT',
                        action: 'CREATE',
                        metadata: {
                            proformaNumber,
                            total: financials.total,
                            itemCount: input.lineItems.length,
                            userAgent: request.headers.get('user-agent')?.substring(0, 200),
                        },
                    }
                });

                return pf;
            });

            logger.info('Proforma invoice created', {
                proformaId: proforma.id,
                proformaNumber,
                userId: user.id,
                total: financials.total,
            });

            return NextResponse.json(proforma, { status: 201 });
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);
