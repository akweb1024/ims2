import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: employeeId } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = user.role;
        const isApprover = ['HR_MANAGER', 'HR', 'ADMIN', 'SUPER_ADMIN'].includes(userRole);
        const isManager = userRole === 'MANAGER' || userRole === 'TEAM_LEADER';

        if (!isApprover && !isManager) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { amount, date, type, reason, designation } = body;

        const employee = await prisma.employeeProfile.findUnique({
            where: { id: employeeId },
            include: { user: true }
        });

        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        const oldSalary = employee.baseSalary || 0;
        const newSalary = parseFloat(amount);
        const incrementAmount = newSalary - oldSalary;
        const percentage = oldSalary > 0 ? (incrementAmount / oldSalary) * 100 : 0;

        const status = isApprover ? 'APPROVED' : 'RECOMMENDED';

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Record
            const record = await tx.salaryIncrementRecord.create({
                data: {
                    employeeProfileId: employee.id,
                    effectiveDate: new Date(date),
                    oldSalary: oldSalary,
                    newSalary: newSalary,
                    incrementAmount: incrementAmount,
                    percentage: parseFloat(percentage.toFixed(2)),
                    type: type || 'INCREMENT',
                    reason: reason,
                    status: status,
                    recommendedByUserId: !isApprover ? user.id : null,
                    approvedByUserId: isApprover ? user.id : null,
                    previousDesignation: employee.designation,
                    newDesignation: designation || employee.designation,
                }
            });

            // 2. Update Profile ONLY if APPROVED
            if (status === 'APPROVED') {
                await tx.employeeProfile.update({
                    where: { id: employee.id },
                    data: {
                        baseSalary: newSalary,
                        designation: designation || undefined,
                        lastIncrementDate: type === 'INCREMENT' ? new Date(date) : undefined,
                        lastIncrementPercentage: type === 'INCREMENT' ? parseFloat(percentage.toFixed(2)) : undefined,
                        lastPromotionDate: type === 'PROMOTION' ? new Date(date) : undefined
                    }
                });
            }

            return record;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Increment Error:', error);
        return NextResponse.json({ error: 'Failed to process increment' }, { status: 500 });
    }
}
