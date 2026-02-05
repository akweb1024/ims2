import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

// GET: Get assignment details
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;

            const task = await prisma.task.findUnique({
                where: { id },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true
                        }
                    },
                    assignedBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true
                        }
                    }
                }
            });

            if (!task) {
                return createErrorResponse('Assignment not found', 404);
            }

            // Check permissions
            if (['EXECUTIVE'].includes(user.role)) {
                if (task.userId !== user.id) {
                    return createErrorResponse('Forbidden', 403);
                }
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                if (!downlineIds.includes(task.userId) && task.assignedById !== user.id) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            return NextResponse.json(task);
        } catch (error: any) {
            console.error('Error fetching assignment:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);

// PUT: Update assignment status
export const PUT = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const body = await req.json();
            const {
                status,
                actualEffort,
                title,
                description,
                dueDate,
                priority,
                estimatedEffort
            } = body;

            const existingTask = await prisma.task.findUnique({
                where: { id }
            });

            if (!existingTask) {
                return createErrorResponse('Assignment not found', 404);
            }

            // Check permissions
            const canUpdate =
                ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'].includes(user.role) ||
                existingTask.userId === user.id ||
                existingTask.assignedById === user.id;

            if (!canUpdate && ['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                if (!downlineIds.includes(existingTask.userId)) {
                    return createErrorResponse('Forbidden', 403);
                }
            } else if (!canUpdate) {
                return createErrorResponse('Forbidden', 403);
            }

            const updatedTask = await prisma.task.update({
                where: { id },
                data: {
                    ...(status && { status }),
                    ...(actualEffort !== undefined && { actualEffort: actualEffort ? parseFloat(actualEffort) : null }),
                    ...(title && { title }),
                    ...(description !== undefined && { description }),
                    ...(dueDate && { dueDate: new Date(dueDate) }),
                    ...(priority && { priority }),
                    ...(estimatedEffort !== undefined && { estimatedEffort: estimatedEffort ? parseFloat(estimatedEffort) : null })
                },
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    },
                    assignedBy: {
                        select: {
                            name: true,
                            email: true
                        }
                    }
                }
            });

            return NextResponse.json(updatedTask);
        } catch (error: any) {
            console.error('Error updating assignment:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);

// DELETE: Delete assignment
export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;

            const existingTask = await prisma.task.findUnique({
                where: { id }
            });

            if (!existingTask) {
                return createErrorResponse('Assignment not found', 404);
            }

            // Only the assigner or admins can delete
            if (!['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'].includes(user.role)) {
                if (existingTask.assignedById !== user.id) {
                    return createErrorResponse('Forbidden: Only the assigner can delete', 403);
                }
            }

            await prisma.task.delete({
                where: { id }
            });

            return NextResponse.json({ success: true });
        } catch (error: any) {
            console.error('Error deleting assignment:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);
