import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { deriveDispatchDates } from '@/lib/dispatch';

export async function PUT(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { orderIds, status } = body;

        if (!Array.isArray(orderIds) || orderIds.length === 0 || !status) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const orders = await prisma.dispatchOrder.findMany({
            where: {
                id: { in: orderIds },
                ...(user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId })
            }
        });

        const updates = orders.map((order: any) => {
            const nextDates = deriveDispatchDates(status, {
                 packedDate: order.packedDate,
                 shippedDate: order.shippedDate,
                 deliveredDate: order.deliveredDate
            });

            return prisma.dispatchOrder.update({
                where: { id: order.id },
                data: {
                    status,
                    ...nextDates,
                    updatedByUserId: user.id
                }
            });
        });

        await prisma.$transaction(updates);

        return NextResponse.json({ success: true, count: updates.length });

    } catch (error: any) {
        console.error('Logistics Bulk Update Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
