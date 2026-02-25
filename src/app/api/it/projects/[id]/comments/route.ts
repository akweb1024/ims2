import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';
import { createNotification } from '@/lib/system-notifications';

export const dynamic = 'force-dynamic';

// GET /api/it/projects/[id]/comments - Get all comments for a project
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const project = await prisma.iTProject.findUnique({
            where: { id: projectId },
            select: { companyId: true }
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.companyId !== (user as any).companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const comments = await prisma.iTProjectComment.findMany({
            where: { projectId, parentId: null },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        employeeProfile: { select: { profilePicture: true } }
                    }
                },
                replies: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                employeeProfile: { select: { profilePicture: true } }
                            }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(comments);
    } catch (error) {
        console.error('Fetch IT Project Comments Error:', error);
        return createErrorResponse(error);
    }
}

// POST /api/it/projects/[id]/comments - Create a new comment
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { content, parentId } = body;

        if (!content || !content.trim()) {
            return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
        }

        const project = await prisma.iTProject.findUnique({
            where: { id: projectId },
            select: { 
                companyId: true,
                name: true,
                projectManagerId: true,
                teamLeadId: true,
                taggedEmployees: { select: { id: true } }
            }
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.companyId !== (user as any).companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (parentId) {
            // Verify parent comment exists
            const parent = await prisma.iTProjectComment.findUnique({
                where: { id: parentId }
            });
            if (!parent) {
                return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
            }
            if (parent.projectId !== projectId) {
                return NextResponse.json({ error: 'Parent comment belongs to a different project' }, { status: 400 });
            }
            if (parent.parentId) {
                // To keep it 1-level deep, if replying to a reply, make the top parent the parent
                // For now just error or assign to top parent
                // Simplified: we'll just allow it, Prisma schema supports unlimited nesting, but UI usually renders 1 level
            }
        }

        const comment = await prisma.iTProjectComment.create({
            data: {
                content,
                project: { connect: { id: projectId } },
                user: { connect: { id: user.id } },
                parent: parentId ? { connect: { id: parentId } } : undefined
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        employeeProfile: { select: { profilePicture: true } }
                    }
                },
                replies: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                employeeProfile: { select: { profilePicture: true } }
                            }
                        }
                    }
                }
            }
        });

        // Notifications
        const notificationSet = new Set<string>();

        if (project.taggedEmployees) {
            for (const emp of project.taggedEmployees) {
                if (emp.id !== user.id) notificationSet.add(emp.id);
            }
        }
        if (project.projectManagerId && project.projectManagerId !== user.id) notificationSet.add(project.projectManagerId);
        if (project.teamLeadId && project.teamLeadId !== user.id) notificationSet.add(project.teamLeadId);

        for (const recipientId of notificationSet) {
            await createNotification({
                userId: recipientId,
                title: `New Comment on Project: ${project.name}`,
                message: `${(user as any).name || 'A team member'} added a comment: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                type: 'INFO',
                link: `/dashboard/it-management/projects/${projectId}`,
                channels: ['IN_APP', 'EMAIL'] // Notifications through app & email
            });
        }

        return NextResponse.json(comment, { status: 201 });
    } catch (error) {
        console.error('Create IT Project Comment Error:', error);
        return createErrorResponse(error);
    }
}
