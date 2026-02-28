import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

// Helper function to check if user can view all tasks
function canViewAllTasks(role: string): boolean {
    return ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'].includes(role);
}

// Helper function to check if user is a manager
function isManager(role: string): boolean {
    return ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN', 'MANAGER'].includes(role);
}

// GET /api/it/tasks - List tasks based on user role and view type
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
        const status = searchParams.get('status');
        const type = searchParams.get('type');
        const priority = searchParams.get('priority');
        const isRevenueBased = searchParams.get('isRevenueBased');
        const projectId = searchParams.get('projectId');

        // Build where clause based on view type and user role
        const where: any = { companyId };

        if (view === 'all') {
            // Only IT admins can view all tasks
            if (!canViewAllTasks(user.role)) {
                return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
            }
            // No additional filters needed for all tasks
        } else if (view === 'team') {
            // Managers can view their team's tasks
            if (!isManager(user.role)) {
                return NextResponse.json({ error: 'Forbidden - Manager access required' }, { status: 403 });
            }

            // Get subordinates
            const subordinates = await prisma.user.findMany({
                where: { managerId: user.id },
                select: { id: true }
            });

            const subordinateIds = subordinates.map(s => s.id);
            where.OR = [
                { assignedToId: user.id },
                { assignedToId: { in: subordinateIds } },
                { createdById: user.id },
                { project: { visibility: 'PUBLIC' } }
            ];
        } else {
            // Default: my tasks
            where.OR = [
                { assignedToId: user.id },
                { createdById: user.id },
                { reporterId: user.id },
                { project: { visibility: 'PUBLIC' } }
            ];
        }

        // Apply filters
        if (status) where.status = status;
        if (type) where.type = type;
        if (priority) where.priority = priority;
        if (isRevenueBased !== null) where.isRevenueBased = isRevenueBased === 'true';
        if (projectId) where.projectId = projectId;

        const tasks = await prisma.iTTask.findMany({
            where,
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
                        employeeProfile: {
                            select: {
                                profilePicture: true,
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
                _count: {
                    select: {
                        comments: true,
                        timeEntries: true,
                    }
                }
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        return NextResponse.json(tasks);
    } catch (error) {
        console.error('Fetch IT Tasks Error:', error);
        return createErrorResponse(error);
    }
}

// POST /api/it/tasks - Create new task
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
            title,
            description,
            category,
            type,
            priority,
            status,
            assignedToId,
            reporterId,
            startDate,
            dueDate,
            estimatedHours,
            isRevenueBased,
            estimatedValue,
            currency,
            itDepartmentCut,
            tags,
            dependencies,
            serviceId,
        } = body;

        // Auto-set 100% IT cut for service requests
        const effectiveItCut = type === 'SERVICE_REQUEST' ? 100 : (!isNaN(parseFloat(itDepartmentCut)) ? parseFloat(itDepartmentCut) : 0);

        // Auto-calculate Due Date based on Service SLA if not provided
        let calculatedDueDate = dueDate ? new Date(dueDate) : null;
        if (serviceId && !calculatedDueDate) {
            const serviceDef = await prisma.iTServiceDefinition.findUnique({
                where: { id: serviceId }
            });
            if (serviceDef?.estimatedDays) {
                calculatedDueDate = new Date();
                calculatedDueDate.setDate(calculatedDueDate.getDate() + serviceDef.estimatedDays);
            }
        }

        // Validate required fields
        if (!title) {
            return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
        }

        // Generate unique task code
        const taskCount = await prisma.iTTask.count({ where: { companyId } });
        const taskCode = `TSK-${new Date().getFullYear()}-${String(taskCount + 1).padStart(5, '0')}`;

        // Create task
        const task = await prisma.iTTask.create({
            data: {
                company: { connect: { id: companyId } },
                project: projectId ? { connect: { id: projectId } } : undefined,
                taskCode,
                title,
                description,
                category: category || 'GENERAL',
                type: type || 'SUPPORT',
                priority: priority || 'MEDIUM',
                status: status || 'PENDING',
                progressPercent: !isNaN(parseInt(body.progressPercent)) ? parseInt(body.progressPercent) : 0,
                assignedTo: assignedToId ? { connect: { id: assignedToId } } : undefined,
                createdBy: { connect: { id: user.id } },
                reporter: reporterId ? { connect: { id: reporterId } } : undefined,
                startDate: startDate ? new Date(startDate) : null,
                dueDate: calculatedDueDate,
                estimatedHours: !isNaN(parseFloat(estimatedHours)) ? parseFloat(estimatedHours) : null,
                isRevenueBased: isRevenueBased || false,
                estimatedValue: !isNaN(parseFloat(estimatedValue)) ? parseFloat(estimatedValue) : 0,
                itRevenueEarned: !isNaN(parseFloat(body.itRevenueEarned)) ? parseFloat(body.itRevenueEarned) : 0,
                isPaid: body.isPaid || false,
                currency: currency || 'INR',
                itDepartmentCut: effectiveItCut,
                tags: tags || [],
                dependencies: dependencies || [],
                service: serviceId ? { connect: { id: serviceId } } : undefined,
            },
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

        // Create initial status history entry
        await prisma.iTTaskStatusHistory.create({
            data: {
                taskId: task.id,
                changedById: user.id,
                previousStatus: 'PENDING',
                newStatus: task.status,
                comment: 'Task created',
            }
        });

        return NextResponse.json(task, { status: 201 });
    } catch (error) {
        console.error('Create IT Task Error:', error);
        return createErrorResponse(error);
    }
}
