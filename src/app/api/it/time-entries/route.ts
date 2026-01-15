import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

// GET /api/it/time-entries - List time entries
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
        const projectId = searchParams.get('projectId');
        const taskId = searchParams.get('taskId');
        const userId = searchParams.get('userId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Build where clause
        const where: any = { companyId };

        // Role-based filtering
        const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'].includes(user.role);
        if (!isAdmin && !userId) {
            // Non-admins can only see their own time entries
            where.userId = user.id;
        } else if (userId) {
            where.userId = userId;
        }

        if (projectId) where.projectId = projectId;
        if (taskId) where.taskId = taskId;

        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        const timeEntries = await prisma.iTTimeEntry.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                        projectCode: true,
                    }
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                        taskCode: true,
                    }
                }
            },
            orderBy: { date: 'desc' }
        });

        // Calculate totals
        const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
        const billableHours = timeEntries.filter(e => e.isBillable).reduce((sum, e) => sum + e.hours, 0);
        const totalAmount = timeEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);

        return NextResponse.json({
            entries: timeEntries,
            summary: {
                totalEntries: timeEntries.length,
                totalHours: Math.round(totalHours * 10) / 10,
                billableHours: Math.round(billableHours * 10) / 10,
                nonBillableHours: Math.round((totalHours - billableHours) * 10) / 10,
                totalAmount: Math.round(totalAmount * 100) / 100,
            }
        });
    } catch (error) {
        console.error('Fetch Time Entries Error:', error);
        return createErrorResponse(error);
    }
}

// POST /api/it/time-entries - Log time entry
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const companyId = (user as any).companyId;
        if (!companyId) {
            return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        }

        const body = await req.json();
        const {
            projectId,
            taskId,
            date,
            hours,
            description,
            isBillable,
            hourlyRate,
        } = body;

        // Validate required fields
        if (!hours || hours <= 0) {
            return NextResponse.json({ error: 'Valid hours value is required' }, { status: 400 });
        }

        if (!projectId && !taskId) {
            return NextResponse.json({ error: 'Either projectId or taskId is required' }, { status: 400 });
        }

        // Verify project/task exists and belongs to company
        if (projectId) {
            const project = await prisma.iTProject.findUnique({
                where: { id: projectId }
            });
            if (!project || project.companyId !== companyId) {
                return NextResponse.json({ error: 'Invalid project' }, { status: 400 });
            }
        }

        if (taskId) {
            const task = await prisma.iTTask.findUnique({
                where: { id: taskId }
            });
            if (!task || task.companyId !== companyId) {
                return NextResponse.json({ error: 'Invalid task' }, { status: 400 });
            }

            // Update task actual hours
            await prisma.iTTask.update({
                where: { id: taskId },
                data: {
                    actualHours: {
                        increment: parseFloat(hours)
                    }
                }
            });
        }

        // Calculate amount if hourly rate provided
        let amount = null;
        if (isBillable && hourlyRate) {
            amount = parseFloat(hours) * parseFloat(hourlyRate);
        }

        const timeEntry = await prisma.iTTimeEntry.create({
            data: {
                companyId,
                projectId: projectId || null,
                taskId: taskId || null,
                userId: user.id,
                date: date ? new Date(date) : new Date(),
                hours: parseFloat(hours),
                description,
                isBillable: isBillable || false,
                hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
                amount,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                        projectCode: true,
                    }
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                        taskCode: true,
                    }
                }
            }
        });

        // Update project actual hours if projectId provided
        if (projectId) {
            await prisma.iTProject.update({
                where: { id: projectId },
                data: {
                    actualHours: {
                        increment: parseFloat(hours)
                    }
                }
            });
        }

        return NextResponse.json(timeEntry, { status: 201 });
    } catch (error) {
        console.error('Create Time Entry Error:', error);
        return createErrorResponse(error);
    }
}
