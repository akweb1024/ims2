'use server';

import { auth } from '@/lib/nextauth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

interface ProposeIncrementData {
    employeeId: string; // EmployeeProfile ID
    currentSalary: number;
    newSalary: number;
    incrementAmount: number;
    percentage: number;
    effectiveDate: string;
    reason: string;
}

export async function proposeIncrement(data: ProposeIncrementData) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.salaryIncrementRecord.create({
            data: {
                employeeProfileId: data.employeeId,
                date: new Date(),
                effectiveDate: new Date(data.effectiveDate),
                oldSalary: data.currentSalary,
                newSalary: data.newSalary,
                incrementAmount: data.incrementAmount,
                percentage: data.percentage,
                reason: data.reason,
                status: 'DRAFT', // Manager proposals start as DRAFT or PENDING_APPROVAL? usually DRAFT until submitted, but let's say DRAFT for now.
                isDraft: true,
                recommendedByUserId: session.user.id,
                type: 'INCREMENT',
            },
        });

        revalidatePath('/dashboard/manager/team/salary');
        return { success: true };
    } catch (error) {
        console.error('Error proposing increment:', error);
        return { success: false, error: 'Failed to create proposal' };
    }
}
