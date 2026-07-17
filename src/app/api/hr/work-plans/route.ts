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

// The POST handler that lived here accepted an arbitrary employeeId with no
// ownership or role check and upserted on a caller-supplied id — any
// authenticated user could create or overwrite any employee's plan. Its only
// UI consumer (WorkPlanSection) is dead code. Work plans are written through
// /api/work-agenda (scoped + validated); this route stays read-only.
