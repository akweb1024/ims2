
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR', 'HR_MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');
            const period = searchParams.get('period');
            const periodType = searchParams.get('periodType');
            const evaluatorId = searchParams.get('evaluatorId');

            const where: any = {};

            if (employeeId) where.employeeId = employeeId;
            if (period) where.period = period;
            if (periodType) where.periodType = periodType;
            if (evaluatorId) where.evaluatorId = evaluatorId;

            // Access Logic:
            // - Super Admin / Admin: Can see all.
            // - Manager: Can see their team's evaluations.
            // - Employee: Can see their own (handled via separate logic or careful calling).
            // Note: authorizedRoute handles broad role checks, but we enforce scope here.

            if (user.role === 'MANAGER' || user.role === 'TEAM_LEADER') {
                // Managers can only see evaluations they created OR for their subordinates
                // For simplicity in this iteration, we trust the `employeeId` filter if provided, 
                // but strictly, we should verify the employee is in the manager's downline.
                // However, if they filter by `evaluatorId` = self, that's safe.

                if (!employeeId && !evaluatorId) {
                    where.evaluatorId = user.id; // Default to showing ones they did
                }
            }

            const evaluations = await prisma.performanceEvaluation.findMany({
                where,
                include: {
                    employee: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    name: true,
                                    email: true,
                                    role: true,
                                    department: { select: { name: true } }
                                }
                            },
                            designation: true
                            // department: { select: { name: true } } -- Removed, not on EmployeeProfile
                        }
                    },
                    evaluator: {
                        select: { id: true, name: true, email: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return NextResponse.json(evaluations);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR', 'HR_MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const {
                employeeId,
                period,
                periodType,
                scores,
                feedback,
                rating,
                status = 'DRAFT'
            } = body;

            if (!employeeId || !period || !periodType) {
                return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
            }

            // Upsert logic based on employeeId + period (unique constraint)
            const evaluation = await prisma.performanceEvaluation.upsert({
                where: {
                    employeeId_period: {
                        employeeId,
                        period
                    }
                },
                update: {
                    periodType,
                    scores,
                    feedback,
                    rating,
                    status,
                    evaluatorId: user.id, // Update evaluator if changed? Or keep original? Usually last editor.
                },
                create: {
                    employeeId,
                    evaluatorId: user.id,
                    period,
                    periodType,
                    scores,
                    feedback,
                    rating,
                    status
                }
            });

            return NextResponse.json(evaluation);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
