import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MANAGER', 'TEAM_LEADER'],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company context required', 400);
            const { searchParams } = new URL(req.url);
            const startDate = searchParams.get('startDate');
            const endDate = searchParams.get('endDate');

            const where: any = { companyId: user.companyId };
            if (startDate && endDate) {
                where.date = {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                };
            }

            const rosters = await prisma.shiftRoster.findMany({
                where,
                include: {
                    employee: {
                        include: { user: { select: { name: true, email: true } } }
                    },
                    shift: true
                },
                orderBy: { date: 'asc' }
            });

            return NextResponse.json(rosters);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company context required', 400);
            const body = await req.json();

            // Support both single and bulk assignment
            const assignments = Array.isArray(body) ? body : [body];
            const results = [];

            for (const item of assignments) {
                const { employeeId, shiftId, date } = item;
                const rosterDate = new Date(date);
                rosterDate.setHours(0, 0, 0, 0);

                const roster = await prisma.shiftRoster.upsert({
                    where: {
                        employeeId_date: {
                            employeeId,
                            date: rosterDate
                        }
                    },
                    update: { shiftId },
                    create: {
                        employeeId,
                        shiftId,
                        date: rosterDate,
                        companyId: user.companyId
                    }
                });
                results.push(roster);
            }

            return NextResponse.json(results);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
