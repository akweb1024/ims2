import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { employeeGoalSchema } from '@/lib/validators/hr';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');
            const type = searchParams.get('type');

            const where: any = {
                companyId: user.companyId || undefined
            };

            if (employeeId) where.employeeId = employeeId;
            if (type) where.type = type;

            const goals = await prisma.employeeGoal.findMany({
                where,
                include: {
                    employee: {
                        include: {
                            user: {
                                select: { name: true, email: true }
                            }
                        }
                    },
                    kpi: true
                },
                orderBy: { endDate: 'asc' }
            });

            return NextResponse.json(goals);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const result = employeeGoalSchema.safeParse(body);

            if (!result.success) {
                return createErrorResponse(result.error);
            }

            if (!user.companyId) {
                return createErrorResponse('Company association required', 403);
            }

            const goal = await prisma.employeeGoal.create({
                data: {
                    ...result.data,
                    companyId: user.companyId
                }
            });

            return NextResponse.json(goal);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { id, ...data } = body;

            if (!id) return createErrorResponse('Goal ID is required', 400);

            const updated = await prisma.employeeGoal.update({
                where: { id },
                data
            });

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const id = searchParams.get('id');

            if (!id) return createErrorResponse('ID required', 400);

            await prisma.employeeGoal.delete({
                where: { id }
            });

            return NextResponse.json({ message: 'Goal deleted successfully' });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
