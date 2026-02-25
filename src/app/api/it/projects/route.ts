import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';
import { createNotification } from '@/lib/system-notifications';

export const dynamic = 'force-dynamic';

// Helper function to check if user has IT management access
function hasITAccess(role: string): boolean {
    return ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN', 'IT_SUPPORT', 'MANAGER'].includes(role);
}

// Helper function to check if user can view all projects
function canViewAllProjects(role: string): boolean {
    return ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'].includes(role);
}

// GET /api/it/projects - List all projects (filtered by role)
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
        const status = searchParams.get('status');
        const type = searchParams.get('type');
        const isRevenueBased = searchParams.get('isRevenueBased');

        // Build where clause based on user role
        const where: any = { companyId };

        // If not admin/IT manager, only show projects where user is involved
        if (!canViewAllProjects(user.role)) {
            where.OR = [
                { projectManagerId: user.id },
                { teamLeadId: user.id },
                { tasks: { some: { assignedToId: user.id } } }
            ];
        }

        // Apply filters
        if (status) where.status = status;
        if (type) where.type = type;
        if (isRevenueBased !== null) where.isRevenueBased = isRevenueBased === 'true';

        const projects = await prisma.iTProject.findMany({
            where,
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
                tasks: {
                    select: {
                        id: true,
                        status: true,
                    }
                },
                _count: {
                    select: {
                        tasks: true,
                        milestones: true,
                        timeEntries: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate task statistics for each project
        const projectsWithStats = projects.map(project => {
            const totalTasks = project.tasks.length;
            const completedTasks = project.tasks.filter(t => t.status === 'COMPLETED').length;
            const inProgressTasks = project.tasks.filter(t => t.status === 'IN_PROGRESS').length;
            const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

            return {
                ...project,
                stats: {
                    totalTasks,
                    completedTasks,
                    inProgressTasks,
                    completionRate: Math.round(completionRate),
                }
            };
        });

        return NextResponse.json(projectsWithStats);
    } catch (error) {
        console.error('Fetch IT Projects Error:', error);
        return createErrorResponse(error);
    }
}

// POST /api/it/projects - Create new project
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!hasITAccess(user.role)) {
            return NextResponse.json({ error: 'Forbidden - IT access required' }, { status: 403 });
        }

        const companyId = (user as any).companyId;
        if (!companyId) {
            return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        }

        const body = await req.json();
        const {
            name,
            description,
            about,
            details,
            category,
            type,
            status,
            priority,
            clientId,
            clientType,
            projectManagerId,
            teamLeadId,
            startDate,
            endDate,
            estimatedHours,
            isRevenueBased,
            estimatedRevenue,
            currency,
            itDepartmentCut,
            billingType,
            hourlyRate,
            tags,
            keywords,
            departmentId,
            websiteId,
            taggedEmployeeIds,
        } = body;

        // Validate required fields
        if (!name) {
            return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
        }

        // Generate unique project code
        const projectCount = await prisma.iTProject.count({ where: { companyId } });
        const projectCode = `PRJ-${new Date().getFullYear()}-${String(projectCount + 1).padStart(4, '0')}`;

        // Create project
        const project = await prisma.iTProject.create({
            data: {
                company: { connect: { id: companyId } },
                projectCode,
                name,
                description,
                about,
                details,
                category: category || 'DEVELOPMENT',
                type: type || 'SUPPORT',
                status: status || 'PLANNING',
                priority: priority || 'MEDIUM',
                clientId,
                clientType,
                projectManager: projectManagerId ? { connect: { id: projectManagerId } } : undefined,
                teamLead: teamLeadId ? { connect: { id: teamLeadId } } : undefined,
                department: departmentId ? { connect: { id: departmentId } } : undefined,
                website: websiteId ? { connect: { id: websiteId } } : undefined,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
                isRevenueBased: isRevenueBased || false,
                estimatedRevenue: !isNaN(parseFloat(estimatedRevenue)) ? parseFloat(estimatedRevenue) : 0,
                currency: currency || 'INR',
                itDepartmentCut: !isNaN(parseFloat(itDepartmentCut)) ? parseFloat(itDepartmentCut) : 0,
                billingType,
                hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
                tags: tags || [],
                keywords: keywords || [],
                taggedEmployees: taggedEmployeeIds && Array.isArray(taggedEmployeeIds) ? {
                    connect: taggedEmployeeIds.map((id: string) => ({ id }))
                } : undefined,
                milestones: body.milestones && Array.isArray(body.milestones) ? {
                    create: body.milestones.map((m: any) => ({
                        name: m.title || m.name,
                        description: m.description,
                        dueDate: m.dueDate ? new Date(m.dueDate) : new Date(),
                        status: m.status || 'PENDING'
                    }))
                } : undefined
            },
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
                department: { select: { id: true, name: true } },
                website: { select: { id: true, name: true } },
                taggedEmployees: { select: { id: true, name: true, email: true } },
            }
        });

        // Notifications
        const notificationSet = new Set<string>();

        if (taggedEmployeeIds && Array.isArray(taggedEmployeeIds)) {
            for (const empId of taggedEmployeeIds) {
                if (empId !== user.id) notificationSet.add(empId);
            }
        }
        if (projectManagerId && projectManagerId !== user.id) notificationSet.add(projectManagerId);
        if (teamLeadId && teamLeadId !== user.id) notificationSet.add(teamLeadId);

        for (const recipientId of notificationSet) {
            await createNotification({
                userId: recipientId,
                title: `You were tagged in a new Project: ${projectCode}`,
                message: `You have been added as a participant to the project "${name}".`,
                type: 'INFO',
                link: `/dashboard/it-management/projects/${project.id}`,
                channels: ['IN_APP', 'EMAIL'] // The user wanted email/sns/etc.
            });
        }

        return NextResponse.json(project, { status: 201 });
    } catch (error) {
        console.error('Create IT Project Error:', error);
        return createErrorResponse(error);
    }
}
