import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

// Helper function to check if user can manage projects
function canManageProjects(role: string): boolean {
    return ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'].includes(role);
}

// GET /api/it/projects/[id] - Get project details
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const project = await prisma.iTProject.findUnique({
            where: { id: params.id },
            include: {
                projectManager: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        employeeProfile: {
                            select: {
                                designation: true,
                                profilePicture: true,
                            }
                        }
                    }
                },
                teamLead: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        employeeProfile: {
                            select: {
                                designation: true,
                                profilePicture: true,
                            }
                        }
                    }
                },
                tasks: {
                    include: {
                        assignedTo: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                milestones: {
                    orderBy: { dueDate: 'asc' }
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
                    orderBy: { date: 'desc' },
                    take: 50
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
                }
            }
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Check access
        const companyId = (user as any).companyId;
        if (project.companyId !== companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Calculate statistics
        const totalTasks = project.tasks.length;
        const completedTasks = project.tasks.filter(t => t.status === 'COMPLETED').length;
        const inProgressTasks = project.tasks.filter(t => t.status === 'IN_PROGRESS').length;
        const pendingTasks = project.tasks.filter(t => t.status === 'PENDING').length;
        const totalTimeLogged = project.timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
        const billableHours = project.timeEntries.filter(e => e.isBillable).reduce((sum, e) => sum + e.hours, 0);

        const projectWithStats = {
            ...project,
            stats: {
                totalTasks,
                completedTasks,
                inProgressTasks,
                pendingTasks,
                completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
                totalTimeLogged: Math.round(totalTimeLogged * 10) / 10,
                billableHours: Math.round(billableHours * 10) / 10,
                nonBillableHours: Math.round((totalTimeLogged - billableHours) * 10) / 10,
                estimatedVsActual: project.estimatedHours ? Math.round((totalTimeLogged / project.estimatedHours) * 100) : 0,
            }
        };

        return NextResponse.json(projectWithStats);
    } catch (error) {
        console.error('Fetch IT Project Error:', error);
        return createErrorResponse(error);
    }
}

