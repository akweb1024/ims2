import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { performanceReviewSchema } from '@/lib/validators/hr';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');
            const showAll = searchParams.get('all') === 'true';

            const where: any = {};

            if (showAll && ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
                if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                    const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                    where.employee = { userId: { in: [...subIds, user.id] } };
                } else if (user.companyId) {
                    where.employee = { user: { companyId: user.companyId } };
                }
            } else if (employeeId) {
                // Managers checking specific employee
                if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
                    return createErrorResponse('Forbidden', 403);
                }

                if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                    const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                    const allowedIds = [...subIds, user.id];
                    const targetEmp = await prisma.employeeProfile.findUnique({ where: { id: employeeId }, select: { userId: true } });
                    if (!targetEmp || !allowedIds.includes(targetEmp.userId)) {
                        return createErrorResponse('Forbidden: Not in your team', 403);
                    }
                }

                where.employeeId = employeeId;
                // Also ensure the employee belongs to the company context
                if (user.companyId) {
                    where.employee = { ...where.employee, user: { companyId: user.companyId } };
                }
            } else {
                // Employees checking their own performance
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id }
                });
                if (!profile) return NextResponse.json([]);
                where.employeeId = profile.id;
            }

            const reviews = await prisma.performanceReview.findMany({
                where,
                include: {
                    reviewer: {
                        select: { email: true, role: true, name: true }
                    },
                    employee: {
                        include: { user: { select: { email: true, name: true } } }
                    }
                },
                orderBy: { date: 'desc' }
            });

            return NextResponse.json(reviews);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();

            const validation = performanceReviewSchema.safeParse(body);
            if (!validation.success) {
                return createErrorResponse(validation.error);
            }

            const { employeeId, rating, feedback } = validation.data;

            const targetEmp = await prisma.employeeProfile.findUnique({
                where: { id: employeeId },
                select: { userId: true }
            });

            if (!targetEmp) return createErrorResponse('Employee not found', 404);

            // Access Control: Manager/TL can only review their own team
            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                if (!subIds.includes(targetEmp.userId)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            const review = await prisma.performanceReview.create({
                data: {
                    employeeId,
                    reviewerId: user.id,
                    rating,
                    feedback
                }
            });

            return NextResponse.json(review);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
