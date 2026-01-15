import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

// GET /api/it/analytics/dashboard - Get IT management dashboard statistics
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const companyId = (user as any).companyId;
        if (!companyId) {
            return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const view = searchParams.get('view') || 'my'; // my, team, all

        // Determine access level
        const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'].includes(user.role);
        const isManager = ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN', 'MANAGER'].includes(user.role);

        // Build where clauses based on view
        let projectWhere: any = { companyId };
        let taskWhere: any = { companyId };

        if (view === 'all' && !isAdmin) {
            return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        } else if (view === 'team' && !isManager) {
            return NextResponse.json({ error: 'Forbidden - Manager access required' }, { status: 403 });
        } else if (view === 'team') {
            // Get subordinates
            const subordinates = await prisma.user.findMany({
                where: { managerId: user.id },
                select: { id: true }
            });
            const subordinateIds = subordinates.map(s => s.id);

            taskWhere.OR = [
                { assignedToId: user.id },
                { assignedToId: { in: subordinateIds } },
                { createdById: user.id }
            ];

            projectWhere.OR = [
                { projectManagerId: user.id },
                { teamLeadId: user.id },
            ];
        } else if (view === 'my') {
            taskWhere.OR = [
                { assignedToId: user.id },
                { createdById: user.id },
                { reporterId: user.id }
            ];

            projectWhere.OR = [
                { projectManagerId: user.id },
                { teamLeadId: user.id },
            ];
        }

        // Fetch projects statistics
        const [
            totalProjects,
            activeProjects,
            completedProjects,
            revenueProjects,
        ] = await Promise.all([
            prisma.iTProject.count({ where: projectWhere }),
            prisma.iTProject.count({ where: { ...projectWhere, status: 'IN_PROGRESS' } }),
            prisma.iTProject.count({ where: { ...projectWhere, status: 'COMPLETED' } }),
            prisma.iTProject.count({ where: { ...projectWhere, isRevenueBased: true } }),
        ]);

        // Fetch tasks statistics
        const [
            totalTasks,
            pendingTasks,
            inProgressTasks,
            completedTasks,
            revenueTasks,
        ] = await Promise.all([
            prisma.iTTask.count({ where: taskWhere }),
            prisma.iTTask.count({ where: { ...taskWhere, status: 'PENDING' } }),
            prisma.iTTask.count({ where: { ...taskWhere, status: 'IN_PROGRESS' } }),
            prisma.iTTask.count({ where: { ...taskWhere, status: 'COMPLETED' } }),
            prisma.iTTask.count({ where: { ...taskWhere, isRevenueBased: true } }),
        ]);

        // Fetch revenue statistics (only for managers and admins)
        let revenueStats = null;
        if (isManager) {
            const projects = await prisma.iTProject.findMany({
                where: { ...projectWhere, isRevenueBased: true },
                select: {
                    actualRevenue: true,
                    itRevenueEarned: true,
                }
            });

            const tasks = await prisma.iTTask.findMany({
                where: { ...taskWhere, isRevenueBased: true },
                select: {
                    actualValue: true,
                    itRevenueEarned: true,
                    isPaid: true,
                }
            });

            const totalProjectRevenue = projects.reduce((sum, p) => sum + p.actualRevenue, 0);
            const totalProjectITRevenue = projects.reduce((sum, p) => sum + p.itRevenueEarned, 0);
            const totalTaskRevenue = tasks.reduce((sum, t) => sum + t.actualValue, 0);
            const totalTaskITRevenue = tasks.reduce((sum, t) => sum + t.itRevenueEarned, 0);
            const paidTaskRevenue = tasks.filter(t => t.isPaid).reduce((sum, t) => sum + t.itRevenueEarned, 0);
            const unpaidTaskRevenue = tasks.filter(t => !t.isPaid).reduce((sum, t) => sum + t.itRevenueEarned, 0);

            revenueStats = {
                totalRevenue: Math.round((totalProjectRevenue + totalTaskRevenue) * 100) / 100,
                itRevenue: Math.round((totalProjectITRevenue + totalTaskITRevenue) * 100) / 100,
                paidRevenue: Math.round(paidTaskRevenue * 100) / 100,
                unpaidRevenue: Math.round(unpaidTaskRevenue * 100) / 100,
                projectRevenue: Math.round(totalProjectITRevenue * 100) / 100,
                taskRevenue: Math.round(totalTaskITRevenue * 100) / 100,
            };
        }

        // Fetch recent tasks
        const recentTasks = await prisma.iTTask.findMany({
            where: taskWhere,
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        projectCode: true,
                    }
                },
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            },
            orderBy: { updatedAt: 'desc' },
            take: 10
        });

        // Fetch tasks by priority
        const [highPriorityTasks, mediumPriorityTasks, lowPriorityTasks] = await Promise.all([
            prisma.iTTask.count({ where: { ...taskWhere, priority: 'HIGH', status: { not: 'COMPLETED' } } }),
            prisma.iTTask.count({ where: { ...taskWhere, priority: 'MEDIUM', status: { not: 'COMPLETED' } } }),
            prisma.iTTask.count({ where: { ...taskWhere, priority: 'LOW', status: { not: 'COMPLETED' } } }),
        ]);

        // Fetch tasks by type
        const [revenueTasksCount, supportTasksCount, maintenanceTasksCount, urgentTasksCount] = await Promise.all([
            prisma.iTTask.count({ where: { ...taskWhere, type: 'REVENUE' } }),
            prisma.iTTask.count({ where: { ...taskWhere, type: 'SUPPORT' } }),
            prisma.iTTask.count({ where: { ...taskWhere, type: 'MAINTENANCE' } }),
            prisma.iTTask.count({ where: { ...taskWhere, type: 'URGENT' } }),
        ]);

        // Calculate completion rate
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Fetch time tracking summary
        const timeEntries = await prisma.iTTimeEntry.findMany({
            where: {
                companyId,
                userId: view === 'my' ? user.id : undefined,
                date: {
                    gte: new Date(new Date().setDate(new Date().getDate() - 30)) // Last 30 days
                }
            },
            select: {
                hours: true,
                isBillable: true,
            }
        });

        const totalHoursLogged = timeEntries.reduce((sum, e) => sum + e.hours, 0);
        const billableHours = timeEntries.filter(e => e.isBillable).reduce((sum, e) => sum + e.hours, 0);

        const dashboard = {
            overview: {
                projects: {
                    total: totalProjects,
                    active: activeProjects,
                    completed: completedProjects,
                    revenue: revenueProjects,
                },
                tasks: {
                    total: totalTasks,
                    pending: pendingTasks,
                    inProgress: inProgressTasks,
                    completed: completedTasks,
                    revenue: revenueTasks,
                    completionRate,
                },
                timeTracking: {
                    totalHours: Math.round(totalHoursLogged * 10) / 10,
                    billableHours: Math.round(billableHours * 10) / 10,
                    nonBillableHours: Math.round((totalHoursLogged - billableHours) * 10) / 10,
                    period: 'Last 30 days',
                }
            },
            revenue: revenueStats,
            tasksByPriority: {
                high: highPriorityTasks,
                medium: mediumPriorityTasks,
                low: lowPriorityTasks,
            },
            tasksByType: {
                revenue: revenueTasksCount,
                support: supportTasksCount,
                maintenance: maintenanceTasksCount,
                urgent: urgentTasksCount,
            },
            recentTasks: recentTasks.map(task => ({
                id: task.id,
                title: task.title,
                taskCode: task.taskCode,
                status: task.status,
                priority: task.priority,
                type: task.type,
                project: task.project?.name || null,
                assignedTo: task.assignedTo?.name || 'Unassigned',
                updatedAt: task.updatedAt,
            })),
            view,
        };

        return NextResponse.json(dashboard);
    } catch (error) {
        console.error('Fetch IT Dashboard Error:', error);
        return createErrorResponse(error);
    }
}
