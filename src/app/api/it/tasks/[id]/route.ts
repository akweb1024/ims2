import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

// GET /api/it/tasks/[id] - Get task details
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const task = await prisma.iTTask.findUnique({
            where: { id: id },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        projectCode: true,
                        status: true,
                    }
                },
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        employeeProfile: {
                            select: {
                                designation: true,
                                profilePicture: true,
                                phoneNumber: true,
                            }
                        }
                    }
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
                reporter: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
                timeEntries: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    },
                    orderBy: { date: 'desc' }
                },
                comments: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                employeeProfile: {
                                    select: {
                                        profilePicture: true,
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                statusHistory: {
                    include: {
                        changedBy: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    },
                    orderBy: { changedAt: 'desc' }
                }
            }
        });

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Check access
        const companyId = (user as any).companyId;
        if (task.companyId !== companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Calculate statistics
        const totalTimeLogged = task.timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
        const billableHours = task.timeEntries.filter(e => e.isBillable).reduce((sum, e) => sum + e.hours, 0);

        const taskWithStats = {
            ...task,
            stats: {
                totalTimeLogged: Math.round(totalTimeLogged * 10) / 10,
                billableHours: Math.round(billableHours * 10) / 10,
                nonBillableHours: Math.round((totalTimeLogged - billableHours) * 10) / 10,
                estimatedVsActual: task.estimatedHours ? Math.round((totalTimeLogged / task.estimatedHours) * 100) : 0,
                commentsCount: task.comments.length,
                statusChangesCount: task.statusHistory.length,
            }
        };

        return NextResponse.json(taskWithStats);
    } catch (error) {
        console.error('Fetch IT Task Error:', error);
        return createErrorResponse(error);
    }
}

