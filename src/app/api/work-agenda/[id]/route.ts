import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { getISTToday } from '@/lib/date-utils';
import { createAuditLog } from '@/lib/notifications';
import { createNotification } from '@/lib/system-notifications';
import { decodeAgendaMetadata } from '@/lib/hr/work-agenda';
import { notifyBlockerTransition } from '@/lib/hr/blocker-notifications';

const normalizeWorkPlanVisibility = (value: unknown) => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toUpperCase();
    if (normalized === 'PUBLIC') return 'ALL';
    if (normalized === 'PRIVATE') return 'SELF';
    return ['SELF', 'MANAGER', 'ADMIN', 'ALL'].includes(normalized) ? normalized : undefined;
};

// GET: Get specific work plan
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;

            const workPlan = await prisma.workPlan.findUnique({
                where: { id },
                include: {
                    employee: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            },
                            designation: true
                        }
                    },
                    linkedGoal: {
                        select: {
                            id: true,
                            title: true,
                            type: true,
                            targetValue: true,
                            currentValue: true,
                            unit: true
                        }
                    },
                    project: {
                        select: {
                            id: true,
                            title: true
                        }
                    },
                    task: {
                        select: {
                            id: true,
                            title: true,
                            status: true
                        }
                    },
                    itProject: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    itTask: {
                        select: {
                            id: true,
                            title: true,
                            status: true
                        }
                    },
                    comments: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    email: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    }
                } as any
            });

            if (!workPlan) {
                return createErrorResponse('Work plan not found', 404);
            }

            // Check permissions
            if (['EXECUTIVE'].includes(user.role)) {
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id },
                    select: { id: true }
                });
                if (workPlan.employeeId !== profile?.id) {
                    return createErrorResponse('Forbidden', 403);
                }
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                const employeeProfiles = await prisma.employeeProfile.findMany({
                    where: { userId: { in: downlineIds } },
                    select: { id: true }
                });
                const profileIds = employeeProfiles.map(p => p.id);

                if (!profileIds.includes(workPlan.employeeId)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            return NextResponse.json(workPlan);
        } catch (error: any) {
            console.error('Error fetching work plan:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);

// PUT: Update work plan status/hours
export const PUT = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const body = await req.json();
            const {
                agenda,
                strategy,
                priority,
                estimatedHours,
                actualHours,
                completionStatus,
                linkedGoalId,
                projectId,
                taskId,
                itProjectId,
                itTaskId,
                visibility
            } = body;
            const normalizedVisibility = normalizeWorkPlanVisibility(visibility);

            // Find existing work plan
            const existingPlan = await prisma.workPlan.findUnique({
                where: { id }
            });

            if (!existingPlan) {
                return createErrorResponse('Work plan not found', 404);
            }

            // Check permissions
            if (['EXECUTIVE'].includes(user.role)) {
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id },
                    select: { id: true }
                });
                if (existingPlan.employeeId !== profile?.id) {
                    return createErrorResponse('Forbidden', 403);
                }
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                const employeeProfiles = await prisma.employeeProfile.findMany({
                    where: { userId: { in: downlineIds } },
                    select: { id: true }
                });
                const profileIds = employeeProfiles.map(p => p.id);

                if (!profileIds.includes(existingPlan.employeeId)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            // A manager modifying a SUBORDINATE's plan may only do so BEFORE its execution
            // date (the plan's own day). The owner can still edit past plans (e.g. log actuals).
            const ownProfile = await prisma.employeeProfile.findUnique({
                where: { userId: user.id },
                select: { id: true },
            });
            const isOwnerEdit = !!ownProfile && ownProfile.id === existingPlan.employeeId;
            if (!isOwnerEdit && existingPlan.date < getISTToday()) {
                return createErrorResponse('Cannot modify a plan whose execution date has already passed', 403);
            }

            const updatedPlan = await prisma.workPlan.update({
                where: { id },
                data: {
                    ...(agenda && { agenda }),
                    ...(strategy !== undefined && { strategy }),
                    ...(priority && { priority }),
                    ...(estimatedHours !== undefined && { estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null }),
                    ...(actualHours !== undefined && { actualHours: actualHours ? parseFloat(actualHours) : null }),
                    ...(completionStatus && { completionStatus }),
                    ...(linkedGoalId !== undefined && { linkedGoalId: (linkedGoalId && linkedGoalId !== 'null') ? linkedGoalId : null }),
                    ...(projectId !== undefined && { projectId: (projectId && projectId !== 'null') ? projectId : null }),
                    ...(taskId !== undefined && { taskId: (taskId && taskId !== 'null') ? taskId : null }),
                    ...(itProjectId !== undefined && { itProjectId: (itProjectId && itProjectId !== 'null') ? itProjectId : null }),
                    ...(itTaskId !== undefined && { itTaskId: (itTaskId && itTaskId !== 'null') ? itTaskId : null }),
                    ...(normalizedVisibility && { visibility: normalizedVisibility })
                } as any,
                include: {
                    employee: {
                        select: {
                            user: {
                                select: {
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    },
                    linkedGoal: {
                        select: {
                            title: true,
                            type: true
                        }
                    },
                    project: {
                        select: {
                            title: true
                        }
                    },
                    task: {
                        select: {
                            title: true,
                            status: true
                        }
                    },
                    itProject: {
                        select: {
                            name: true
                        }
                    },
                    itTask: {
                        select: {
                            title: true,
                            status: true
                        }
                    }
                } as any
            });

            // BLOCKED transitions notify the employee's manager (non-fatal).
            try {
                const planOwner = await prisma.employeeProfile.findUnique({
                    where: { id: existingPlan.employeeId },
                    select: { userId: true },
                });
                if (planOwner?.userId) {
                    const metadata = decodeAgendaMetadata(updatedPlan.strategy);
                    await notifyBlockerTransition({
                        previousStatus: existingPlan.completionStatus,
                        nextStatus: updatedPlan.completionStatus,
                        employeeUserId: planOwner.userId,
                        actorUserId: user.id,
                        agenda: updatedPlan.agenda,
                        blockerReason: metadata?.blockerReason,
                        blockerOwner: metadata?.blockerOwner,
                    });
                }
            } catch (notifyErr) {
                console.error('Blocker notification failed (non-fatal):', notifyErr);
            }

            // Manager (cross-user) edit → audit trail + notify + a visible comment for the employee.
            if (!isOwnerEdit) {
                try {
                    const planEmployee = await prisma.employeeProfile.findUnique({
                        where: { id: existingPlan.employeeId },
                        select: { userId: true },
                    });
                    await createAuditLog({
                        userId: user.id,
                        action: 'WORKPLAN_MODIFY',
                        entity: 'WorkPlan',
                        entityId: id,
                        changes: { agenda, strategy, priority, estimatedHours, completionStatus, linkedGoalId, taskId },
                    });
                    await prisma.workPlanComment.create({
                        data: { workPlanId: id, userId: user.id, content: 'Plan adjusted by manager before execution.' },
                    });
                    if (planEmployee?.userId) {
                        await createNotification({
                            userId: planEmployee.userId,
                            title: 'Your work plan was updated',
                            message: `Your plan for ${new Date(existingPlan.date).toLocaleDateString()} was adjusted by ${(user as any).name || 'your manager'}.`,
                            type: 'INFO',
                            link: '/dashboard/staff-portal',
                        });
                    }
                } catch (sideErr) {
                    console.error('Work plan modify side-effect failed (non-fatal):', sideErr);
                }
            }

            return NextResponse.json(updatedPlan);
        } catch (error: any) {
            console.error('Error updating work plan:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);

// DELETE: Delete work plan
export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;

            const existingPlan = await prisma.workPlan.findUnique({
                where: { id }
            });

            if (!existingPlan) {
                return createErrorResponse('Work plan not found', 404);
            }

            // Check permissions
            if (['EXECUTIVE'].includes(user.role)) {
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id },
                    select: { id: true }
                });
                if (existingPlan.employeeId !== profile?.id) {
                    return createErrorResponse('Forbidden', 403);
                }
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                const employeeProfiles = await prisma.employeeProfile.findMany({
                    where: { userId: { in: downlineIds } },
                    select: { id: true }
                });
                const profileIds = employeeProfiles.map(p => p.id);

                if (!profileIds.includes(existingPlan.employeeId)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            await prisma.workPlan.delete({
                where: { id }
            });

            return NextResponse.json({ success: true });
        } catch (error: any) {
            console.error('Error deleting work plan:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);
