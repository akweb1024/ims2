import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50');

        const where: any = {};
        if (user.role !== 'SUPER_ADMIN') {
            where.companyId = user.companyId;
        }

        const [orders, stats, carrierPerformance, trends] = await Promise.all([
            prisma.dispatchOrder.findMany({
                where,
                include: { courier: true },
                orderBy: { createdAt: 'desc' },
                take: limit
            }),
            prisma.dispatchOrder.groupBy({
                by: ['status'],
                where,
                _count: { id: true }
            }),
            prisma.dispatchOrder.groupBy({
                by: ['courierId'],
                where: { ...where, courierId: { not: null } },
                _count: { id: true },
                _avg: { weight: true }
            }),
            prisma.$queryRaw`
                SELECT 
                    DATE("createdAt") as date,
                    COUNT(id) as count
                FROM "DispatchOrder"
                WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
                ${user.role !== 'SUPER_ADMIN' ? prisma.$queryRaw`AND "companyId" = ${user.companyId}` : prisma.$queryRaw``}
                GROUP BY DATE("createdAt")
                ORDER BY DATE("createdAt") ASC
            `
        ]);

        // Fetch courier names for performance mapping
        const couriers = await prisma.courier.findMany({
            where: { id: { in: carrierPerformance.map((p: any) => p.courierId).filter((id: string | null) => id !== null) as string[] } },
            select: { id: true, name: true }
        });

        const formattedPerformance = carrierPerformance.map((p: any) => ({
            courierName: couriers.find((c: any) => c.id === p.courierId)?.name || 'Unknown',
            orderCount: p._count.id,
            avgWeight: p._avg.weight
        }));

        return NextResponse.json({
            orders,
            stats: stats.reduce((acc: any, curr: any) => ({ ...acc, [curr.status]: curr._count.id }), {}),
            carrierPerformance: formattedPerformance,
            trends
        });

    } catch (error: any) {
        console.error('Logistics API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { recipientName, address, city, state, pincode, country, phone, items, courierId, trackingNumber } = body;

        const order = await prisma.dispatchOrder.create({
            data: {
                recipientName,
                address,
                city,
                state,
                pincode,
                country,
                phone,
                items, // JSON
                courierId,
                trackingNumber,
                status: 'PENDING',
                companyId: user.companyId
            }
        });

        return NextResponse.json(order);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
