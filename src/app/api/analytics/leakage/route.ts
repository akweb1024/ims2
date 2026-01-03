import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'FINANCE_ADMIN'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Find active subscriptions without a matching payment in the last 30 days
        const subscriptions = await prisma.subscription.findMany({
            where: {
                status: 'ACTIVE',
                companyId: decoded.companyId
            },
            include: {
                customerProfile: { select: { name: true } },
                invoices: {
                    include: {
                        payments: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        const leakage = subscriptions.filter(sub => {
            const lastInvoice = sub.invoices[0];
            if (!lastInvoice) return true; // No invoice at all
            if (lastInvoice.status !== 'PAID') return true; // Unpaid invoice
            return false;
        }).map(sub => ({
            id: sub.id,
            customer: sub.customerProfile.name,
            total: sub.total,
            lastStatus: sub.invoices[0]?.status || 'NO_INVOICE'
        }));

        const totalLost = leakage.reduce((acc, curr) => acc + curr.total, 0);

        return NextResponse.json({
            leakage,
            totalLost,
            count: leakage.length
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
