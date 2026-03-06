import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, AuthorizationError, ValidationError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { itTaskSchema } from '@/lib/validation/schemas';
import { getDownlineUserIds } from '@/lib/hierarchy';

export const dynamic = 'force-dynamic';

const IT_MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN', 'IT_SUPPORT', 'MANAGER'];
const ALL_ACCESS_ROLES = ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'];

// GET /api/it/tasks - List tasks based on user role and view type
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN', 'IT_SUPPORT', 'MANAGER', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
        try {
            const companyId = user.companyId;
            if (!companyId) throw new ValidationError('Company context is required');

            const { searchParams } = new URL(req.url);
            const view = searchParams.get('view') || 'my';
            const status = searchParams.get('status');
            const type = searchParams.get('type');
            const priority = searchParams.get('priority');
            const isRevenueBased = searchParams.get('isRevenueBased');
            const projectId = searchParams.get('projectId');

            const where: any = { companyId };

            if (view === 'all') {
                if (!ALL_ACCESS_ROLES.includes(user.role)) {
                    throw new AuthorizationError('Forbidden: Admin access required for "all" view');
                }
            } else if (view === 'team') {
                if (!IT_MANAGER_ROLES.includes(user.role)) {
                    throw new AuthorizationError('Forbidden: Manager access required for "team" view');
                }

                // Use full recursive downline (cross-company) instead of just direct reports
                const downlineIds = await getDownlineUserIds(user.id, null);
                const teamIds = [...new Set([user.id, ...downlineIds])];

                where.OR = [
                    { assignedToId: { in: teamIds } },
                    { createdById: user.id },
                    { reporterId: user.id },
                    { project: { visibility: 'PUBLIC' } }
                ];
            } else {
                // view === 'my'
                where.OR = [
                    { assignedToId: user.id },
                    { createdById: user.id },
                    { reporterId: user.id },
                    { project: { visibility: 'PUBLIC' } }
                ];
            }

            if (status) where.status = status;
            if (type) where.type = type;
            if (priority) where.priority = priority;
            if (isRevenueBased !== null) where.isRevenueBased = isRevenueBased === 'true';
            if (projectId) where.projectId = projectId;

            const tasks = await prisma.iTTask.findMany({
                where,
                include: {
                    project: { select: { id: true, name: true, projectCode: true } },
                    assignedTo: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            employeeProfile: { select: { profilePicture: true } }
                        }
                    },
                    createdBy: { select: { id: true, name: true, email: true } },
                    reporter: { select: { id: true, name: true, email: true } },
                    _count: { select: { comments: true, timeEntries: true } }
                },
                orderBy: [
                    { priority: 'desc' },
                    { createdAt: 'desc' }
                ]
            });

            return NextResponse.json(tasks);
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);

// POST /api/it/tasks - Create new task
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN', 'IT_SUPPORT', 'MANAGER', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
        try {
            const companyId = user.companyId;
            if (!companyId) throw new ValidationError('Company context is required');

            const body = await req.json();
            const validatedData = itTaskSchema.parse(body);

            // Access control for specific types if needed
            if (validatedData.type === 'SERVICE_REQUEST' && user.role === 'EXECUTIVE') {
                // Executives can create service requests
            } else if (!IT_MANAGER_ROLES.includes(user.role)) {
                 // Non-IT managers might have restricted task creation but let's follow existing logic which allowed it
            }

            // Auto-set 100% IT cut for service requests
            const effectiveItCut = validatedData.type === 'SERVICE_REQUEST' ? 100 : (!isNaN(parseFloat(validatedData.itDepartmentCut?.toString() || '0')) 
                ? parseFloat(validatedData.itDepartmentCut!.toString()) : 0);

            // Auto-calculate Due Date based on Service SLA if not provided
            let calculatedDueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null;
            if (validatedData.serviceId && !calculatedDueDate) {
                const serviceDef = await prisma.iTServiceDefinition.findUnique({
                    where: { id: validatedData.serviceId }
                });
                if (serviceDef?.estimatedDays) {
                    calculatedDueDate = new Date();
                    calculatedDueDate.setDate(calculatedDueDate.getDate() + serviceDef.estimatedDays);
                }
            }

            const taskCount = await prisma.iTTask.count({ where: { companyId } });
            const taskCode = `TSK-${new Date().getFullYear()}-${String(taskCount + 1).padStart(5, '0')}`;

            const task = await prisma.iTTask.create({
                data: {
                    company: { connect: { id: companyId } },
                    project: validatedData.projectId ? { connect: { id: validatedData.projectId } } : undefined,
                    taskCode,
                    title: validatedData.title,
                    description: validatedData.description,
                    category: validatedData.category,
                    type: validatedData.type,
                    priority: validatedData.priority,
                    status: validatedData.status,
                    progressPercent: !isNaN(parseInt(validatedData.progressPercent?.toString() || '0')) 
                        ? parseInt(validatedData.progressPercent!.toString()) : 0,
                    assignedTo: validatedData.assignedToId ? { connect: { id: validatedData.assignedToId } } : undefined,
                    createdBy: { connect: { id: user.id } },
                    reporter: validatedData.reporterId ? { connect: { id: validatedData.reporterId } } : undefined,
                    startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
                    dueDate: calculatedDueDate,
                    estimatedHours: validatedData.estimatedHours ? parseFloat(validatedData.estimatedHours.toString()) : null,
                    isRevenueBased: validatedData.isRevenueBased,
                    estimatedValue: !isNaN(parseFloat(validatedData.estimatedValue?.toString() || '0')) 
                        ? parseFloat(validatedData.estimatedValue!.toString()) : 0,
                    currency: validatedData.currency,
                    itDepartmentCut: effectiveItCut as any,
                    tags: validatedData.tags,
                    dependencies: validatedData.dependencies,
                    service: validatedData.serviceId ? { connect: { id: validatedData.serviceId } } : undefined,
                },
                include: {
                    project: { select: { id: true, name: true, projectCode: true } },
                    assignedTo: { select: { id: true, name: true, email: true } },
                    createdBy: { select: { id: true, name: true, email: true } },
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

            logger.info('IT task created successfully', {
                taskId: task.id,
                taskCode,
                createdBy: user.id
            });

            return NextResponse.json(task, { status: 201 });
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);

