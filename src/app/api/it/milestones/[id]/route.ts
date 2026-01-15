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

        // Get current state to check if we need to update revenue and verify access
        const currentMilestone = await (prisma as any).iTProjectMilestone.findFirst({
            where: { id: milestoneId },
            include: {
                project: {
                    select: { id: true, companyId: true, itRevenueEarned: true }
                }
            }
        });

        if (!currentMilestone) {
            return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
        }

        // Verify company access
        const companyId = (user as any).companyId;
        if (currentMilestone.project.companyId !== companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const data: any = {};
        if (body.name) data.name = body.name;
        if (body.description !== undefined) data.description = body.description;
        if (body.dueDate) data.dueDate = new Date(body.dueDate);

        if (body.status !== undefined && body.status !== currentMilestone.status) {
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

        // REVENUE LOGIC
        const oldPaid = currentMilestone.isPaid;
        const newPaid = body.isPaid !== undefined ? body.isPaid : oldPaid;
        const oldAmount = currentMilestone.paymentAmount || 0;
        const newAmount = body.paymentAmount !== undefined ? body.paymentAmount : oldAmount;

        let revenueAdjustment = 0;

        if (!oldPaid && newPaid) {
            // Case 1: Became paid -> Increment by new amount
            revenueAdjustment = newAmount;
        } else if (oldPaid && !newPaid) {
            // Case 2: Became unpaid -> Decrement by old amount
            revenueAdjustment = -oldAmount;
        } else if (oldPaid && newPaid && body.paymentAmount !== undefined) {
            // Case 3: Stayed paid but amount changed -> Adjust by difference
            revenueAdjustment = newAmount - oldAmount;
        }

        if (revenueAdjustment !== 0) {
            await (prisma as any).iTProject.update({
                where: { id: currentMilestone.projectId },
                data: {
                    itRevenueEarned: { increment: revenueAdjustment }
                }
            });
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

        // Get current state to check revenue and verify access
        const milestone = await (prisma as any).iTProjectMilestone.findUnique({
            where: { id: milestoneId },
            include: {
                project: {
                    select: { id: true, companyId: true }
                }
            }
        });

        if (!milestone) {
            return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
        }

        // Verify company access
        const companyId = (user as any).companyId;
        if (milestone.project.companyId !== companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // If milestone was paid, decrement project revenue
        if (milestone.isPaid && milestone.paymentAmount > 0) {
            await (prisma as any).iTProject.update({
                where: { id: milestone.projectId },
                data: {
                    itRevenueEarned: { decrement: milestone.paymentAmount }
                }
            });
        }

        await (prisma as any).iTProjectMilestone.delete({
            where: { id: milestoneId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Milestone Error:', error);
        return createErrorResponse(error);
    }
}
