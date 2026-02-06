
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { sendEmail, EmailTemplates } from '@/lib/email';

// POST submit an evaluation for a goal
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { goalId, score, feedback } = body;

            if (!goalId || score === undefined) {
                return NextResponse.json({ error: 'Goal ID and score are required' }, { status: 400 });
            }

            const goal = await prisma.employeeGoal.findUnique({
                where: { id: goalId },
                include: {
                    employee: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    }
                }
            });

            if (!goal) {
                return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
            }

            const evaluation = await (prisma as any).goalEvaluation.create({
                data: {
                    goalId,
                    evaluatorId: user.id,
                    score: parseFloat(score),
                    feedback
                }
            });

            // Update goal status to REVIEWED when evaluated
            await prisma.employeeGoal.update({
                where: { id: goalId },
                data: { status: 'REVIEWED' }
            });

            // Trigger Notification
            if (goal.employee?.user?.email) {
                const template = EmailTemplates.goalEvaluated(
                    goal.employee.user.name || 'Employee',
                    goal.title,
                    parseFloat(score),
                    feedback
                );
                await sendEmail({
                    to: goal.employee.user.email,
                    ...template
                });
            }

            logger.info(`Evaluation submitted for goal ${goalId} by ${user.email}`);
            return NextResponse.json(evaluation);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
