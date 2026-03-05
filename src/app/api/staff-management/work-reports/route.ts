import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const date = searchParams.get('date');
            const startDate = searchParams.get('startDate');
            const endDate = searchParams.get('endDate');
            const companyIdParam = searchParams.get('companyId');
            const departmentId = searchParams.get('departmentId');
            const employeeId = searchParams.get('employeeId');
            const status = searchParams.get('status');

            const where: any = {};

            if (date) {
                const targetDate = new Date(date);
                targetDate.setHours(0, 0, 0, 0);
                const nextDay = new Date(targetDate);
                nextDay.setDate(nextDay.getDate() + 1);
                where.date = { gte: targetDate, lt: nextDay };
            } else if (startDate || endDate) {
                const from = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
                const to = endDate ? new Date(endDate) : new Date();
                from.setHours(0, 0, 0, 0);
                to.setHours(23, 59, 59, 999);
                where.date = { gte: from, lte: to };
            } else {
                const from = new Date();
                from.setDate(from.getDate() - 30);
                from.setHours(0, 0, 0, 0);
                where.date = { gte: from, lte: new Date() };
            }

            const companyId = (companyIdParam && companyIdParam !== 'all')
                ? companyIdParam
                : (user.role !== 'SUPER_ADMIN' ? user.companyId : null);

            if (companyId && companyId !== 'all') {
                where.companyId = companyId;
            }

            if (departmentId && departmentId !== 'all') {
                where.employee = { user: { departmentId } };
            }

            if (employeeId && employeeId !== 'all') {
                where.employeeId = employeeId;
            }

            if (status && status !== 'all') {
                where.status = status;
            }

            const workReports = await prisma.workReport.findMany({
                where,
                include: {
                    employee: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    email: true,
                                    department: {
                                        select: {
                                            name: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    comments: {
                        include: {
                            author: {
                                select: {
                                    name: true,
                                    email: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    }
                },
                orderBy: { date: 'desc' }
            });

            // Transform data to match frontend expectations
            const formattedReports = workReports.map((report: any) => {
                // Parse tasks from tasksSnapshot if available
                let tasks = [];
                if (report.tasksSnapshot) {
                    if (Array.isArray(report.tasksSnapshot)) {
                        tasks = report.tasksSnapshot;
                    } else if (typeof report.tasksSnapshot === 'object') {
                        const snapshot = report.tasksSnapshot as any;
                        if (Array.isArray(snapshot.tasks)) {
                            tasks = snapshot.tasks;
                        }
                    }
                }

                // If no tasks in snapshot, create a summary task from the report
                if (tasks.length === 0 && report.content) {
                    tasks = [{
                        id: '1',
                        description: report.title,
                        hours: report.hoursSpent || 0,
                        status: 'COMPLETED'
                    }];
                }

                return {
                    id: report.id,
                    employeeId: report.employeeId,
                    employeeName: report.employee.user.name,
                    employeeEmail: report.employee.user.email,
                    department: report.employee.user.department?.name || 'N/A',
                    date: report.date.toISOString().split('T')[0],
                    title: report.title,
                    content: report.content,
                    tasks,
                    totalHours: report.hoursSpent || 0,
                    status: report.status,
                    managerComment: report.managerComment,
                    managerRating: report.managerRating,
                    selfRating: report.selfRating,
                    submittedAt: report.createdAt.toISOString(),
                    category: report.category,
                    keyOutcome: report.keyOutcome,
                    metrics: report.metrics,
                    pointsEarned: report.pointsEarned,
                    // Performance metrics
                    tasksCompleted: report.tasksCompleted,
                    chatsHandled: report.chatsHandled,
                    followUpsCompleted: report.followUpsCompleted,
                    ticketsResolved: report.ticketsResolved,
                    revenueGenerated: report.revenueGenerated
                };
            });

            return NextResponse.json(formattedReports);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
