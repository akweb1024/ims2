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
import { proformaConvertSchema, validateData } from '@/lib/validation/schemas';
import { generateInvoiceNumbers } from '@/lib/invoice-number';

const db = prisma as any;

/**
 * POST /api/proforma/[id]/convert
 *
 * Converts a PAYMENT_PENDING proforma into a permanent Invoice + Subscription.
 *
 * Transaction guarantees (ACID):
 *   a. Subscription created (ACTIVE)
 *   b. Invoice created (PAID, sequential number)
 *   c. Payment record created
 *   d. RevenueTransaction created
 *   e. AuditLog entry
 *   f. ProformaInvoice sealed (CONVERTED, convertedInvoiceId set)
 *   g. ProformaAuditEvent (terminal FSM event)
 *
 * Idempotency: if convertedInvoiceId already set, returns existing data.
 * Payment precision: amount must match proforma.total ±₹0.01.
 * Role gate: SUPER_ADMIN or MANAGER only.
 */
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER'],
    async (request: NextRequest, user: any, context?: any) => {
        try {
            const { id } = await context.params;

            let body: any;
            try { body = await request.json(); } catch {
                throw new ValidationError('Invalid JSON in request body');
            }

            // Zod validation
            const validation = validateData(proformaConvertSchema, body);
            if (!validation.success) {
                return NextResponse.json(
                    { error: 'Validation failed', details: validation.errors },
                    { status: 422 }
                );
            }
            const input = validation.data!;

            // ── 1. Load proforma ───────────────────────────────────────────
            const proforma = await db.proformaInvoice.findFirst({
                where: { id, companyId: user.companyId, deletedAt: null },
                include: {
                    customerProfile: { include: { company: true } }
                }
            });

            if (!proforma) throw new NotFoundError('Proforma invoice not found');

            // ── 2. Idempotency ─────────────────────────────────────────────
            if (proforma.convertedInvoiceId) {
                logger.info('Proforma already converted — idempotent response', { proformaId: id });
                const existingInvoice = await prisma.invoice.findUnique({
                    where: { id: proforma.convertedInvoiceId },
                    select: { invoiceNumber: true, id: true }
                });
                return NextResponse.json({
                    idempotent: true,
                    invoiceId: proforma.convertedInvoiceId,
                    subscriptionId: proforma.convertedSubId,
                    invoiceNumber: existingInvoice?.invoiceNumber,
                    message: 'Proforma was already converted. Returning existing result.',
                });
            }

            // ── 3. FSM gate ────────────────────────────────────────────────
            if (proforma.status !== 'PAYMENT_PENDING') {
                throw new ValidationError(
                    `Proforma must be in PAYMENT_PENDING status to convert. ` +
                    `Current: "${proforma.status}". ` +
                    (proforma.status === 'DRAFT'
                        ? 'Use the status endpoint to move it to PAYMENT_PENDING first.'
                        : proforma.status === 'CONVERTED'
                            ? 'This proforma was already converted.'
                            : 'This proforma was cancelled and cannot be converted.')
                );
            }

            // ── 4. Payment precision validation (±₹0.01) ──────────────────
            const paidAmount = Number(input.paymentAmount);
            const diff = Math.abs(paidAmount - proforma.total);
            if (diff > 0.01) {
                throw new ValidationError(
                    `Payment amount ₹${paidAmount.toFixed(2)} does not match ` +
                    `proforma total ₹${proforma.total.toFixed(2)}. ` +
                    `Variance: ₹${diff.toFixed(2)} (tolerance: ₹0.01). ` +
                    `Please verify the payment amount and try again.`
                );
            }

            // ── 5. Date validation ─────────────────────────────────────────
            const effectiveStartDate = input.startDate ? new Date(input.startDate) : proforma.startDate;
            const effectiveEndDate = input.endDate ? new Date(input.endDate) : proforma.endDate;

            if (!effectiveStartDate || !effectiveEndDate) {
                throw new ValidationError(
                    'startDate and endDate are required to activate the subscription. ' +
                    'Either provide them in this request or set them on the proforma first.'
                );
            }
            if (effectiveEndDate <= effectiveStartDate) {
                throw new ValidationError('endDate must be after startDate');
            }

            const customer = proforma.customerProfile;
            const company = customer.company as any;

            // ── 6. Sequential invoice number (race-condition resistant) ────
            // Lock approach: count within transaction to avoid duplicate numbers
            // ── 7. Atomic transaction ──────────────────────────────────────
            const paidOn = new Date(input.paymentDate || new Date());

            const result = await db.$transaction(async (tx: any) => {
                // Sequential, entity-code-embedded invoice number (race-condition resistant)
                const { invoiceNumber } = await generateInvoiceNumbers(
                    proforma.companyId || user.companyId,
                    proforma.brandId || null
                );

                // a. Build subscription items
                const lineItems: any[] = proforma.lineItems || [];
                const subscriptionItems = lineItems
                    .filter((item: any) => item.description) // skip empty items
                    .map((item: any) => ({
                        journalId: item.journalId || null,
                        planId: item.planId || null,
                        courseId: item.courseId || null,
                        workshopId: item.workshopId || null,
                        productId: item.productId && !item.invoiceProductId ? null : (item.productId || null), // Legacy Product model
                        invoiceProductId: item.productId || item.invoiceProductId || null, // New InvoiceProduct model
                        quantity: Number(item.quantity) || 1,
                        price: Number(item.unitPrice || item.price) || 0,
                    }));

                // b. Create Subscription — ACTIVE
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
                        ...(subscriptionItems.length > 0 && {
                            items: { create: subscriptionItems }
                        }),
                    }
                });

                // c. Create permanent Invoice (legally binding fiscal document)
                const invoice = await tx.invoice.create({
                    data: {
                        subscriptionId: subscription.id,
                        customerProfileId: proforma.customerProfileId,
                        companyId: proforma.companyId,
                        brandId: proforma.brandId || null,
                        invoiceNumber,
                        currency: proforma.currency,
                        amount: proforma.subtotal - proforma.discountAmount,
                        tax: proforma.taxAmount,
                        total: proforma.total,
                        taxRate: proforma.taxRate,
                        status: 'PAID',
                        dueDate: paidOn,
                        paidDate: paidOn,
                        lineItems: proforma.lineItems,
                        description: proforma.subject || `Converted from Proforma #${proforma.proformaNumber}`,
                        // Indian GST
                        cgst: proforma.cgst,
                        sgst: proforma.sgst,
                        igst: proforma.igst,
                        cgstRate: proforma.cgstRate,
                        sgstRate: proforma.sgstRate,
                        igstRate: proforma.igstRate,
                        placeOfSupplyCode: proforma.placeOfSupplyCode,
                        companyStateCode: proforma.companyStateCode,
                        // Address
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
                        gstNumber: customer.gstVatTaxId || null,
                        // Branding
                        companyLogoUrl: company?.logoUrl || null,
                        brandAddress: company?.address || null,
                        brandEmail: company?.email || null,
                        brandWebsite: company?.website || null,
                    }
                });

                // Deduct stock for any linked variants
                for (const item of (proforma.lineItems as any[]) || []) {
                    const qty = Number(item.quantity) || 1;
                    if (item.variantId) {
                        await tx.productVariant.update({
                            where: { id: item.variantId },
                            data: { stockQuantity: { decrement: qty } }
                        }).catch(() => {});
                    }
                }

                // d. Payment ledger record
                await tx.payment.create({
                    data: {
                        invoiceId: invoice.id,
                        companyId: proforma.companyId,
                        amount: paidAmount,
                        paymentMethod: input.paymentMethod,
                        transactionId: input.paymentReference || null,
                        paymentDate: paidOn,
                        notes: input.notes || `Converted from Proforma #${proforma.proformaNumber}`,
                        status: 'SUCCESS',
                        currency: proforma.currency,
                    }
                });

                // e. Revenue transaction (accounting)
                const txNumber = `REV-${Date.now()}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
                await tx.revenueTransaction.create({
                    data: {
                        transactionNumber: txNumber,
                        invoiceId: invoice.id,
                        customerProfileId: proforma.customerProfileId,
                        companyId: proforma.companyId,
                        amount: proforma.total,
                        currency: proforma.currency,
                        paymentMethod: input.paymentMethod,
                        paymentDate: paidOn,
                        status: 'CONFIRMED',
                        description: `Invoice ${invoiceNumber} — Proforma ${proforma.proformaNumber}`,
                        source: 'Subscription',
                        revenueType: 'NEW',
                        referenceNumber: input.paymentReference || null,
                        customerName: customer.name,
                        customerEmail: customer.primaryEmail,
                    }
                });

                // f. System audit log
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
                            invoiceId: invoice.id,
                            total: proforma.total,
                            paidAmount,
                            paymentMethod: input.paymentMethod,
                            paymentReference: input.paymentReference || null,
                        })
                    }
                });

                // g. Seal proforma as CONVERTED (idempotency lock)
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

                // h. Immutable FSM audit event — terminal CONVERTED
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
                            paidAmount,
                            paymentMethod: input.paymentMethod,
                            paymentReference: input.paymentReference || null,
                            ip: request.headers.get('x-forwarded-for') || null,
                        }
                    }
                });

                return { subscription, invoice, invoiceNumber };
            });

            logger.info('Proforma converted to Invoice + Subscription', {
                proformaId: id,
                proformaNumber: proforma.proformaNumber,
                invoiceId: result.invoice.id,
                invoiceNumber: result.invoiceNumber,
                subscriptionId: result.subscription.id,
                userId: user.id,
                total: proforma.total,
            });

            return NextResponse.json({
                success: true,
                invoiceId: result.invoice.id,
                subscriptionId: result.subscription.id,
                invoiceNumber: result.invoiceNumber,
                message:
                    `Proforma ${proforma.proformaNumber} successfully converted. ` +
                    `Invoice ${result.invoiceNumber} issued and Subscription activated.`,
            });

        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);
