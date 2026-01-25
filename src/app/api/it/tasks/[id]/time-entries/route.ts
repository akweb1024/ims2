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
        const body = await req.json();
        const { date, hours, description, isBillable } = body;

        const parsedHours = parseFloat(hours);

        if (!parsedHours || parsedHours <= 0) {
            return NextResponse.json({ error: 'Hours must be greater than 0' }, { status: 400 });
        }

        // Get task to get companyId and projectId
        const task = await prisma.iTTask.findUnique({
            where: { id: id }
        });

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Check access
        const companyId = (user as any).companyId;
        if (task.companyId !== companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Create time entry
        const timeEntry = await prisma.iTTimeEntry.create({
            data: {
                company: { connect: { id: companyId } },
                task: { connect: { id: id } },
                user: { connect: { id: user.id } },
                project: task.projectId ? { connect: { id: task.projectId } } : undefined,
                date: new Date(date),
                hours: parsedHours,
                description,
                isBillable: isBillable || false,
                amount: 0, // Default amount 0, should be calculated if rate exists
                hourlyRate: 0, // Default rate 0
            }
        });

        // Update task actual hours
        await prisma.iTTask.update({
            where: { id: id },
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
