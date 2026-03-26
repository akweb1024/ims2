import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { releaseInvoiceStockReservations } from '@/lib/invoice-stock-reservation';

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

            return NextResponse.json(invoice);
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
                select: { status: true, companyId: true }
            });

            if (!existing) {
                return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
            }

            if (existing.status === 'PAID') {
                throw new ValidationError('Invoices marked as PAID cannot be modified. Void and recreate if needed.');
            }

            // Update allowed fields: dueDate, description, amount, tax, total, lineItems
            const updated = await prisma.invoice.update({
                where: { id },
                data: {
                    dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
                    description: body.description,
                    amount: body.amount,
                    tax: body.tax,
                    total: body.total,
                    lineItems: body.lineItems,
                    brandId: body.brandId,
                    updatedAt: new Date()
                }
            });

            // Log Audit
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'UPDATE_INVOICE',
                    entity: 'Invoice',
                    entityId: id,
                    changes: body
                }
            });

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
            
            const invoice = await prisma.invoice.findUnique({
                where: { id },
                select: { status: true }
            });

            if (!invoice) {
                return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
            }

            if (invoice.status === 'PAID') {
                throw new ValidationError('PAID Invoices cannot be deleted. VOID them instead.');
            }

            await prisma.$transaction(async (tx: any) => {
                await releaseInvoiceStockReservations(tx, {
                    invoiceId: id,
                    userId: user.id,
                    reason: 'Invoice deleted, reservation released',
                });
                await tx.invoice.delete({ where: { id } });
            });

            return NextResponse.json({ message: 'Invoice deleted successfully' });
        } catch (error) {
            return handleApiError(error, 'Failed to delete invoice');
        }
    }
);