// PATCH /api/it/tasks/[id] - Update task
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // Check if task exists and user has access
        const existingTask = await prisma.iTTask.findUnique({
            where: { id: id }
        });

        if (!existingTask) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        const companyId = (user as any).companyId;
        if (existingTask.companyId !== companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Prepare update data
        const updateData: any = {};

        // Allowed fields
        const allowedFields = [
            'projectId', 'title', 'description', 'category', 'type', 'priority', 'status',
            'assignedToId', 'reporterId', 'startDate', 'dueDate', 'estimatedHours', 'actualHours',
            'isRevenueBased', 'estimatedValue', 'actualValue', 'currency', 'itDepartmentCut',
            'itRevenueEarned', 'isPaid', 'paymentDate', 'progressPercent', 'blockers',
            'dependencies', 'tags', 'attachments'
        ];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                if (field.includes('Date') && body[field]) {
                    updateData[field] = new Date(body[field]);
                } else if (field.includes('Hours') || field.includes('Value') || field.includes('Cut') || field === 'progressPercent') {
                    // Logic fix: Allow 0 value explicitly, handle NaN
                    const val = parseFloat(body[field]?.toString());
                    updateData[field] = isNaN(val) ? (field === 'progressPercent' ? 0 : null) : val;
                } else if (field === 'projectId') {
                    // For UPDATE with ITTaskUpdateInput, use relation fields
                    if (body[field]) {
                        updateData.project = { connect: { id: body[field] } };
                    } else if (body[field] === null || body[field] === '') {
                        updateData.project = { disconnect: true };
                    }
                    continue;
                } else if (field === 'assignedToId') {
                    // For UPDATE with ITTaskUpdateInput, use relation fields
                    if (body[field]) {
                        updateData.assignedTo = { connect: { id: body[field] } };
                    } else if (body[field] === null || body[field] === '') {
                        updateData.assignedTo = { disconnect: true };
                    }
                    continue;
                } else if (field === 'reporterId') {
                    // For UPDATE with ITTaskUpdateInput, use relation fields
                    if (body[field]) {
                        updateData.reporter = { connect: { id: body[field] } };
                    } else if (body[field] === null || body[field] === '') {
                        updateData.reporter = { disconnect: true };
                    }
                    continue;
                } else if (field === 'serviceId') {
                    // For UPDATE with ITTaskUpdateInput, use relation fields
                    if (body[field]) {
                        updateData.service = { connect: { id: body[field] } };
                    } else if (body[field] === null || body[field] === '') {
                        updateData.service = { disconnect: true };
                    }
                    continue;
                } else {
                    updateData[field] = body[field];
                }
            }
        }

        // Calculate IT revenue if actualValue is updated
        if (updateData.actualValue !== undefined && existingTask.itDepartmentCut > 0) {
            updateData.itRevenueEarned = (updateData.actualValue * existingTask.itDepartmentCut) / 100;
        }

        // --- IT SERVICE REQUEST LOGIC ---
        // If it's a service request being completed/accepted
        if (updateData.status === 'COMPLETED' && (existingTask.type as string) === 'SERVICE_REQUEST') {
            // If it's coming from UNDER_REVIEW, it means the requester is accepting it
            if ((existingTask.status as string) === 'UNDER_REVIEW') {
                // Set revenue earned to the full actual value (or estimated if actual is 0)
                updateData.itRevenueEarned = updateData.actualValue || existingTask.actualValue || updateData.estimatedValue || existingTask.estimatedValue;
                updateData.isPaid = true; // Mark as paid/credited
            }
        }

        // Set completedAt if status changed to COMPLETED
        if (updateData.status === 'COMPLETED' && existingTask.status !== 'COMPLETED') {
            updateData.completedAt = new Date();
            updateData.progressPercent = 100;
        } else if (updateData.status && updateData.status !== 'COMPLETED' && existingTask.status === 'COMPLETED') {
            // Clear completion date if moved back from COMPLETED
            updateData.completedAt = null;
        }

        // Create status history if status changed
        if (updateData.status && updateData.status !== existingTask.status) {
            await prisma.iTTaskStatusHistory.create({
                data: {
                    taskId: params.id,
                    changedById: user.id,
                    previousStatus: existingTask.status,
                    newStatus: updateData.status,
                    comment: body.statusComment || null,
                }
            });

            // --- NOTIFICATION LOGIC ---
            try {
        const { id } = await params;
                // If marked for review, notify the requester
                if (updateData.status === 'UNDER_REVIEW') {
                    await prisma.notification.create({
                        data: {
                            userId: existingTask.createdById,
                            title: 'IT Service Ready for Review',
                            message: `Your request "${existingTask.title}" is ready. Please review and accept to complete.`,
                            type: 'INFO',
                            link: `/dashboard/it-services`,
                        }
                    });
                }
                // If completed, notify the assignee if requester accepted it
                else if (updateData.status === 'COMPLETED' && existingTask.assignedToId) {
                    await prisma.notification.create({
                        data: {
                            userId: existingTask.assignedToId,
                            title: 'IT Task Accepted',
                            message: `Task "${existingTask.title}" has been accepted and closed by the requester.`,
                            type: 'SUCCESS',
                            link: `/dashboard/it-management/tasks/${params.id}`,
                        }
                    });
                }
            } catch (notifyError) {
                console.error('Failed to create notification:', notifyError);
                // Don't fail the task update if notification fails
            }
        }

        const task = await prisma.iTTask.update({
            where: { id: id },
            data: updateData,
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
                        email: true,
                    }
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
            }
        });

        return NextResponse.json(task);
    } catch (error) {
        console.error('Update IT Task Error:', error);
        return createErrorResponse(error);
    }
}

// DELETE /api/it/tasks/[id] - Delete task
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const task = await prisma.iTTask.findUnique({
            where: { id: id }
        });

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        const companyId = (user as any).companyId;
        if (task.companyId !== companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Only creator or IT admins can delete
        const canDelete = ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'].includes(user.role) ||
            task.createdById === user.id;

        if (!canDelete) {
            return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
        }

        await prisma.iTTask.delete({
            where: { id: id }
        });

        return NextResponse.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Delete IT Task Error:', error);
        return createErrorResponse(error);
    }
}
