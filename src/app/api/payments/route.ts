import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { assertCompanyAccess } from '@/lib/access-policy';
import { handleApiError } from '@/lib/error-handler';

export async function GET(req: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const requestedCompanyId = searchParams.get('companyId');

        // A caller-supplied company must be authorized before it reaches the filter.
        // Note the role check below only runs when no company resolves, so it is
        // not a backstop for this path.
        if (requestedCompanyId) {
            await assertCompanyAccess(user, requestedCompanyId, 'view payments for this company');
        }

        const filter: any = {};
        const targetCompanyId = requestedCompanyId || user.companyId;
        if (targetCompanyId) {
            filter.companyId = targetCompanyId;
        } else if (!['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'].includes(user.role)) {
            return NextResponse.json({ payments: [], history: [] });
        }

        const [payments, history] = await Promise.all([
            prisma.payment.findMany({
                where: filter,
                include: {
                    company: { select: { name: true } },
                    invoice: { select: { invoiceNumber: true } }
                },
                orderBy: { paymentDate: 'desc' },
                take: 100
            }),
            prisma.$queryRaw`
                SELECT 
                    TO_CHAR("paymentDate", 'YYYY-MM') as month,
                    SUM(amount) as total
                FROM "Payment"
                WHERE "status" = 'captured'
                ${targetCompanyId ? Prisma.sql`AND "companyId" = ${targetCompanyId}` : Prisma.empty}
                GROUP BY TO_CHAR("paymentDate", 'YYYY-MM')
                ORDER BY month ASC
                LIMIT 12
            `
        ]);

        return NextResponse.json({
            payments,
            history
        });
    } catch (error) {
        return handleApiError(error, '/api/payments');
    }
}

// Style guide accessibility compliance helper comment: aria-label placeholder label
