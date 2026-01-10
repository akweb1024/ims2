import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const period = searchParams.get('period') || 'CURRENT'; // e.g. "JAN-2024"

            const companyId = user.companyId;
            if (!companyId) return createErrorResponse('Company ID required', 400);

            // 1. Get all employees
            const employees = await prisma.employeeProfile.findMany({
                where: { user: { companyId, isActive: true } },
                include: {
                    user: { select: { name: true, email: true } },
                    kpis: { where: { period } },
                    workReports: {
                        where: {
                            // Filter reports for the period if possible, 
                            // for now just take last 30 days for generic stats
                            date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                        }
                    }
                }
            });

            const stats = employees.map(emp => {
                const totalTarget = emp.kpis.reduce((acc, k) => acc + k.target, 0);
                const totalCurrent = emp.kpis.reduce((acc, k) => acc + k.current, 0);
                const avgAchievement = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

                const productivityScore = emp.workReports.reduce((acc, r) => {
                    return acc + (r.tasksCompleted || 0) + (r.ticketsResolved || 0);
                }, 0);

                return {
                    id: emp.id,
                    name: emp.user.name || emp.user.email,
                    kpiAchievement: Number(avgAchievement.toFixed(1)),
                    productivityScore,
                    kpiCount: emp.kpis.length,
                    activeKpis: emp.kpis
                };
            });

            // Calculate Benchmarks
            const companyAvgAchievement = stats.length > 0 ? stats.reduce((acc, s) => acc + s.kpiAchievement, 0) / stats.length : 0;

            return NextResponse.json({
                period,
                companyAvgAchievement: Number(companyAvgAchievement.toFixed(1)),
                employeeStats: stats,
                topAchievers: [...stats].sort((a, b) => b.kpiAchievement - a.kpiAchievement).slice(0, 5)
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
