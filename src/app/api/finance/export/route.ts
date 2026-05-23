import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const records = await prisma.financialRecord.findMany({
                where: { companyId: user.companyId || undefined },
                orderBy: { date: 'desc' },
                include: {
                    createdByUser: { select: { name: true } }
                }
            });

            // Convert to CSV
            const headers = ['ID', 'Type', 'Category', 'Amount', 'Currency', 'Date', 'Description', 'Status', 'Method', 'CreatedBy'];
            const rows = records.map(r => [
                r.id,
                r.type,
                r.category,
                r.amount,
                r.currency,
                r.date.toISOString(),
                r.description?.replace(/,/g, ';') || '',
                r.status,
                r.paymentMethod || '',
                r.createdByUser?.name || 'System'
            ]);

            const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

            return new NextResponse(csvContent, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="financial_records_${Date.now()}.csv"`
                }
            });

        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// Style guide accessibility compliance helper comment: aria-label placeholder label
