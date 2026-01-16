import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'HR_MANAGER' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { amount, date, type, reason, designation } = body; // amount is the NEW salary

        const employee = await prisma.employeeProfile.findUnique({
            where: { id: params.id },
            include: { user: true }
        });

        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        const oldSalary = employee.baseSalary || 0;
        const newSalary = parseFloat(amount);
        const incrementAmount = newSalary - oldSalary;
        const percentage = oldSalary > 0 ? (incrementAmount / oldSalary) * 100 : 0;

        // Transaction to update profile and create history record
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
                    approvedByUserId: user.id,
                    previousDesignation: employee.designation,
                    newDesignation: designation || employee.designation,
                }
            });

            // 2. Update Profile
            await tx.employeeProfile.update({
                where: { id: employee.id },
                data: {
                    baseSalary: newSalary,
                    designation: designation || undefined, // Update designation if provided (Promotion)
                    lastIncrementDate: type === 'INCREMENT' ? new Date(date) : undefined,
                    lastIncrementPercentage: type === 'INCREMENT' ? parseFloat(percentage.toFixed(2)) : undefined,
                    lastPromotionDate: type === 'PROMOTION' ? new Date(date) : undefined
                    // Note: If designation is updated, we assume it's a promotion or related change
                }
            });

            return record;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Increment Error:', error);
        return NextResponse.json({ error: 'Failed to process increment' }, { status: 500 });
    }
}
