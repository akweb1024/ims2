import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    try {
        logger.debug('Performance API request started');
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const companyId = (user as any).companyId;
        if (!companyId) {
            return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const months = parseInt(searchParams.get('months') || '6');

        const now = new Date();
        const startDate = startOfMonth(subMonths(now, months - 1));
        const endDate = endOfMonth(now);
        // 1. Get all users in the company
        const members = await prisma.user.findMany({
            where: { companyId },
            include: {
                employeeProfile: { select: { designation: true } }
            }
        });

        const memberIds = new Set(members.map(m => m.id));

        // 2. Optimized Data Fetching (Use companyId instead of 'in' list to avoid parameter limits)
        const [allTasksInCompany, allTimeEntriesInCompany] = await Promise.all([
            // Get all completed tasks for this company in range
            (prisma as any).iTTask.findMany({
                where: {
                    companyId,
                    status: 'COMPLETED',
                    updatedAt: { gte: startDate, lte: endDate }
                },
                select: { assignedToId: true, itRevenueEarned: true }
            }),
            // Get all time entries for this company in range
            (prisma as any).iTTimeEntry.findMany({
                where: {
                    companyId,
                    date: { gte: startDate, lte: endDate }
                },
                select: { userId: true, hours: true, isBillable: true }
            })
        ]);

        // 3. Process data in memory
        const performanceData = members.map(member => {
            // Filter tasks for this specific member in memory
            const memberTasks = allTasksInCompany.filter((t: any) => t.assignedToId === member.id);
            const taskCount = memberTasks.length;
            const revenueGenerated = memberTasks.reduce((sum: number, t: any) => sum + (t.itRevenueEarned || 0), 0);

            // Filter time entries for this specific member in memory
            const memberTimeEntries = allTimeEntriesInCompany.filter((e: any) => e.userId === member.id);
            const totalHours = memberTimeEntries.reduce((sum: number, e: any) => sum + (e.hours || 0), 0);
            const billableHours = memberTimeEntries.filter((e: any) => e.isBillable).reduce((sum: number, e: any) => sum + (e.hours || 0), 0);

            return {
                userId: member.id,
                name: member.name,
                email: member.email,
                designation: member.employeeProfile?.designation || 'Specialist',
                stats: {
                    completedTasks: taskCount,
                    totalHours: Math.round(totalHours * 10) / 10,
                    billableHours: Math.round(billableHours * 10) / 10,
                    billablePercentage: totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0,
                    revenueGenerated
                }
            };
        });

        const activeMembers = performanceData.filter(m => m.stats.totalHours > 0 || m.stats.completedTasks > 0);

        // 4. Get Overall Company IT Trends
        const monthlyTrends = [];
        for (let i = 0; i < months; i++) {
            const mStart = startOfMonth(subMonths(now, i));
            const mEnd = endOfMonth(subMonths(now, i));

            // Using the already fetched data to calculate trends in memory for even better performance
            const trendTasks = allTasksInCompany.filter((t: any) => {
                // Note: allTasksInCompany was filtered by 'updatedAt' in the bulk query
                // We could just filter the bulk list here by month
                // But for simplicity and accuracy (since bulk query might have different range), let's keep it robust
                return true; // placeholder - actually better to just do aggregate for trends or filter bulk data
            });

            // Since trends might need more history than the 'months' param, let's keep the aggregate queries for now
            // but optimize them to be safe.
            const mTasksCount = await (prisma as any).iTTask.count({
                where: { companyId, status: 'COMPLETED', updatedAt: { gte: mStart, lte: mEnd } }
            });

            const mRev = await (prisma as any).iTTask.aggregate({
                where: { companyId, isRevenueBased: true, status: 'COMPLETED', updatedAt: { gte: mStart, lte: mEnd } },
                _sum: { itRevenueEarned: true }
            });

            const mHrs = await (prisma as any).iTTimeEntry.aggregate({
                where: { companyId, date: { gte: mStart, lte: mEnd } },
                _sum: { hours: true }
            });

            monthlyTrends.push({
                month: mStart.toLocaleString('default', { month: 'short' }),
                year: mStart.getFullYear(),
                completedTasks: mTasksCount,
                revenue: mRev._sum?.itRevenueEarned || 0,
                hours: mHrs._sum?.hours || 0
            });
        }

        // 5. Service Popularity Data
        const serviceStats = await (prisma as any).iTTask.groupBy({
            by: ['serviceId'],
            where: {
                companyId,
                type: 'SERVICE_REQUEST',
                serviceId: { not: null },
                createdAt: { gte: startDate, lte: endDate }
            },
            _count: { id: true },
            _sum: { itRevenueEarned: true }
        });

        const sIds = serviceStats.map((s: any) => s.serviceId).filter(Boolean);
        const serviceDefs = await (prisma as any).iTServiceDefinition.findMany({
            where: { id: { in: sIds } },
            select: { id: true, name: true }
        });

        const popularity = serviceStats.map((stat: any) => {
            const def = serviceDefs.find((d: any) => d.id === stat.serviceId);
            return {
                name: def?.name || 'Deleted Service',
                count: stat._count.id,
                revenue: stat._sum.itRevenueEarned || 0
            };
        }).sort((a: any, b: any) => b.count - a.count);
        return NextResponse.json({
            members: activeMembers.sort((a, b) => b.stats.completedTasks - a.stats.completedTasks),
            trends: monthlyTrends.reverse(),
            servicePopularity: popularity
        });
    } catch (error: any) {
        logger.error('Performance Analytics Error', error);
        return NextResponse.json({
            error: 'Failed to fetch performance analytics',
            details: error.message
        }, { status: 500 });
    }
}
