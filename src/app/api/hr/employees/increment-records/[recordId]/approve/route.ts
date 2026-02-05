import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { applyApprovedIncrement } from '@/lib/services/salary-service';

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ recordId: string }> }
) {
    try {
        const { recordId } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user || !['HR_MANAGER', 'HR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const record = await prisma.salaryIncrementRecord.findUnique({
            where: { id: recordId },
            include: { employeeProfile: true }
        });

        if (!record) {
            return NextResponse.json({ error: 'Increment record not found' }, { status: 404 });
        }

        if (record.status !== 'RECOMMENDED') {
            return NextResponse.json({ error: 'Only RECOMMENDED increments can be approved' }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Update Record Status
            const updatedRecord = await tx.salaryIncrementRecord.update({
                where: { id: recordId },
                data: {
                    status: 'APPROVED',
                    approvedByUserId: user.id
                }
            });

            // 2. Use Centralized Salary Service to update Profile, Structure, KPIs, etc.
            await applyApprovedIncrement(record, user.id, tx);

            return updatedRecord;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Approval Error:', error);
        return NextResponse.json({ error: 'Failed to approve increment' }, { status: 500 });
    }
}
