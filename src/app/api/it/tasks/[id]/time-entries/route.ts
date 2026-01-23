import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const taskId = id;
        const { hours, description, date, isBillable } = await req.json();

        if (!hours || parseFloat(hours) <= 0) {
            return NextResponse.json({ error: 'Hours must be greater than 0' }, { status: 400 });
        }

        // Get task to get companyId and projectId
        const task = await prisma.iTTask.findUnique({
            where: { id: taskId },
            include: { project: true }
        });

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        const parsedHours = parseFloat(hours);

        // Log the time entry
        const timeEntry = await prisma.iTTimeEntry.create({
            data: {
                taskId,
                projectId: task.projectId,
                companyId: task.companyId,
                userId: user.id,
                hours: parsedHours,
                description,
                date: date ? new Date(date) : new Date(),
                isBillable: !!isBillable,
            },
            include: {
                user: {
                    select: { name: true }
                }
            }
        });

        // Update task actual hours
        await prisma.iTTask.update({
            where: { id: taskId },
            data: {
                actualHours: {
                    increment: parsedHours
                }
            }
        });

        // Update project actual hours if project exists
        if (task.projectId) {
            await prisma.iTProject.update({
                where: { id: task.projectId },
                data: {
                    actualHours: {
                        increment: parsedHours
                    }
                }
            });
        }

        return NextResponse.json(timeEntry);
    } catch (error) {
        console.error('Error logging time:', error);
        return createErrorResponse(error);
    }
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const taskId = id;
        const timeEntries = await prisma.iTTimeEntry.findMany({
            where: { taskId },
            include: {
                user: {
                    select: { name: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        return NextResponse.json(timeEntries);
    } catch (error) {
        console.error('Error fetching time entries:', error);
        return createErrorResponse(error);
    }
}
