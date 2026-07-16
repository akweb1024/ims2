import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { PROJECT_VIEWER_ROLES, PROJECT_EDITOR_ROLES } from '@/lib/projects-access';

export const GET = authorizedRoute(
    PROJECT_VIEWER_ROLES,
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const status = searchParams.get('status');
            const priority = searchParams.get('priority');
            const companyId = searchParams.get('companyId');
            const q = (searchParams.get('q') || '').trim();
            const mine = searchParams.get('mine') === 'true';

            // Company Projects is a GROUP-WIDE board by explicit product decision: every
            // internal user sees every company's projects, so work is visible across the
            // group rather than siloed per company. This is deliberately unlike the rest of
            // the app (see lib/company-scope) — projects are internal initiatives, not
            // financial or HR records. Writes remain owned by the project's own company;
            // see assertOwnsProject in ./[id]/route.ts.
            const where: any = {};
            if (status) where.status = status;
            if (priority) where.priority = priority;
            if (companyId) where.companyId = companyId;   // opt-in filter, not a security gate
            if (mine) where.members = { some: { userId: user.id } };
            if (q) {
                where.OR = [
                    { title: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                ];
            }

            const projects = await prisma.project.findMany({
                where,
                include: {
                    company: { select: { id: true, name: true } },
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
