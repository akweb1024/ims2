import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { releaseInvoiceStockReservations, replaceInvoiceStockReservations } from '@/lib/invoice-stock-reservation';
import { buildTrackingMetadata } from '@/lib/dispatch';
import { loadInvoiceAutomationPayload, triggerDocumentAutomation } from '@/lib/document-automation';
import { assertCompanyAccess } from '@/lib/access-policy';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user, { params }) => {
        try {
            const { id } = await params;

            const invoice = await prisma.invoice.findUnique({
                where: { id },
                include: {
                    subscription: {
                        include: {
                            customerProfile: true,
                            items: {
                                include: {
                                    journal: true,
                                    plan: true
                                }
                            }
                        }
                    },
                    customerProfile: true,
                    dispatchOrders: {
                        include: {
                            courier: true,
                            customerProfile: {
                                select: {
                                    id: true,
                                    name: true,
                                    organizationName: true,
                                    primaryEmail: true,
                                }
                            }
                        }
                    },
                    payments: true,
                    company: {
                        select: {
                            id: true, name: true, legalEntityName: true, tagline: true,
                            address: true, email: true, phone: true, website: true, logoUrl: true,
                            gstin: true, stateCode: true, cinNo: true, panNo: true, iecCode: true,
                            bankName: true, bankAccountHolder: true, bankAccountNumber: true,
                            bankIfscCode: true, bankSwiftCode: true, paymentMode: true,
                            currency: true
                        }
                    },
                    brand: true
                }
            });

            if (!invoice) {
                return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
            }

            // Authorization Check
            if (user.role === 'CUSTOMER') {
                const customerUserId = invoice.subscription?.customerProfile?.userId || invoice.customerProfile?.userId;
                if (customerUserId !== user.id) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }
            }

            const dispatchOrders = Array.isArray((invoice as any).dispatchOrders)
                ? (invoice as any).dispatchOrders.map((dispatch: any) => ({
                    ...dispatch,
                    tracking: buildTrackingMetadata(dispatch),
                }))
                : [];

            const dispatchOrder = dispatchOrders[0] || null;

            return NextResponse.json({
                ...invoice,
                dispatchOrders,
                dispatchOrder,
            });
        } catch (error) {
            return handleApiError(error, 'Failed to fetch invoice');
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
    async (req, user, { params }) => {
        try {
            const { id } = await params;
            const body = await req.json();

            const existing = await prisma.invoice.findUnique({
                where: { id },
                select: { status: true, companyId: true, lineItems: true, amount: true, tax: true, total: true }
            });

            if (!existing) {
                return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
            }

            if (existing.status === 'PAID' && user.role !== 'SUPER_ADMIN') {
                throw new ValidationError('Invoices marked as PAID cannot be modified. Void and recreate if needed.');
            }

            const changedFields = Object.keys(body).filter((key) => body[key] !== undefined);

            // Update allowed fields: dueDate, description, amount, tax, total, lineItems
            const updated = await prisma.$transaction(async (tx: any) => {
                let nextLineItems = body.lineItems;

                if (Array.isArray(body.lineItems)) {
                    nextLineItems = await replaceInvoiceStockReservations(tx, {
                        invoiceId: id,
                        companyId: existing.companyId,
                        nextLineItems: body.lineItems,
                        userId: user.id,
                        reason: 'Invoice edited',
                    });
                }

                const updatedInvoice = await tx.invoice.update({
                    where: { id },
                    data: {
                        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
                        description: body.description,
                        purchaseOrderNumber:
                            body.purchaseOrderNumber !== undefined
                                ? (typeof body.purchaseOrderNumber === 'string'
                                    ? (body.purchaseOrderNumber.trim() || null)
                                    : null)
                                : undefined,
                        invoiceDate:
                            body.invoiceDate !== undefined
                                ? (typeof body.invoiceDate === 'string'
                                    ? (body.invoiceDate.trim()
                                        ? new Date(body.invoiceDate.trim())
                                        : null)
                                    : null)
                                : undefined,
                        amount: body.amount,
                        tax: body.tax,
                        total: body.total,
                        lineItems: nextLineItems,
                        brandId: body.brandId,
                        taxRate: body.taxRate !== undefined ? body.taxRate : undefined,
                        cgst: body.cgst !== undefined ? body.cgst : undefined,
                        sgst: body.sgst !== undefined ? body.sgst : undefined,
                        igst: body.igst !== undefined ? body.igst : undefined,
                        cgstRate: body.cgstRate !== undefined ? body.cgstRate : undefined,
                        sgstRate: body.sgstRate !== undefined ? body.sgstRate : undefined,
                        igstRate: body.igstRate !== undefined ? body.igstRate : undefined,
                        couponId: body.couponId !== undefined ? body.couponId : undefined,
                        couponCode: body.couponCode !== undefined ? body.couponCode : undefined,
                        discountType: body.discountType !== undefined ? body.discountType : undefined,
                        discountValue: body.discountValue !== undefined ? body.discountValue : undefined,
                        discountAmount: body.discountAmount !== undefined ? body.discountAmount : undefined,
                        updatedAt: new Date()
                    }
                });

                await tx.auditLog.create({
                    data: {
                        userId: user.id,
                        action: 'UPDATE_INVOICE',
                        entity: 'Invoice',
                        entityId: id,
                        changes: {
                            ...body,
                            reservationReconciled: Array.isArray(body.lineItems),
                            previousSummary: {
                                amount: existing.amount,
                                tax: existing.tax,
                                total: existing.total,
                                lineItemCount: Array.isArray(existing.lineItems) ? existing.lineItems.length : 0,
                            },
                            nextSummary: {
                                amount: updatedInvoice.amount,
                                tax: updatedInvoice.tax,
                                total: updatedInvoice.total,
                                lineItemCount: Array.isArray(updatedInvoice.lineItems) ? updatedInvoice.lineItems.length : 0,
                            },
                        }
                    }
                });

                return updatedInvoice;
            });

            const automationPayload = await loadInvoiceAutomationPayload(updated.id);
            if (automationPayload) {
                await triggerDocumentAutomation({
                    entityType: 'invoice',
                    eventType: 'update',
                    changedFields,
                    payload: automationPayload,
                });
            }

            return NextResponse.json(updated);
        } catch (error) {
            return handleApiError(error, 'Failed to update invoice');
        }
    }
);

