import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { canAccessAllCompanies } from '@/lib/company-scope';
import { createNotification } from '@/lib/system-notifications';

const REVIEWER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER', 'TEAM_LEADER'];
const HR_DECIDE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'];

// PATCH: a manager records a recommendation, then HR makes the binding decision.
export const PATCH = authorizedRoute(REVIEWER_ROLES, async (req: NextRequest, user, context) => {
    try {
        const { id } = await context.params;
        const body = await req.json();
        const action = String(body?.action || '').toLowerCase();

        const review = await prisma.confirmationReview.findUnique({
            where: { id },
            include: { employee: { select: { id: true, user: { select: { id: true, companyId: true } } } } },
        });
        if (!review) return createErrorResponse('Review not found', 404);

        // Company + downline scoping.
        const companyId = review.employee.user?.companyId ?? null;
        if (!canAccessAllCompanies(user) && user.companyId && companyId && user.companyId !== companyId) {
            return createErrorResponse('Forbidden: review belongs to another company', 403);
        }
        if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
            const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
            if (![...downline, user.id].includes(review.employee.user?.id ?? '')) {
                return createErrorResponse('Forbidden: employee is outside your team', 403);
            }
        }

        if (action === 'recommend') {
            const recommendation = String(body?.recommendation || '').toUpperCase();
            if (!['CONFIRM', 'EXTEND', 'TERMINATE'].includes(recommendation)) {
                return createErrorResponse('recommendation must be CONFIRM, EXTEND or TERMINATE', 400);
            }
            const updated = await prisma.confirmationReview.update({
                where: { id },
                data: {
                    status: 'RECOMMENDED',
                    managerRecommendation: recommendation,
                    managerNote: body?.note ? String(body.note) : null,
                    recommendedById: user.id,
                    recommendedAt: new Date(),
                },
            });
            return NextResponse.json(updated);
        }

        if (action === 'decide') {
            // The confirmation gate is HR-only — a manager recommends, HR signs off.
            if (!HR_DECIDE_ROLES.includes(user.role)) {
                return createErrorResponse('Only HR can make the final confirmation decision', 403);
            }
            const decision = String(body?.decision || '').toUpperCase();
            if (!['CONFIRMED', 'REJECTED', 'EXTENDED'].includes(decision)) {
                return createErrorResponse('decision must be CONFIRMED, REJECTED or EXTENDED', 400);
            }

            let newProbationEnd: Date | null = null;
            if (decision === 'EXTENDED') {
                if (!body?.newProbationEndDate) {
                    return createErrorResponse('newProbationEndDate is required to extend probation', 400);
                }
                newProbationEnd = new Date(body.newProbationEndDate);
                if (Number.isNaN(newProbationEnd.getTime())) {
                    return createErrorResponse('newProbationEndDate is not a valid date', 400);
                }
            }

            const updated = await prisma.$transaction(async (tx) => {
                const rev = await tx.confirmationReview.update({
                    where: { id },
                    data: {
                        status: decision,
                        hrDecision: decision,
                        hrNote: body?.note ? String(body.note) : null,
                        decidedById: user.id,
                        decidedAt: new Date(),
                        newProbationEndDate: newProbationEnd,
                    },
                });

                if (decision === 'CONFIRMED') {
                    await tx.employeeProfile.update({
                        where: { id: review.employeeId },
                        data: { employmentStatus: 'CONFIRMED' },
                    });
                } else if (decision === 'EXTENDED') {
                    await tx.employeeProfile.update({
                        where: { id: review.employeeId },
                        data: { employmentStatus: 'PROBATION', probationEndDate: newProbationEnd },
                    });
                }
                // REJECTED records the decision only; any termination is a separate,
                // deliberate HR action rather than an automatic account change.

                return rev;
            });

            // Tell the employee when they're confirmed (non-fatal).
            if (decision === 'CONFIRMED' && review.employee.user?.id) {
                try {
                    await createNotification({
                        userId: review.employee.user.id,
                        title: 'Employment Confirmed 🎉',
                        message: 'Your probation review is complete and your employment has been confirmed.',
                        type: 'SUCCESS',
                        channels: ['IN_APP'],
                        category: 'ONBOARDING',
                    });
                } catch (err) {
                    console.error('Failed to notify confirmed employee:', err);
                }
            }

            return NextResponse.json(updated);
        }

        return createErrorResponse('action must be recommend or decide', 400);
    } catch (error) {
        return createErrorResponse(error);
    }
});
