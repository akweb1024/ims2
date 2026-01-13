import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');
            const startDate = searchParams.get('startDate');
            const endDate = searchParams.get('endDate');

            const where: any = {
                companyId: user.companyId
            };

            if (employeeId) {
                where.employeeId = employeeId;
            } else if (user.role === 'EXECUTIVE' || user.role === 'MANAGER' || user.role === 'USER') {
                // Default to current user's plans if no employeeId provided
                const profile = await prisma.employeeProfile.findUnique({ where: { userId: user.id } });
                if (profile) where.employeeId = profile.id;
            }

            if (startDate && endDate) {
                where.date = {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                };
            }

            const plans = await prisma.workPlan.findMany({
                where,
                include: {
                    employee: {
                        include: {
                            user: {
                                select: { name: true, email: true }
                            }
                        }
                    },
                    comments: {
                        include: {
                            user: {
                                select: { name: true, email: true }
                            }
                        },
                        orderBy: { createdAt: 'asc' }
                    }
                },
                orderBy: { date: 'desc' }
            });

            return NextResponse.json(plans);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { date, agenda, strategy, employeeId } = body;

            if (!date || !agenda) {
                return createErrorResponse('Missing required fields', 400);
            }

            let targetEmployeeId = employeeId;
            if (!targetEmployeeId) {
                const profile = await prisma.employeeProfile.findUnique({ where: { userId: user.id } });
                if (!profile) return createErrorResponse('Employee profile not found', 404);
                targetEmployeeId = profile.id;
            }

            const plan = await prisma.workPlan.upsert({
                where: {
                    id: body.id || 'new-id'
                },
                update: {
                    agenda,
                    strategy,
                    status: body.status || 'SHARED'
                },
                create: {
                    employeeId: targetEmployeeId,
                    date: new Date(date),
                    agenda,
                    strategy,
                    status: body.status || 'SHARED',
                    companyId: user.companyId
                }
            });

            return NextResponse.json(plan);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
