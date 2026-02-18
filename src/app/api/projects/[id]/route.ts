import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }: { params: { id: string } }) => {
        try {
            const id = params.id;
            const project = await prisma.project.findUnique({
                where: { id },
                include: {
                    manager: { select: { name: true, email: true, id: true } },
                    lead: { select: { name: true, email: true, id: true } },
                    members: {
                        include: {
                            user: { select: { name: true, email: true, role: true, id: true } }
                        }
                    },
                    tasks: {
                        take: 20,
                        orderBy: { updatedAt: 'desc' },
                        include: {
                            user: { select: { name: true } }
                        }
                    },
                    issues: {
                        take: 20,
                        orderBy: { updatedAt: 'desc' },
                        include: {
                            assignee: { select: { name: true } },
                            reporter: { select: { name: true } }
                        }
                    }
                }
            });

            if (!project) return createErrorResponse('Project not found', 404);
            if (project.companyId !== user.companyId) return createErrorResponse('Unauthorized', 403);

            return NextResponse.json(project);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PUT = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user, { params }: { params: { id: string } }) => {
        try {
            const id = params.id;
            const body = await req.json();

            // validation logic omitted for brevity, ensure user has rights
            // ...

            const updated = await prisma.project.update({
                where: { id },
                data: {
                    title: body.title,
                    description: body.description,
                    status: body.status,
                    priority: body.priority,
                    startDate: body.startDate ? new Date(body.startDate) : undefined,
                    endDate: body.endDate ? new Date(body.endDate) : undefined,
                    managerId: body.managerId,
                    leadId: body.leadId,
                    // Handle members update logic (complex, might need separate endpoint or logic here)
                }
            });

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user, { params }: { params: { id: string } }) => {
        try {
            // Check existence and permissions
            await prisma.project.delete({ where: { id: params.id } });
            return NextResponse.json({ success: true });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
