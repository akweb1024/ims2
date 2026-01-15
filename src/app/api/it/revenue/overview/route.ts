import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

// Helper function to check if user can view revenue
function canViewRevenue(role: string): boolean {
    return ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN', 'MANAGER'].includes(role);
}

// GET /api/it/revenue/overview - Get IT department revenue overview
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!canViewRevenue(user.role)) {
            return NextResponse.json({ error: 'Forbidden - Manager access required' }, { status: 403 });
        }

        const companyId = (user as any).companyId;
        if (!companyId) {
            return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();
        const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;

        // Get all revenue-based projects
        const projectsWhere: any = {
            companyId,
            isRevenueBased: true,
        };

        const projects = await prisma.iTProject.findMany({
            where: projectsWhere,
            select: {
                id: true,
                name: true,
                projectCode: true,
                estimatedRevenue: true,
                actualRevenue: true,
                itDepartmentCut: true,
                itRevenueEarned: true,
                status: true,
                createdAt: true,
                completedAt: true,
            }
        });

        // Get all revenue-based tasks
        const tasksWhere: any = {
            companyId,
            isRevenueBased: true,
        };

        const tasks = await prisma.iTTask.findMany({
            where: tasksWhere,
            select: {
                id: true,
                title: true,
                taskCode: true,
                estimatedValue: true,
                actualValue: true,
                itDepartmentCut: true,
                itRevenueEarned: true,
                status: true,
                isPaid: true,
                paymentDate: true,
                createdAt: true,
                completedAt: true,
                project: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        });

        // Calculate totals
        const totalProjectRevenue = projects.reduce((sum, p) => sum + p.actualRevenue, 0);
        const totalProjectITRevenue = projects.reduce((sum, p) => sum + p.itRevenueEarned, 0);
        const totalTaskRevenue = tasks.reduce((sum, t) => sum + t.actualValue, 0);
        const totalTaskITRevenue = tasks.reduce((sum, t) => sum + t.itRevenueEarned, 0);

        const totalEstimatedProjectRevenue = projects.reduce((sum, p) => sum + p.estimatedRevenue, 0);
        const totalEstimatedTaskRevenue = tasks.reduce((sum, t) => sum + t.estimatedValue, 0);

        // Calculate paid vs unpaid
        const paidTasks = tasks.filter(t => t.isPaid);
        const unpaidTasks = tasks.filter(t => !t.isPaid && t.status === 'COMPLETED');
        const paidRevenue = paidTasks.reduce((sum, t) => sum + t.itRevenueEarned, 0);
        const unpaidRevenue = unpaidTasks.reduce((sum, t) => sum + t.itRevenueEarned, 0);

        // Calculate by status
        const completedProjects = projects.filter(p => p.status === 'COMPLETED');
        const inProgressProjects = projects.filter(p => p.status === 'IN_PROGRESS');
        const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
        const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS');

        // Monthly breakdown for the year
        const monthlyData = [];
        for (let m = 1; m <= 12; m++) {
            const monthStart = new Date(year, m - 1, 1);
            const monthEnd = new Date(year, m, 0, 23, 59, 59);

            const monthProjects = projects.filter(p => {
                const completedDate = p.completedAt || p.createdAt;
                return completedDate >= monthStart && completedDate <= monthEnd;
            });

            const monthTasks = tasks.filter(t => {
                const completedDate = t.completedAt || t.createdAt;
                return completedDate >= monthStart && completedDate <= monthEnd;
            });

            const monthProjectRevenue = monthProjects.reduce((sum, p) => sum + p.itRevenueEarned, 0);
            const monthTaskRevenue = monthTasks.reduce((sum, t) => sum + t.itRevenueEarned, 0);

            monthlyData.push({
                month: m,
                monthName: new Date(year, m - 1).toLocaleString('default', { month: 'short' }),
                projectRevenue: Math.round(monthProjectRevenue * 100) / 100,
                taskRevenue: Math.round(monthTaskRevenue * 100) / 100,
                totalRevenue: Math.round((monthProjectRevenue + monthTaskRevenue) * 100) / 100,
                projectsCount: monthProjects.length,
                tasksCount: monthTasks.length,
            });
        }

        // Top revenue projects
        const topProjects = projects
            .sort((a, b) => b.itRevenueEarned - a.itRevenueEarned)
            .slice(0, 10)
            .map(p => ({
                id: p.id,
                name: p.name,
                code: p.projectCode,
                revenue: p.itRevenueEarned,
                status: p.status,
            }));

        // Top revenue tasks
        const topTasks = tasks
            .sort((a, b) => b.itRevenueEarned - a.itRevenueEarned)
            .slice(0, 10)
            .map(t => ({
                id: t.id,
                title: t.title,
                code: t.taskCode,
                revenue: t.itRevenueEarned,
                status: t.status,
                isPaid: t.isPaid,
                project: t.project?.name || 'No Project',
            }));

        const overview = {
            summary: {
                totalRevenue: Math.round((totalProjectRevenue + totalTaskRevenue) * 100) / 100,
                totalITRevenue: Math.round((totalProjectITRevenue + totalTaskITRevenue) * 100) / 100,
                totalEstimatedRevenue: Math.round((totalEstimatedProjectRevenue + totalEstimatedTaskRevenue) * 100) / 100,
                paidRevenue: Math.round(paidRevenue * 100) / 100,
                unpaidRevenue: Math.round(unpaidRevenue * 100) / 100,
                totalProjects: projects.length,
                totalTasks: tasks.length,
                completedProjects: completedProjects.length,
                completedTasks: completedTasks.length,
                inProgressProjects: inProgressProjects.length,
                inProgressTasks: inProgressTasks.length,
            },
            breakdown: {
                projects: {
                    total: totalProjectRevenue,
                    itRevenue: totalProjectITRevenue,
                    count: projects.length,
                    completed: completedProjects.length,
                },
                tasks: {
                    total: totalTaskRevenue,
                    itRevenue: totalTaskITRevenue,
                    count: tasks.length,
                    completed: completedTasks.length,
                    paid: paidTasks.length,
                    unpaid: unpaidTasks.length,
                }
            },
            monthly: monthlyData,
            topProjects,
            topTasks,
            year,
        };

        return NextResponse.json(overview);
    } catch (error) {
        console.error('Fetch IT Revenue Overview Error:', error);
        return createErrorResponse(error);
    }
}
