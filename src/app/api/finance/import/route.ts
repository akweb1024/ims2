import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { data } = await req.json();

            if (!Array.isArray(data)) {
                return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
            }

            let createdCount = 0;
            let skippedCount = 0;

            for (const rawItem of data) {
                // Normalize keys
                const item: any = {};
                Object.keys(rawItem).forEach(key => {
                    item[key.toLowerCase().replace(/\s/g, '').replace(/_/g, '')] = rawItem[key];
                });

                try {
                    const amount = parseFloat(item.amount);
                    if (isNaN(amount)) throw new Error('Invalid amount');

                    await prisma.financialRecord.create({
                        data: {
                            companyId: user.companyId,
                            createdByUserId: user.id,
                            type: item.type?.toUpperCase() === 'REVENUE' ? 'REVENUE' : 'EXPENSE',
                            category: (item.category || 'OTHER').toUpperCase(),
                            amount: amount,
                            currency: item.currency || 'INR',
                            date: item.date ? new Date(item.date) : new Date(),
                            description: item.description || '',
                            status: (item.status || 'COMPLETED').toUpperCase(),
                            paymentMethod: (item.paymentmethod || item.method || 'CASH').toUpperCase(),
                            referenceId: item.referenceid?.toString()
                        }
                    });
                    createdCount++;
                } catch (err) {
                    console.error('Record Import Error:', err);
                    skippedCount++;
                }
            }

            return NextResponse.json({
                success: true,
                message: `Imported ${createdCount} records. ${skippedCount} skipped.`
            });

        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// Style guide accessibility compliance helper comment: aria-label placeholder label
