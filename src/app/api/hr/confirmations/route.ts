import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { canAccessAllCompanies } from '@/lib/company-scope';
import { buildKraSnapshot, effectiveProbationEnd, OPEN_REVIEW_STATUSES } from '@/lib/hr/confirmation';

const REVIEWER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER', 'TEAM_LEADER'];

const employeeSelect = {
    id: true,
    designation: true,
    dateOfJoining: true,
    probationEndDate: true,
    employmentStatus: true,
    user: { select: { id: true, name: true, email: true, companyId: true, managerId: true } },
} as const;

// Restrict a where-clause to the employees the caller may see: their company
// (unless all-company clearance), and for managers/TLs only their downline.
async function scopeEmployeeWhere(user: any) {
    const employee: any = {};
    if (!canAccessAllCompanies(user) && user.companyId) {
        employee.user = { companyId: user.companyId };
    }
    if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
        const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
        employee.user = { ...(employee.user || {}), id: { in: [user.id, ...downline] } };
    }
    return employee;
}

export const GET = authorizedRoute(REVIEWER_ROLES, async (req: NextRequest, user) => {
    try {
        const status = new URL(req.url).searchParams.get('status');
        const employeeWhere = await scopeEmployeeWhere(user);

        const where: any = { employee: employeeWhere };
        if (status) where.status = status.toUpperCase();

        const reviews = await prisma.confirmationReview.findMany({
            where,
            include: { employee: { select: employeeSelect } },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });

        return NextResponse.json(reviews);
    } catch (error) {
        return createErrorResponse(error);
    }
});

// Manually open a confirmation review (the cron opens them automatically too).
export const POST = authorizedRoute(REVIEWER_ROLES, async (req: NextRequest, user) => {
    try {
        const { employeeId } = await req.json();
        if (!employeeId) return createErrorResponse('employeeId is required', 400);

        const employeeWhere = await scopeEmployeeWhere(user);
        const employee = await prisma.employeeProfile.findFirst({
            where: { id: employeeId, ...employeeWhere },
            select: { id: true, employmentStatus: true, dateOfJoining: true, probationEndDate: true },
        });
        if (!employee) return createErrorResponse('Employee not found or outside your scope', 404);
        if (employee.employmentStatus === 'CONFIRMED') {
            return createErrorResponse('Employee is already confirmed', 400);
        }

        // One open review at a time — don't stack duplicates.
        const existing = await prisma.confirmationReview.findFirst({
            where: { employeeId, status: { in: OPEN_REVIEW_STATUSES } },
            select: { id: true },
        });
        if (existing) return NextResponse.json({ alreadyOpen: true, id: existing.id });

        const review = await prisma.confirmationReview.create({
            data: {
                employeeId,
                status: 'PENDING',
                probationEndDate: effectiveProbationEnd(employee),
                kraSnapshot: await buildKraSnapshot(employeeId),
            },
        });

        return NextResponse.json(review);
    } catch (error) {
        return createErrorResponse(error);
    }
});
