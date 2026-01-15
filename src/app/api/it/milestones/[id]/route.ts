import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';

// PATCH /api/it/milestones/[id] - Update a milestone
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const milestoneId = params.id;
        const body = await req.json();

        // Get current state to check if we need to update revenue
        const currentMilestone = await (prisma as any).iTProjectMilestone.findUnique({
            where: { id: milestoneId },
            select: { isPaid: true, paymentAmount: true, projectId: true }
        });

        if (!currentMilestone) {
            return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
        }

        const data: any = {};
        if (body.name) data.name = body.name;
        if (body.description !== undefined) data.description = body.description;
        if (body.dueDate) data.dueDate = new Date(body.dueDate);
        if (body.status) {
            data.status = body.status;
            if (body.status === 'COMPLETED') {
                data.completedAt = new Date();
            } else {
                data.completedAt = null;
            }
        }
        if (body.paymentAmount !== undefined) data.paymentAmount = body.paymentAmount;
        if (body.isPaid !== undefined) data.isPaid = body.isPaid;

        const updated = await (prisma as any).iTProjectMilestone.update({
            where: { id: milestoneId },
            data
        });

        // Trigger project revenue updates ONLY if milestone is marked paid NOW and wasn't paid before
        if (body.isPaid === true && currentMilestone.isPaid === false) {
            const amount = body.paymentAmount !== undefined ? body.paymentAmount : currentMilestone.paymentAmount;
            if (amount && amount > 0) {
                await (prisma as any).iTProject.update({
                    where: { id: currentMilestone.projectId },
                    data: {
                        itRevenueEarned: { increment: amount }
                    }
                });
            }
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Update Milestone Error:', error);
        return createErrorResponse(error);
    }
}

// DELETE /api/it/milestones/[id] - Delete a milestone
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const milestoneId = params.id;
        await (prisma as any).iTProjectMilestone.delete({
            where: { id: milestoneId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Milestone Error:', error);
        return createErrorResponse(error);
    }
}
