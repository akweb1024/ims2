
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
            const filterCompanyId = searchParams.get('companyId');
            const departmentId = searchParams.get('departmentId');
            const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

            let targetEmployeeIds: string[] = [];

            // 1. Role-Based Scoping & Access Control
            const isRestrictedRole = !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user.role);

            // If restricted role tries to access COMPANY scope, fallback to TEAM
            const effectiveScope = (isRestrictedRole && scope === 'COMPANY') ? 'TEAM' : scope;

            if (effectiveScope === 'INDIVIDUAL') {
                if (!employeeId) return createErrorResponse('Employee ID required for INDIVIDUAL scope', 400);
                targetEmployeeIds = [employeeId];
            } else if (effectiveScope === 'TEAM') {
                const directReports = await prisma.user.findMany({
                    where: { managerId: user.id },
                    select: { employeeProfile: { select: { id: true } } }
                });

                targetEmployeeIds = directReports
                    .map(u => u.employeeProfile?.id)
                    .filter(id => id !== undefined && id !== null) as string[];
            } else if (effectiveScope === 'COMPANY') {
                const targetCompanyId = (user.role === 'SUPER_ADMIN')
                    ? (filterCompanyId || undefined)
                    : (user.companyId || undefined);

                const where: any = {};
                if (targetCompanyId) {
                    where.user = { companyId: targetCompanyId };
                }
                if (departmentId) {
                    where.user = {
                        ...(where.user || {}),
                        departmentId
                    };
                }

                const employees = await prisma.employeeProfile.findMany({
                    where,
                    select: { id: true }
                });
                targetEmployeeIds = employees.map(e => e.id);
            }

            // Fetch Snapshots
            const snapshots = await prisma.monthlyPerformanceSnapshot.findMany({
                where: {
                    employeeId: { in: targetEmployeeIds },
                    year: year
                },
                orderBy: { month: 'asc' }
            });

            // Fetch Goals and Evaluations for the year
            const goals = await prisma.employeeGoal.findMany({
                where: {
                    employeeId: { in: targetEmployeeIds },
                    startDate: { gte: new Date(`${year}-01-01`) },
                    endDate: { lte: new Date(`${year}-12-31`) }
                },
                include: {
                    evaluations: true
                }
            });

            // Aggregate Data by Month
            const monthlyData = Array.from({ length: 12 }, (_, i) => {
                const month = i + 1;
                const monthSnapshots = snapshots.filter(s => s.month === month);

                // Track monthly goals (starting in this month)
                const monthGoals = goals.filter(g =>
                    g.type === 'MONTHLY' &&
                    new Date(g.startDate).getMonth() + 1 === month
                );

                const totalTarget = monthSnapshots.reduce((sum, s) => sum + s.revenueTarget, 0);
                const totalRevenue = monthSnapshots.reduce((sum, s) => sum + s.totalRevenueGenerated, 0);

                const goalTarget = monthGoals.reduce((sum, g) => sum + g.targetValue, 0);
                const goalAchieved = monthGoals.reduce((sum, g) => sum + g.currentValue, 0);

                return {
                    month,
                    monthName: new Date(year, month - 1).toLocaleString('default', { month: 'short' }),
                    revenueTarget: totalTarget,
                    totalRevenueGenerated: totalRevenue,
                    goalTarget,
                    goalAchieved,
                    goalAchievement: goalTarget > 0 ? (goalAchieved / goalTarget) * 100 : 0,
                    revenueAchievement: totalTarget > 0 ? (totalRevenue / totalTarget) * 100 : 0,
                    snapshotCount: monthSnapshots.length
                };
            });

            // Calculate Totals for Summary Cards
            const totalYearTarget = monthlyData.reduce((sum, m) => sum + m.revenueTarget, 0);
            const totalYearRevenue = monthlyData.reduce((sum, m) => sum + m.totalRevenueGenerated, 0);
            const overallRevenueAchievement = totalYearTarget > 0 ? (totalYearRevenue / totalYearTarget) * 100 : 0;

            const allGoalTarget = goals.reduce((sum, g) => sum + g.targetValue, 0);
            const allGoalAchieved = goals.reduce((sum, g) => sum + g.currentValue, 0);
            const overallGoalAchievement = allGoalTarget > 0 ? (allGoalAchieved / allGoalTarget) * 100 : 0;

            const allEvaluations = goals.flatMap(g => g.evaluations);
            const avgEvaluationScore = allEvaluations.length > 0
                ? allEvaluations.reduce((sum, e) => sum + e.score, 0) / allEvaluations.length
                : 0;

            return NextResponse.json({
                trendData: monthlyData,
                summary: {
                    totalTarget: totalYearTarget,
                    totalRevenue: totalYearRevenue,
                    overallAchievement: overallRevenueAchievement,
                    overallGoalAchievement,
                    avgEvaluationScore,
                    employeeCount: targetEmployeeIds.length,
                    totalGoals: goals.length
                }
            });

        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