export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req, user, { params }) => {
        try {
            const { id } = await params;
            const { searchParams } = new URL(req.url);
            const hardDelete = searchParams.get('hardDelete') === 'true';
            let confirmDelete = '';
            try {
                const body = await req.json();
                confirmDelete = String(body?.confirmDelete || '').trim().toUpperCase();
            } catch {
                confirmDelete = '';
            }
            
            const invoice = await prisma.invoice.findUnique({
                where: { id },
                select: { status: true, companyId: true }
            });

            if (!invoice) {
                return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
            }

            if (invoice.status === 'PAID' && user.role !== 'SUPER_ADMIN') {
                throw new ValidationError('PAID Invoices cannot be deleted. VOID them instead.');
            }

            await assertCompanyAccess(user, invoice.companyId, 'void this invoice');

            if (hardDelete) {
                if (confirmDelete !== 'DELETE') {
                    throw new ValidationError('Hard delete requires explicit confirmation: confirmDelete=DELETE');
                }

                const [paymentCount, dispatchCount, revenueCount, projectCount] = await Promise.all([
                    prisma.payment.count({ where: { invoiceId: id } }),
                    prisma.dispatchOrder.count({ where: { invoiceId: id } }),
                    prisma.revenueTransaction.count({ where: { invoiceId: id } }),
                    prisma.iTProject.count({ where: { invoiceId: id } }),
                ]);

                const blockers = [
                    paymentCount > 0 ? `payments(${paymentCount})` : null,
                    dispatchCount > 0 ? `dispatchOrders(${dispatchCount})` : null,
                    revenueCount > 0 ? `revenueTransactions(${revenueCount})` : null,
                    projectCount > 0 ? `itProjects(${projectCount})` : null,
                ].filter(Boolean);

                if (blockers.length > 0) {
                    throw new ValidationError(
                        `Hard delete blocked. Linked records exist: ${blockers.join(', ')}. Void this invoice instead to preserve linked records.`,
                    );
                }

                await prisma.$transaction(async (tx: any) => {
                    await releaseInvoiceStockReservations(tx, {
                        invoiceId: id,
                        userId: user.id,
                        reason: 'Invoice hard deleted, reservation released',
                    });

                    await tx.invoice.delete({
                        where: { id },
                    });

                    await tx.auditLog.create({
                        data: {
                            userId: user.id,
                            action: 'hard_delete',
                            entity: 'invoice',
                            entityId: id,
                            changes: {
                                previousStatus: invoice.status,
                                companyId: invoice.companyId,
                                confirmation: 'DELETE',
                                blockersChecked: {
                                    payments: paymentCount,
                                    dispatchOrders: dispatchCount,
                                    revenueTransactions: revenueCount,
                                    itProjects: projectCount,
                                },
                            },
                        },
                    });
                });

                return NextResponse.json({ message: 'Invoice permanently deleted' });
            }

            await prisma.$transaction(async (tx: any) => {
                await releaseInvoiceStockReservations(tx, {
                    invoiceId: id,
                    userId: user.id,
                    reason: 'Invoice voided, reservation released',
                });

                await tx.invoice.update({
                    where: { id },
                    data: { status: 'VOID' },
                });

                await tx.auditLog.create({
                    data: {
                        userId: user.id,
                        action: 'void',
                        entity: 'invoice',
                        entityId: id,
                        changes: {
                            previousStatus: invoice.status,
                            companyId: invoice.companyId,
                            preservedRecords: ['revenueTransaction', 'payment', 'dispatchOrder'],
                        },
                    },
                });
            });

            return NextResponse.json({ message: 'Invoice voided successfully' });
        } catch (error) {
            return handleApiError(error, 'Failed to delete invoice');
        }
    }
);
