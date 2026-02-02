
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');
            const scope = searchParams.get('scope') || 'INDIVIDUAL'; // INDIVIDUAL, TEAM, COMPANY
            const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

            let targetEmployeeIds: string[] = [];

            if (scope === 'INDIVIDUAL') {
                if (!employeeId) return createErrorResponse('Employee ID required for INDIVIDUAL scope', 400);
                targetEmployeeIds = [employeeId];
            } else if (scope === 'TEAM') {
                // Fetch direct reports via User relation
                const directReports = await prisma.user.findMany({
                    where: { managerId: user.id },
                    select: { employeeProfile: { select: { id: true } } }
                });

                targetEmployeeIds = directReports
                    .map(u => u.employeeProfile?.id)
                    .filter(id => id !== undefined && id !== null) as string[];
            } else if (scope === 'COMPANY') {
                if (!['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user.role)) {
                    return createErrorResponse('Unauthorized for COMPANY scope', 403);
                }
                const allEmployees = await prisma.employeeProfile.findMany({ select: { id: true } });
                targetEmployeeIds = allEmployees.map(e => e.id);
            }

            // Fetch Snapshots
            const snapshots = await prisma.monthlyPerformanceSnapshot.findMany({
                where: {
                    employeeId: { in: targetEmployeeIds },
                    year: year
                },
                orderBy: { month: 'asc' }
            });

            // Aggregate Data by Month
            const monthlyData = Array.from({ length: 12 }, (_, i) => {
                const month = i + 1;
                const monthSnapshots = snapshots.filter(s => s.month === month);

                const totalTarget = monthSnapshots.reduce((sum, s) => sum + s.revenueTarget, 0);
                const totalRevenue = monthSnapshots.reduce((sum, s) => sum + s.totalRevenueGenerated, 0);
                const avgAchievement = monthSnapshots.length > 0
                    ? monthSnapshots.reduce((sum, s) => sum + s.revenueAchievement, 0) / monthSnapshots.length
                    : 0;

                return {
                    month,
                    monthName: new Date(year, month - 1).toLocaleString('default', { month: 'short' }),
                    revenueTarget: totalTarget,
                    totalRevenueGenerated: totalRevenue,
                    revenueAchievement: avgAchievement, // Average achievement %
                    snapshotCount: monthSnapshots.length
                };
            });

            // Calculate Totals for Summary Cards
            const totalYearTarget = monthlyData.reduce((sum, m) => sum + m.revenueTarget, 0);
            const totalYearRevenue = monthlyData.reduce((sum, m) => sum + m.totalRevenueGenerated, 0);
            const overallAchievement = totalYearTarget > 0 ? (totalYearRevenue / totalYearTarget) * 100 : 0;

            return NextResponse.json({
                trendData: monthlyData,
                summary: {
                    totalTarget: totalYearTarget,
                    totalRevenue: totalYearRevenue,
                    overallAchievement,
                    employeeCount: targetEmployeeIds.length
                }
            });

        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