// PATCH /api/it/projects/[id] - Update project
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // Check if project exists and user has access
        const existingProject = await prisma.iTProject.findUnique({
            where: { id: params.id },
            include: { milestones: true }
        });

        if (!existingProject) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const companyId = (user as any).companyId;
        if (existingProject.companyId !== companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Check if user can update (must be project manager, team lead, or IT admin)
        const canUpdate = canManageProjects(user.role) ||
            existingProject.projectManagerId === user.id ||
            existingProject.teamLeadId === user.id;

        if (!canUpdate) {
            return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
        }

        // Prepare update data
        let updateData: any = {};

        try {

            // Only allow certain fields to be updated
            const allowedFields = [
                'name', 'description', 'category', 'type', 'status', 'priority',
                'clientId', 'clientType', 'projectManagerId', 'teamLeadId',
                'startDate', 'endDate', 'estimatedHours', 'actualHours',
                'isRevenueBased', 'estimatedRevenue', 'actualRevenue', 'currency',
                'itDepartmentCut', 'itRevenueEarned', 'billingType', 'hourlyRate',
                'isBilled', 'invoiceId', 'tags', 'attachments'
            ];

            for (const field of allowedFields) {
                if (body[field] !== undefined) {
                    if (field.includes('Date') && body[field]) {
                        updateData[field] = new Date(body[field]);
                    } else if (field.includes('Hours') || field.includes('Revenue') || field.includes('Cut') || field.includes('Rate')) {
                        // Logic fix: Allow 0 value explicitly, handle NaN
                        const val = parseFloat(body[field]?.toString());
                        updateData[field] = isNaN(val) ? null : val;
                    } else if (field === 'projectManagerId') {
                        // For UPDATE with ITProjectUpdateInput, use relation fields
                        if (body[field]) {
                            updateData.projectManager = { connect: { id: body[field] } };
                        } else if (body[field] === null || body[field] === '') {
                            updateData.projectManager = { disconnect: true };
                        }
                        // Don't add projectManagerId to updateData - skip to next field
                        continue;
                    } else if (field === 'teamLeadId') {
                        // For UPDATE with ITProjectUpdateInput, use relation fields
                        if (body[field]) {
                            updateData.teamLead = { connect: { id: body[field] } };
                        } else if (body[field] === null || body[field] === '') {
                            updateData.teamLead = { disconnect: true };
                        }
                        // Don't add teamLeadId to updateData - skip to next field
                        continue;
                    } else {
                        updateData[field] = body[field];
                    }
                }
            }

            // Calculate IT revenue if actualRevenue or itDepartmentCut is updated
            const revenue = updateData.actualRevenue !== undefined ? updateData.actualRevenue : existingProject.actualRevenue;
            const cut = updateData.itDepartmentCut !== undefined ? updateData.itDepartmentCut : existingProject.itDepartmentCut;

            if (updateData.actualRevenue !== undefined || updateData.itDepartmentCut !== undefined) {
                updateData.itRevenueEarned = (revenue * cut) / 100;
            }

            // Set completedAt if status changed to COMPLETED
            if (updateData.status === 'COMPLETED' && existingProject.status !== 'COMPLETED') {
                updateData.completedAt = new Date();
            } else if (updateData.status && updateData.status !== 'COMPLETED' && existingProject.status === 'COMPLETED') {
                updateData.completedAt = null;
            }

            // Handle milestones if provided
            const milestoneOperations: any = {};
            if (body.milestones && Array.isArray(body.milestones)) {
                const incomingIds = body.milestones.filter((m: any) => m.id).map((m: any) => m.id);
                const toDelete = existingProject.milestones.filter(m => !incomingIds.includes(m.id)).map(m => m.id);

                const toCreate = body.milestones.filter((m: any) => !m.id).map((m: any) => ({
                    name: m.title || m.name, // Handle both title from UI and name from schema
                    description: m.description,
                    dueDate: m.dueDate ? new Date(m.dueDate) : new Date(),
                    status: m.status || 'PENDING'
                }));

                const toUpdate = body.milestones.filter((m: any) => m.id).map((m: any) => ({
                    where: { id: m.id },
                    data: {
                        name: m.title || m.name,
                        description: m.description,
                        dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
                        status: m.status
                    }
                }));

                updateData.milestones = {
                    deleteMany: toDelete.length > 0 ? { id: { in: toDelete } } : undefined,
                    create: toCreate.length > 0 ? toCreate : undefined,
                    update: toUpdate.length > 0 ? toUpdate : undefined
                };

                // Cleanup undefined keys
                if (!updateData.milestones.deleteMany) delete updateData.milestones.deleteMany;
                if (!updateData.milestones.create) delete updateData.milestones.create;
                if (!updateData.milestones.update) delete updateData.milestones.update;
                if (Object.keys(updateData.milestones).length === 0) delete updateData.milestones;
            }

            const project = await prisma.iTProject.update({
                where: { id: params.id },
                data: updateData,
                include: {
                    projectManager: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    },
                    teamLead: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    },
                    milestones: true
                }
            });

            return NextResponse.json(project);
        } catch (error) {
            console.error('Update IT Project Error:', error);
            // Log the update data for debugging
            console.error('Update data that caused error:', JSON.stringify(updateData, null, 2));
            return createErrorResponse(error);
        }
    } catch (error) {
        console.error('PATCH IT Project Error:', error);
        return createErrorResponse(error);
    }
}

// DELETE /api/it/projects/[id] - Delete project
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!canManageProjects(user.role)) {
            return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }

        const project = await prisma.iTProject.findUnique({
            where: { id: params.id }
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const companyId = (user as any).companyId;
        if (project.companyId !== companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.iTProject.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Delete IT Project Error:', error);
        return createErrorResponse(error);
    }
}
