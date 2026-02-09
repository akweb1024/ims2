
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');
            const month = parseInt(searchParams.get('month') || '');
            const year = parseInt(searchParams.get('year') || '');

            if (!employeeId || !month || !year) {
                return createErrorResponse('Employee ID, month, and year are required', 400);
            }

            // Fetch monthly snapshot
            const snapshot = await prisma.monthlyPerformanceSnapshot.findFirst({
                where: {
                    employeeId,
                    month,
                    year
                }
            });

            // Fetch completed goals for the month
            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 0);

            const completedGoals = await prisma.employeeGoal.findMany({
                where: {
                    employeeId,
                    status: 'COMPLETED',
                    updatedAt: {
                        gte: monthStart,
                        lte: monthEnd
                    }
                },
                select: {
                    title: true,
                    description: true,
                    targetValue: true,
                    currentValue: true,
                    unit: true
                }
            });

            const kpiSummary = completedGoals.map(g =>
                `${g.title}: ${g.currentValue}/${g.targetValue} ${g.unit}`
            ).join('\n');

            return NextResponse.json({
                revenueAchievement: snapshot?.totalRevenueGenerated || 0,
                revenueTarget: snapshot?.revenueTarget || 0,
                kpiSummary,
                snapshotFound: !!snapshot
            });

        } catch (error) {
            console.error('Error fetching real performance data:', error);
            return createErrorResponse(error);
        }
    }
);
