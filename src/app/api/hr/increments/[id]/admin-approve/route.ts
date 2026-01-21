import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
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

            if (action === 'approve') {
                // Final approval - update employee salary
                updateData.status = 'APPROVED';

                // Update employee profile with new salary
                await prisma.employeeProfile.update({
                    where: { id: increment.employeeProfileId },
                    data: {
                        baseSalary: increment.newSalary,
                        fixedSalary: increment.newFixedSalary,
                        variableSalary: increment.newVariableSalary,
                        incentiveSalary: increment.newIncentive,
                        designation: increment.newDesignation || increment.previousDesignation,
                        lastIncrementDate: increment.effectiveDate,
                        lastIncrementPercentage: increment.percentage,
                        monthlyTarget: increment.newMonthlyTarget || 0,
                        yearlyTarget: (increment as any).newYearlyTarget || 0,
                        // Update KRA if provided
                        ...(increment.newKRA && { kra: increment.newKRA }),
                        // Update KPIs (metrics) if provided
                        ...(increment.newKPI && { metrics: increment.newKPI as any })
                    } as any
                });
            } else {
                // Reject
                updateData.status = 'REJECTED';
            }

            const updated = await prisma.salaryIncrementRecord.update({
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
