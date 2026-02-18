import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company association required', 403);

            const { searchParams } = new URL(req.url);
            const status = searchParams.get('status');
            const priority = searchParams.get('priority');

            const where: any = { companyId: user.companyId };
            if (status) where.status = status;
            if (priority) where.priority = priority;

            // Access Control: Regular users only see projects they are members of
            if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
                where.members = {
                    some: { userId: user.id }
                };
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
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
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
