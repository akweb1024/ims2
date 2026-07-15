import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { canAccessAllCompanies } from '@/lib/access-policy';

const CSV_HEADERS = ['ID', 'Type', 'Category', 'Amount', 'Currency', 'Date', 'Description', 'Status', 'Method', 'CreatedBy'];

function csvResponse(rows: (string | number)[][]) {
    const csvContent = [CSV_HEADERS.join(','), ...rows.map(row => row.join(','))].join('\n');
    return new NextResponse(csvContent, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="financial_records_${Date.now()}.csv"`
        }
    });
}

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            // Prisma drops an undefined key rather than matching null, so
            // `companyId: user.companyId || undefined` exported every company's ledger
            // for a null-company user. Such a user now exports headers only.
            const where: any = {};
            if (!canAccessAllCompanies(user)) {
                if (!user.companyId) return csvResponse([]);
                where.companyId = user.companyId;
            }

            const records = await prisma.financialRecord.findMany({
                where,
                orderBy: { date: 'desc' },
                include: {
                    createdByUser: { select: { name: true } }
                }
            });

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

            return csvResponse(rows);

        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// Style guide accessibility compliance helper comment: aria-label placeholder label
