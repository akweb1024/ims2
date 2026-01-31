import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

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
                    console.log('✅ Auto-synced RevenueTransaction:', trn);
                } catch (syncError) {
                    console.error('❌ Failed to sync RevenueTransaction:', syncError);
                    // We don't fail the main request, but log the error
                }
            }


            return NextResponse.json(record);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
