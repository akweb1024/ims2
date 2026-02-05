import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

// GET: List assignments (by assignee, assigner, status)
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const assigneeId = searchParams.get('assigneeId');
            const assignerId = searchParams.get('assignerId');
            const status = searchParams.get('status');
            const priority = searchParams.get('priority');
            const view = searchParams.get('view'); // 'received' or 'assigned'

            const where: any = {
                companyId: user.companyId || undefined,
            };

            // Role-based filtering
            if (['EXECUTIVE'].includes(user.role)) {
                // Employees see tasks assigned to them
                where.userId = user.id;
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                if (view === 'assigned') {
                    // Tasks assigned by this manager
                    where.assignedById = user.id;
                } else if (assigneeId) {
                    // Check if assignee is in team
                    const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                    if (!downlineIds.includes(assigneeId)) {
                        return createErrorResponse('Forbidden: Not in your team', 403);
                    }
                    where.userId = assigneeId;
                } else {
                    // All tasks for team members
                    const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                    where.userId = { in: downlineIds };
                }
            } else {
                // Admins can filter by assignee or assigner
                if (assigneeId) where.userId = assigneeId;
                if (assignerId) where.assignedById = assignerId;
            }

            if (status) where.status = status;
            if (priority) where.priority = priority;

            const tasks = await prisma.task.findMany({
                where,
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
                },
                orderBy: [
                    { status: 'asc' },
                    { dueDate: 'asc' }
                ]
            });

            return NextResponse.json(tasks);
        } catch (error: any) {
            console.error('Error fetching assignments:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);

// POST: Create work assignment
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const {
                userId,
                title,
                description,
                dueDate,
                priority,
                estimatedEffort,
                relatedCustomerId,
                relatedSubscriptionId
            } = body;

            // Validation
            if (!userId || !title || !dueDate) {
                return createErrorResponse('Missing required fields', 400);
            }

            // Check if user can assign to this employee
            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downlineIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                if (!downlineIds.includes(userId)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            const task = await prisma.task.create({
                data: {
                    userId,
                    assignedById: user.id,
                    title,
                    description,
                    dueDate: new Date(dueDate),
                    priority: priority || 'MEDIUM',
                    status: 'PENDING',
                    estimatedEffort: estimatedEffort ? parseFloat(estimatedEffort) : null,
                    relatedCustomerId,
                    relatedSubscriptionId,
                    companyId: user.companyId || ''
                },
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true,
                            role: true
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

            return NextResponse.json(task);
        } catch (error: any) {
            console.error('Error creating assignment:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);
