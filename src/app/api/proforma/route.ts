import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

const db = prisma as any;

// ─── GET: List proforma invoices for a customer ────────────────────────────
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE'],
    async (request: NextRequest, user: any) => {
        try {
            const { searchParams } = new URL(request.url);
            const customerId = searchParams.get('customerId');
            const status = searchParams.get('status');
            const page = parseInt(searchParams.get('page') || '1');
            const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100);

            const where: any = {
                deletedAt: null,
                companyId: user.companyId,
            };
            if (customerId) where.customerProfileId = customerId;
            if (status) where.status = status;

            const [proformas, total] = await Promise.all([
                db.proformaInvoice.findMany({
                    where,
                    include: {
                        customerProfile: {
                            select: {
                                id: true, name: true,
                                primaryEmail: true, organizationName: true
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
                    page, pageSize, total,
                    totalPages: Math.ceil(total / pageSize),
                }
            });
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);

// ─── POST: Create proforma invoice draft ──────────────────────────────────
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE'],
    async (request: NextRequest, user: any) => {
        try {
            const body = await request.json();
            const {
                customerProfileId,
                salesChannel = 'DIRECT',
                agencyId,
                startDate,
                endDate,
                autoRenew = false,
                currency = 'INR',
                billingFrequency = 'ANNUAL',
                taxRate = 18,
                discountType,
                discountValue = 0,
                notes,
                validUntil,
                subject = 'Proforma Invoice',
                lineItems = [],
                idempotencyKey,
            } = body;

            if (!customerProfileId) throw new ValidationError('customerProfileId is required');
            if (!lineItems || lineItems.length === 0) throw new ValidationError('At least one line item is required');

            // ── Idempotency guard ───────────────────────────────────────────
            if (idempotencyKey) {
                const existing = await db.proformaInvoice.findUnique({
                    where: { idempotencyKey },
                });
                if (existing) {
                    logger.info('Proforma idempotency hit', { proformaId: existing.id });
                    return NextResponse.json(existing, { status: 200 });
                }
            }

            // ── Verify customer ─────────────────────────────────────────────
            const customer = await prisma.customerProfile.findFirst({
                where: { id: customerProfileId, companyId: user.companyId },
                include: { company: true }
            });
            if (!customer) throw new ValidationError('Customer not found or access denied');

            const company = customer.company as any;

            // ── Compute financials ──────────────────────────────────────────
            let subtotal = 0;
            const processedLineItems = (lineItems as any[]).map((item: any) => {
                const lineTotal = (item.unitPrice || 0) * (item.quantity || 1);
                subtotal += lineTotal;
                return { ...item, total: lineTotal };
            });

            let discountAmount = 0;
            if (discountType === 'PERCENTAGE') discountAmount = subtotal * ((discountValue || 0) / 100);
            else if (discountType === 'FIXED') discountAmount = discountValue || 0;

            const taxableAmount = subtotal - discountAmount;
            const taxAmount = taxableAmount * (Number(taxRate) / 100);
            const total = taxableAmount + taxAmount;

            // GST breakdown (Indian compliance)
            const companyStateCode = company?.stateCode;
            const placeOfSupplyCode = customer.shippingStateCode || customer.billingStateCode;
            let cgst = 0, sgst = 0, igst = 0;
            let cgstRate = 0, sgstRate = 0, igstRate = 0;
            if (Number(taxRate) > 0) {
                if (companyStateCode && placeOfSupplyCode && companyStateCode === placeOfSupplyCode) {
                    cgstRate = Number(taxRate) / 2;
                    sgstRate = Number(taxRate) / 2;
                    cgst = taxAmount / 2;
                    sgst = taxAmount / 2;
                } else {
                    igstRate = Number(taxRate);
                    igst = taxAmount;
                }
            }

            // Sequential proforma number
            const count = await db.proformaInvoice.count({ where: { companyId: user.companyId } });
            const proformaNumber = `PRF-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

            const proforma = await db.$transaction(async (tx: any) => {
                const pf = await tx.proformaInvoice.create({
                    data: {
                        proformaNumber,
                        customerProfileId,
                        companyId: user.companyId,
                        status: 'DRAFT',
                        salesChannel,
                        agencyId: agencyId || null,
                        startDate: startDate ? new Date(startDate) : null,
                        endDate: endDate ? new Date(endDate) : null,
                        autoRenew,
                        currency,
                        billingFrequency,
                        subtotal,
                        discountAmount,
                        discountType: discountType || null,
                        discountValue: discountValue || 0,
                        taxRate: Number(taxRate),
                        taxAmount,
                        total,
                        cgst, sgst, igst,
                        cgstRate, sgstRate, igstRate,
                        placeOfSupplyCode: placeOfSupplyCode || null,
                        companyStateCode: companyStateCode || null,
                        lineItems: processedLineItems,
                        notes: notes || null,
                        validUntil: validUntil ? new Date(validUntil) : null,
                        subject,
                        idempotencyKey: idempotencyKey || null,
                        createdByUserId: user.id,
                        billingAddress: customer.billingAddress,
                        billingCity: customer.billingCity,
                        billingState: customer.billingState,
                        billingStateCode: customer.billingStateCode,
                        billingPincode: customer.billingPincode,
                        billingCountry: customer.billingCountry,
                    }
                });

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
                            total,
                            itemCount: lineItems.length,
                        },
                    }
                });

                return pf;
            });

            logger.info('Proforma invoice created', { proformaId: proforma.id, userId: user.id });
            return NextResponse.json(proforma, { status: 201 });
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);
