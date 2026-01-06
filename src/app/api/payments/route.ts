import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const companyId = searchParams.get('companyId');

        const filter: any = {};
        const targetCompanyId = companyId || user.companyId;
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
    } catch (error: any) {
        console.error('Payments API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
