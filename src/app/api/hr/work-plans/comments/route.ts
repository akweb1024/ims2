import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { workPlanId, content } = body;

            if (!workPlanId || !content) {
                return createErrorResponse('Missing required fields', 400);
            }

            const comment = await prisma.workPlanComment.create({
                data: {
                    workPlanId,
                    userId: user.id,
                    content
                },
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                }
            });

            // Trigger notification to employee
            const plan = await prisma.workPlan.findUnique({
                where: { id: workPlanId },
                include: { employee: true }
            });

            if (plan && plan.employee.userId !== user.id) {
                await prisma.notification.create({
                    data: {
                        userId: plan.employee.userId,
                        title: 'New Comment on Work Plan',
                        message: `${user.email} commented on your plan for ${new Date(plan.date).toLocaleDateString()}`,
                        type: 'INFO'
                    }
                });
            }

            return NextResponse.json(comment);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
