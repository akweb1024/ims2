import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// GET all financial records for the company
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const type = searchParams.get('type');
            const category = searchParams.get('category');
            const startDate = searchParams.get('startDate');
            const endDate = searchParams.get('endDate');

            const search = searchParams.get('search');

            const where: any = {
                companyId: user.companyId || undefined
            };

            if (type) where.type = type;
            if (category) where.category = category;

            if (search) {
                where.OR = [
                    { description: { contains: search, mode: 'insensitive' } },
                    { customerName: { contains: search, mode: 'insensitive' } },
                    { customerEmail: { contains: search, mode: 'insensitive' } },
                    { referenceId: { contains: search, mode: 'insensitive' } },
                    // If your schema stores 'referenceNumber' in JSON or mapped field, ensure it is searchable.
                    // Assuming existing schema structure for now.
                ];
            }

            if (startDate || endDate) {
                where.date = {};
                if (startDate) where.date.gte = new Date(startDate);
                if (endDate) where.date.lte = new Date(endDate);
            }

            const records = await prisma.financialRecord.findMany({
                where,
                orderBy: { date: 'desc' },
                include: {
                    createdByUser: {
                        select: { name: true, email: true }
                    }
                }
            });

            return NextResponse.json(records);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// POST a new financial record
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const {
                type, category, amount, currency, date, description, status, paymentMethod, referenceId,
                // Extended fields for Revenue Sync
                customerName, bankName, customerEmail, customerPhone, referenceNumber
            } = body;

            if (!type || !category || !amount) {
                return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
            }

            // For REVENUE type, referenceNumber is required
            if (type === 'REVENUE' && (!referenceNumber || referenceNumber.trim() === '')) {
                return NextResponse.json({ error: 'Reference number is required for revenue transactions' }, { status: 400 });
            }

            const record = await prisma.financialRecord.create({
                data: {
                    type,
                    category,
                    amount: parseFloat(amount),
                    currency: currency || 'INR',
                    date: date ? new Date(date) : new Date(),
                    description,
                    status: status || 'COMPLETED',
                    paymentMethod,
                    referenceId: referenceNumber || referenceId, // Use referenceNumber if provided, fallback to referenceId
                    companyId: user.companyId,
                    createdByUserId: user.id
                }
            });

            // SYNC: If this is a REVENUE record, also create a RevenueTransaction
            // so it appears in the Income Registry for staff to claim.
            if (type === 'REVENUE' && user.companyId) {
                try {
                    // Generate a temporary TRN number
                    const trn = `TRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                    await prisma.revenueTransaction.create({
                        data: {
                            companyId: user.companyId,
                            transactionNumber: trn,
                            amount: record.amount,
                            currency: record.currency,
                            paymentMethod: paymentMethod || 'OTHER',
                            paymentDate: record.date,
                            description: description || `Manual Entry from Finance: ${category}`,
                            notes: `Auto-generated from Financial Record ID: ${record.id}`,
                            status: 'VERIFIED', // It's coming from Finance, so it's verified
                            verificationStatus: 'VERIFIED',
                            createdBy: user.id,

                            // Extended fields mapped here
                            customerName: customerName || null,
                            bankName: bankName || null,
                            customerEmail: customerEmail || null,
                            customerPhone: customerPhone || null,
                            referenceNumber: referenceNumber || referenceId || null
                        }
                    });
                    logger.info('Auto-synced RevenueTransaction', { trn });
                } catch (syncError) {
                    logger.error('Failed to sync RevenueTransaction', syncError);
                    // We don't fail the main request, but log the error
                }
            }


            return NextResponse.json(record);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// PATCH update a financial record
export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const id = searchParams.get('id');

            if (!id) {
                return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
            }

            const body = await req.json();
            const {
                type, category, amount, currency, date, description, status, paymentMethod, referenceId,
                customerName, bankName, customerEmail, customerPhone, referenceNumber
            } = body;

            // Verify ownership
            const existing = await prisma.financialRecord.findUnique({
                where: { id }
            });

            if (!existing) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
            if (user.role !== 'SUPER_ADMIN' && existing.companyId !== user.companyId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            const updated = await prisma.financialRecord.update({
                where: { id },
                data: {
                    type,
                    category,
                    amount: amount ? parseFloat(amount) : undefined,
                    currency,
                    date: date ? new Date(date) : undefined,
                    description,
                    status,
                    paymentMethod,
                    referenceId: referenceNumber || referenceId,
                }
            });

            // SYNC: If this is a REVENUE record, update the corresponding RevenueTransaction
            if (updated.type === 'REVENUE' && user.companyId) {
                try {
                    // Try to find by the linked ID in notes (or match by reference/amount/date)
                    const syncNote = `Auto-generated from Financial Record ID: ${updated.id}`;
                    const revenueTx = await prisma.revenueTransaction.findFirst({
                        where: {
                            companyId: user.companyId,
                            notes: { contains: updated.id }
                        }
                    });

                    if (revenueTx) {
                        await prisma.revenueTransaction.update({
                            where: { id: revenueTx.id },
                            data: {
                                amount: updated.amount,
                                currency: updated.currency,
                                paymentMethod: updated.paymentMethod || 'OTHER',
                                paymentDate: updated.date,
                                description: updated.description || `Manual Entry from Finance: ${updated.category}`,
                                customerName: customerName || null,
                                bankName: bankName || null,
                                customerEmail: customerEmail || null,
                                customerPhone: customerPhone || null,
                                referenceNumber: referenceNumber || referenceId || null
                            }
                        });
                        logger.info('Synced update to RevenueTransaction', { id: revenueTx.id });
                    }
                } catch (syncError) {
                    logger.error('Failed to sync update to RevenueTransaction', syncError);
                }
            }

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// DELETE a financial record
export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const id = searchParams.get('id');

            if (!id) {
                return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
            }

            // Verify the record exists and belongs to the user's company
            const record = await prisma.financialRecord.findFirst({
                where: {
                    id,
                    companyId: user.companyId
                }
            });

            if (!record) {
                return NextResponse.json({ error: 'Record not found or access denied' }, { status: 404 });
            }

            // SYNC: If this is a REVENUE record, also remove from RevenueTransaction
            if (record.type === 'REVENUE' && user.companyId) {
                try {
                    await prisma.revenueTransaction.deleteMany({
                        where: {
                            companyId: user.companyId,
                            notes: { contains: id }
                        }
                    });
                    logger.info('Cleaned up linked RevenueTransactions', { id });
                } catch (syncError) {
                    logger.error('Failed to clean up linked RevenueTransaction', syncError);
                }
            }

            await prisma.financialRecord.delete({
                where: { id }
            });

            logger.info(`Financial Record ${id} deleted by ${user.email}`);

            return NextResponse.json({ success: true, message: 'Record deleted successfully' });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
