import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError, NotFoundError, AuthorizationError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

const db = prisma as any;

/**
 * POST /api/proforma/[id]/convert
 *
 * Atomically converts a PAYMENT_PENDING proforma into:
 *   1. Permanent Invoice (PAID, sequential number, tax-compliant)
 *   2. Active Subscription (service entitlement starts immediately)
 *   3. Payment ledger record
 *   4. RevenueTransaction (accounting)
 *   5. AuditLog entry
 *   6. ProformaAuditEvent (FSM terminal → CONVERTED)
 *
 * Idempotent: repeat calls return existing result without re-executing.
 * Validates paymentAmount against proforma.total within ±0.01 tolerance.
 */
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER'],
    async (request: NextRequest, user: any, context?: any) => {
        try {
            const { id } = await context.params;
            const body = await request.json();
            const {
                paymentAmount,
                paymentMethod = 'BANK_TRANSFER',
                paymentReference,
                paymentDate,
                startDate,
                endDate,
                notes,
            } = body;

            // ── 1. Load proforma ──────────────────────────────────────────
            const proforma = await db.proformaInvoice.findFirst({
                where: { id, companyId: user.companyId, deletedAt: null },
                include: {
                    customerProfile: {
                        include: { company: true }
                    }
                }
            });

            if (!proforma) throw new NotFoundError('Proforma invoice not found');

            // ── 2. Idempotency — return existing if already converted ─────
            if (proforma.convertedInvoiceId) {
                logger.info('Proforma already converted — idempotent response', { proformaId: id });
                const existingInvoice = await prisma.invoice.findUnique({
                    where: { id: proforma.convertedInvoiceId }
                });
                return NextResponse.json({
                    idempotent: true,
                    invoiceId: proforma.convertedInvoiceId,
                    subscriptionId: proforma.convertedSubId,
                    invoiceNumber: existingInvoice?.invoiceNumber,
                    message: 'Proforma was already converted. Returning existing result.',
                });
            }

            // ── 3. FSM gate — must be PAYMENT_PENDING ────────────────────
            if (proforma.status !== 'PAYMENT_PENDING') {
                throw new ValidationError(
                    `Proforma must be in PAYMENT_PENDING status to convert. ` +
                    `Current: ${proforma.status}. Use the status endpoint to advance it first.`
                );
            }

            // ── 4. Payment amount precision validation (±0.01 tolerance) ──
            if (paymentAmount === undefined || paymentAmount === null) {
                throw new ValidationError('paymentAmount is required');
            }
            const diff = Math.abs(Number(paymentAmount) - proforma.total);
            if (diff > 0.01) {
                throw new ValidationError(
                    `Payment amount ₹${Number(paymentAmount).toFixed(2)} does not match ` +
                    `proforma total ₹${proforma.total.toFixed(2)}. ` +
                    `Variance: ₹${diff.toFixed(2)} (max allowed: ₹0.01).`
                );
            }

            // ── 5. Date validation ────────────────────────────────────────
            const effectiveStartDate = startDate ? new Date(startDate) : proforma.startDate;
            const effectiveEndDate = endDate ? new Date(endDate) : proforma.endDate;

            if (!effectiveStartDate || !effectiveEndDate) {
                throw new ValidationError('startDate and endDate are required for subscription creation');
            }
            if (effectiveEndDate <= effectiveStartDate) {
                throw new ValidationError('endDate must be after startDate');
            }

            const customer = proforma.customerProfile;
            const company = customer.company as any;

            // ── 6. Sequential invoice number ──────────────────────────────
            const invoiceCount = await prisma.invoice.count({
                where: { companyId: user.companyId }
            });
            const year = new Date().getFullYear();
            const invoiceNumber = `INV-${year}-${String(invoiceCount + 1).padStart(5, '0')}`;

            // ── 7. Atomic transaction ─────────────────────────────────────
            const result = await db.$transaction(async (tx: any) => {

                // a. Build subscription items from proforma line items
                const lineItems: any[] = proforma.lineItems || [];
                const subscriptionItems = lineItems.map((item: any) => ({
                    journalId: item.journalId || null,
                    planId: item.planId || null,
                    courseId: item.courseId || null,
                    workshopId: item.workshopId || null,
                    productId: item.productId || null,
                    quantity: item.quantity || 1,
                    price: item.unitPrice || item.price || 0,
                }));

                // b. Create Subscription — ACTIVE (service entitlement begins)
                const subscription = await tx.subscription.create({
                    data: {
                        customerProfileId: proforma.customerProfileId,
                        companyId: proforma.companyId,
                        startDate: effectiveStartDate,
                        endDate: effectiveEndDate,
                        salesChannel: proforma.salesChannel,
                        agencyId: proforma.agencyId || null,
                        autoRenew: proforma.autoRenew,
                        status: 'ACTIVE',
                        currency: proforma.currency,
                        subtotal: proforma.subtotal,
                        discount: proforma.discountAmount,
                        tax: proforma.taxAmount,
                        total: proforma.total,
                        subtotalInINR: proforma.currency === 'INR' ? proforma.subtotal : 0,
                        subtotalInUSD: proforma.currency === 'USD' ? proforma.subtotal : 0,
                        totalInINR: proforma.currency === 'INR' ? proforma.total : 0,
                        totalInUSD: proforma.currency === 'USD' ? proforma.total : 0,
                        invoiceReference: invoiceNumber,
                        salesExecutiveId: user.id,
                        items: { create: subscriptionItems },
                    }
                });

                // c. Create permanent Invoice (legally binding fiscal document)
                const taxableAmount = proforma.subtotal - proforma.discountAmount;
                const paidOn = new Date(paymentDate || new Date());

                const invoice = await tx.invoice.create({
                    data: {
                        subscriptionId: subscription.id,
                        customerProfileId: proforma.customerProfileId,
                        companyId: proforma.companyId,
                        brandId: proforma.brandId || null,
                        invoiceNumber,
                        currency: proforma.currency,
                        amount: taxableAmount,
                        tax: proforma.taxAmount,
                        total: proforma.total,
                        taxRate: proforma.taxRate,
                        status: 'PAID',
                        dueDate: paidOn,
                        paidDate: paidOn,
                        lineItems: proforma.lineItems,
                        description: proforma.subject || `Converted from Proforma #${proforma.proformaNumber}`,
                        // Indian GST compliance
                        cgst: proforma.cgst,
                        sgst: proforma.sgst,
                        igst: proforma.igst,
                        cgstRate: proforma.cgstRate,
                        sgstRate: proforma.sgstRate,
                        igstRate: proforma.igstRate,
                        placeOfSupplyCode: proforma.placeOfSupplyCode,
                        companyStateCode: proforma.companyStateCode,
                        // Address snapshots
                        billingAddress: proforma.billingAddress,
                        billingCity: proforma.billingCity,
                        billingState: proforma.billingState,
                        billingStateCode: proforma.billingStateCode,
                        billingPincode: proforma.billingPincode,
                        billingCountry: proforma.billingCountry,
                        // Discount
                        discountType: proforma.discountType,
                        discountValue: proforma.discountValue,
                        discountAmount: proforma.discountAmount,
                        gstNumber: (customer as any).gstVatTaxId,
                        // Branding snapshot
                        companyLogoUrl: company?.logoUrl || null,
                        brandAddress: company?.address || null,
                        brandEmail: company?.email || null,
                        brandWebsite: company?.website || null,
                    }
                });

                // d. Create Payment record
                await tx.payment.create({
                    data: {
                        invoiceId: invoice.id,
                        companyId: proforma.companyId,
                        amount: Number(paymentAmount),
                        paymentMethod,
                        transactionId: paymentReference || null,
                        paymentDate: paidOn,
                        notes: notes || `Converted from Proforma #${proforma.proformaNumber}`,
                        status: 'SUCCESS',
                        currency: proforma.currency,
                    }
                });

                // e. Create RevenueTransaction (accounting ledger)
                const txNumber = `REV-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
                await tx.revenueTransaction.create({
                    data: {
                        transactionNumber: txNumber,
                        invoiceId: invoice.id,
                        customerProfileId: proforma.customerProfileId,
                        companyId: proforma.companyId,
                        amount: proforma.total,
                        currency: proforma.currency,
                        paymentMethod,
                        paymentDate: paidOn,
                        status: 'CONFIRMED',
                        description: `Invoice ${invoiceNumber} — Proforma ${proforma.proformaNumber}`,
                        source: 'Subscription',
                        revenueType: 'NEW',
                        referenceNumber: paymentReference || null,
                        customerName: customer.name,
                        customerEmail: customer.primaryEmail,
                    }
                });

                // f. AuditLog (system-wide audit trail)
                await tx.auditLog.create({
                    data: {
                        userId: user.id,
                        action: 'proforma_convert',
                        entity: 'ProformaInvoice',
                        entityId: proforma.id,
                        changes: JSON.stringify({
                            proformaNumber: proforma.proformaNumber,
                            invoiceNumber,
                            subscriptionId: subscription.id,
                            total: proforma.total,
                            paymentAmount,
                            paymentMethod,
                        })
                    }
                });

                // g. Seal proforma as CONVERTED (idempotency + FSM terminal state)
                await tx.proformaInvoice.update({
                    where: { id: proforma.id },
                    data: {
                        status: 'CONVERTED',
                        convertedInvoiceId: invoice.id,
                        convertedSubId: subscription.id,
                        convertedAt: new Date(),
                        convertedByUserId: user.id,
                    }
                });

                // h. FSM audit event — immutable record of conversion
                await tx.proformaAuditEvent.create({
                    data: {
                        proformaId: proforma.id,
                        actorUserId: user.id,
                        actorEmail: user.email || null,
                        fromStatus: 'PAYMENT_PENDING',
                        toStatus: 'CONVERTED',
                        action: 'CONVERT',
                        metadata: {
                            invoiceNumber,
                            invoiceId: invoice.id,
                            subscriptionId: subscription.id,
                            paymentAmount,
                            paymentMethod,
                            paymentReference: paymentReference || null,
                        }
                    }
                });

                return { subscription, invoice };
            });

            logger.info('Proforma converted → Invoice + Subscription created', {
                proformaId: id,
                invoiceId: result.invoice.id,
                subscriptionId: result.subscription.id,
                invoiceNumber,
                userId: user.id,
            });

            return NextResponse.json({
                success: true,
                invoiceId: result.invoice.id,
                subscriptionId: result.subscription.id,
                invoiceNumber,
                message: `Proforma ${proforma.proformaNumber} converted. Invoice ${invoiceNumber} issued and Subscription activated.`,
            });

        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);
