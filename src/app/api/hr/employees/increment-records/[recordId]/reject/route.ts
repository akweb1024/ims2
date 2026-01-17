import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function POST(
    req: NextRequest,
    { params }: { params: { recordId: string } }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const recordId = params.recordId;

        const record = await prisma.salaryIncrementRecord.findUnique({
            where: { id: recordId }
        });

        if (!record) {
            return NextResponse.json({ error: 'Increment record not found' }, { status: 404 });
        }

        if (record.status !== 'RECOMMENDED') {
            return NextResponse.json({ error: 'Only RECOMMENDED increments can be rejected' }, { status: 400 });
        }

        const updatedRecord = await prisma.salaryIncrementRecord.update({
            where: { id: recordId },
            data: {
                status: 'REJECTED',
                approvedByUserId: user.id // Log who rejected it
            }
        });

        return NextResponse.json(updatedRecord);
    } catch (error) {
        console.error('Rejection Error:', error);
        return NextResponse.json({ error: 'Failed to reject increment' }, { status: 500 });
    }
}
