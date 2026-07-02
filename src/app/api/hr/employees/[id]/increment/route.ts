import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// POST: RECOMMEND a salary increment for an employee.
// Accepts EITHER a fixed new salary (`amount`) OR an increment `percentage`.
// Always creates a RECOMMENDED record — it never touches the employee profile.
// Applying to the profile happens ONLY on approval
// (increment-records/[recordId]/approve → applyApprovedIncrement), so there is a
// single apply path and no one self-applies a raw baseSalary change.
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id: employeeId } = await params;
            const body = await req.json();
            const { amount, percentage, date, type, reason, designation } = body;

            const employee = await prisma.employeeProfile.findUnique({
                where: { id: employeeId },
                include: { user: true },
            });
            if (!employee) return createErrorResponse('Employee not found', 404);

            // Managers / TLs can only recommend for their own downline.
            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const { getDownlineUserIds } = await import('@/lib/hierarchy');
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                if (!subIds.includes(employee.userId)) {
                    return createErrorResponse('You can only recommend increments for your team', 403);
                }
            }

            const oldSalary = employee.baseSalary || 0;
            const pct = percentage !== undefined && percentage !== null && percentage !== ''
                ? parseFloat(String(percentage))
                : null;
            const newSalary = pct != null && pct > 0
                ? Math.round(oldSalary * (1 + pct / 100))
                : parseFloat(String(amount));

            if (!newSalary || Number.isNaN(newSalary) || newSalary <= 0) {
                return createErrorResponse('Provide a valid new salary or a positive increment percentage', 400);
            }

            const incrementAmount = newSalary - oldSalary;
            const computedPct = oldSalary > 0 ? (incrementAmount / oldSalary) * 100 : 0;

            const record = await prisma.salaryIncrementRecord.create({
                data: {
                    employeeProfileId: employee.id,
                    effectiveDate: date ? new Date(date) : new Date(),
                    oldSalary,
                    newSalary,
                    incrementAmount,
                    percentage: parseFloat(computedPct.toFixed(2)),
                    type: type || 'INCREMENT',
                    reason,
                    status: 'RECOMMENDED',
                    recommendedByUserId: user.id,
                    previousDesignation: employee.designation,
                    newDesignation: designation || employee.designation,
                },
            });

            return NextResponse.json(record);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
