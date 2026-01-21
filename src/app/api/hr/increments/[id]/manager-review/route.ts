import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { z } from 'zod';

const reviewSchema = z.object({
    comments: z.string().optional(),
    action: z.enum(['approve', 'reject'])
});

// POST: Manager review (first authentication)
export const POST = authorizedRoute(
    ['MANAGER', 'SUPER_ADMIN', 'ADMIN', 'HR'],
    async (req: NextRequest, user, { params }: { params: { id: string } }) => {
        try {
            const body = await req.json();
            const result = reviewSchema.safeParse(body);

            if (!result.success) {
                return createErrorResponse(result.error);
            }

            const { comments, action } = result.data;

            const increment = await prisma.salaryIncrementRecord.findUnique({
                where: { id: params.id },
                include: {
                    employeeProfile: {
                        include: {
                            user: true
                        }
                    }
                }
            });

            if (!increment) {
                return NextResponse.json(
                    { error: 'Increment not found' },
                    { status: 404 }
                );
            }

            // Check if user is the manager
            const isManager = increment.employeeProfile.user.managerId === user.id;
            const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user.role);

            if (!isManager && !isAdmin) {
                return NextResponse.json(
                    { error: 'Only the employee\'s manager can review this increment' },
                    { status: 403 }
                );
            }

            // Can only review drafts
            if (increment.status !== 'DRAFT') {
                return NextResponse.json(
                    { error: 'Increment is not in DRAFT status' },
                    { status: 400 }
                );
            }

            let updateData: any = {
                recommendedByUserId: user.id,
                managerReviewDate: new Date(),
                managerComments: comments,
                managerApproved: action === 'approve',
                isDraft: false
            };

            if (action === 'approve') {
                // Move to MANAGER_APPROVED status
                updateData.status = 'MANAGER_APPROVED';
            } else {
                // Reject
                updateData.status = 'REJECTED';
            }

            const updated = await prisma.salaryIncrementRecord.update({
                where: { id: params.id },
                data: updateData,
                include: {
                    employeeProfile: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    }
                }
            });

            return NextResponse.json({
                success: true,
                message: action === 'approve'
                    ? 'Increment approved by manager. Awaiting admin approval.'
                    : 'Increment rejected by manager.',
                increment: updated
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
