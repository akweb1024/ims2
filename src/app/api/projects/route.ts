import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { PROJECT_VIEWER_ROLES, PROJECT_EDITOR_ROLES } from '@/lib/projects-access';

export const GET = authorizedRoute(
    PROJECT_VIEWER_ROLES,
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company association required', 403);

            const { searchParams } = new URL(req.url);
            const status = searchParams.get('status');
            const priority = searchParams.get('priority');
            const mine = searchParams.get('mine') === 'true';

            const where: any = { companyId: user.companyId };
            if (status) where.status = status;
            if (priority) where.priority = priority;

            // Company Projects is a read-open board: every employee can see what their
            // company is working on. It previously narrowed non-admins to projects they
            // were a member of, which — combined with the create form never sending
            // memberIds — meant a UI-created project was visible to nobody but its
            // creator's role. Writes stay restricted (see PROJECT_EDITOR_ROLES below).
            if (mine) {
                where.members = { some: { userId: user.id } };
            }

            const projects = await prisma.project.findMany({
                where,
                include: {
                    manager: { select: { name: true, email: true } },
                    lead: { select: { name: true, email: true } },
                    members: {
                        include: {
                            user: { select: { name: true, email: true, id: true } }
                        }
                    },
                    _count: {
                        select: { tasks: true, issues: true }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });

            return NextResponse.json(projects);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    PROJECT_EDITOR_ROLES,
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company association required', 403);
            const body = await req.json();

            const project = await prisma.project.create({
                data: {
                    companyId: user.companyId,
                    title: body.title,
                    description: body.description,
                    status: body.status || 'PLANNED',
                    priority: body.priority || 'MEDIUM',
                    startDate: new Date(body.startDate),
                    endDate: body.endDate ? new Date(body.endDate) : undefined,
                    managerId: body.managerId || user.id, // Default to creator if not specified
                    leadId: body.leadId,
                    members: {
                        create: (body.memberIds || []).map((id: string) => ({
                            userId: id,
                            role: 'MEMBER'
                        }))
                    }
                }
            });

            return NextResponse.json(project);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
