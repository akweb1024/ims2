import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';

export const GET = authorizedRoute([], async (req: NextRequest, user) => {
    if (!user.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const whereClause: any = {
        companyId: user.companyId,
        ...(employeeId && employeeId !== 'ALL' ? { employeeId } : {})
    };

    if (month && year) {
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        whereClause.date = {
            gte: startDate,
            lte: endDate
        };
    }

    const logs = await prisma.employeePointLog.findMany({
        where: whereClause,
        include: {
            employee: {
                include: {
                    user: { select: { name: true, email: true } }
                }
            }
        },
        orderBy: { date: 'desc' },
        take: 100 // Limit results for performance
    });

    // Calculate aggregates if employeeId provided
    let stats = null;
    if (employeeId && employeeId !== 'ALL') {
        const aggregates = await prisma.employeePointLog.groupBy({
            by: ['type'],
            where: whereClause,
            _sum: {
                points: true
            }
        });
        stats = aggregates;
    }

    return NextResponse.json({ logs, stats });
});

export const POST = authorizedRoute(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR'], async (req: NextRequest, user) => {
    if (!user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { employeeId, points, type, reason, date } = body;

    const log = await prisma.employeePointLog.create({
        data: {
            employeeId,
            points: Number(points),
            type, // DISCIPLINE, ACHIEVEMENT, BONUS
            reason,
            date: date ? new Date(date) : new Date(),
            companyId: user.companyId
        }
    });

    return NextResponse.json(log);
});
