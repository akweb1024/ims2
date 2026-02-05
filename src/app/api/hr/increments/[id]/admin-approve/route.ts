import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { applyApprovedIncrement } from '@/lib/services/salary-service';
import { z } from 'zod';

const adminReviewSchema = z.object({
    comments: z.string().optional(),
    action: z.enum(['approve', 'reject'])
});

// POST: Admin approval (second authentication)
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const body = await req.json();
            const result = adminReviewSchema.safeParse(body);

            if (!result.success) {
                return createErrorResponse(result.error);
            }

            const { comments, action } = result.data;

            const increment = await prisma.salaryIncrementRecord.findUnique({
                where: { id },
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

            // Can only approve if manager has already approved
            if (increment.status !== 'MANAGER_APPROVED') {
                return NextResponse.json(
                    { error: 'Increment must be approved by manager first' },
                    { status: 400 }
                );
            }

            const updateData: any = {
                approvedByUserId: user.id,
                adminReviewDate: new Date(),
                adminComments: comments,
                adminApproved: action === 'approve'
            };

            const updated = await prisma.$transaction(async (tx) => {
                if (action === 'approve') {
                    // Use Centralized Salary Service to update Profile, Structure, KPIs, etc.
                    await applyApprovedIncrement(increment, user.id, tx);

                    updateData.status = 'APPROVED';
                } else {
                    updateData.status = 'REJECTED';
                }

                return await tx.salaryIncrementRecord.update({
                    where: { id },
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
            });

            // Send notification to employee
            if (increment.employeeProfile.user.id) {
                const { createNotification } = await import('@/lib/notifications');
                await createNotification({
                    userId: increment.employeeProfile.user.id,
                    title: action === 'approve' ? 'Salary Increment Approved!' : 'Increment Rejected by Admin',
                    message: action === 'approve'
                        ? `Congratulations! Your salary increment of ₹${increment.incrementAmount?.toLocaleString()} (${increment.percentage?.toFixed(2)}%) has been fully approved and will be effective from ${new Date(increment.effectiveDate).toLocaleDateString()}.`
                        : `Your salary increment request has been rejected by admin. ${comments ? `Reason: ${comments}` : ''}`,
                    type: action === 'approve' ? 'SUCCESS' : 'ERROR',
                    link: `/dashboard/hr-management/increments/${id}`
                });

                // Send email notification
                const { sendEmail, EmailTemplates } = await import('@/lib/email');
                const template = action === 'approve'
                    ? EmailTemplates.incrementApproved(
                        increment.employeeProfile.user.name || 'Employee',
                        `₹${increment.incrementAmount?.toLocaleString()}`,
                        `${increment.percentage?.toFixed(2)}%`,
                        new Date(increment.effectiveDate).toLocaleDateString()
                    )
                    : EmailTemplates.incrementRejected(
                        increment.employeeProfile.user.name || 'Employee',
                        'Admin',
                        comments || 'No reason provided'
                    );

                await sendEmail({
                    to: increment.employeeProfile.user.email,
                    ...template
                });
            }

            return NextResponse.json({
                success: true,
                message: action === 'approve'
                    ? 'Increment fully approved and applied to employee.'
                    : 'Increment rejected by admin.',
                increment: updated
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
