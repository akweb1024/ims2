import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { z } from 'zod';

// Validation schema for increment update
const updateIncrementSchema = z.object({
    newFixedSalary: z.number().min(0).optional(),
    newVariableSalary: z.number().min(0).optional(),
    newIncentive: z.number().min(0).optional(),
    newDesignation: z.string().optional(),
    reason: z.string().optional(),
    performanceNotes: z.string().optional(),
    newKRA: z.string().optional(),
    newKPI: z.any().optional(),
    effectiveDate: z.string().optional(),
    newMonthlyTarget: z.number().min(0).optional(),
    newYearlyTarget: z.number().min(0).optional(),
});

// GET: Get increment details
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const increment = await prisma.salaryIncrementRecord.findUnique({
                where: { id },
                include: {
                    employeeProfile: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    managerId: true
                                }
                            }
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

            // Check authorization
            const isManager = increment.employeeProfile.user.managerId === user.id;
            const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user.role);

            if (!isManager && !isAdmin) {
                return NextResponse.json(
                    { error: 'Not authorized' },
                    { status: 403 }
                );
            }

            return NextResponse.json(increment);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// PATCH: Update increment (only in DRAFT status)
export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const body = await req.json();

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

            // Can only edit drafts
            if (increment.status !== 'DRAFT') {
                return NextResponse.json(
                    { error: 'Can only edit draft increments' },
                    { status: 400 }
                );
            }

            // Check authorization
            const isManager = increment.employeeProfile.user.managerId === user.id;
            const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user.role);

            if (!isManager && !isAdmin) {
                return NextResponse.json(
                    { error: 'Not authorized' },
                    { status: 403 }
                );
            }

            const result = updateIncrementSchema.safeParse(body);
            if (!result.success) {
                return createErrorResponse(result.error);
            }

            const data = result.data;

            // Recalculate if salary components changed
            let updateData: any = {};

            if (data.newFixedSalary !== undefined || data.newVariableSalary !== undefined || data.newIncentive !== undefined) {
                const newFixedSalary = data.newFixedSalary ?? increment.newFixedSalary ?? 0;
                const newVariableSalary = data.newVariableSalary ?? increment.newVariableSalary ?? 0;
                const newIncentive = data.newIncentive ?? increment.newIncentive ?? 0;

                const newSalary = newFixedSalary + newVariableSalary + newIncentive;
                const incrementAmount = newSalary - increment.oldSalary;
                const percentage = increment.oldSalary > 0 ? (incrementAmount / increment.oldSalary) * 100 : 0;

                updateData = {
                    newFixedSalary,
                    newVariableSalary,
                    newIncentive,
                    newSalary,
                    incrementAmount,
                    percentage
                };
            }

            // Update other fields
            if (data.newDesignation) updateData.newDesignation = data.newDesignation;
            if (data.reason) updateData.reason = data.reason;
            if (data.performanceNotes) updateData.performanceNotes = data.performanceNotes;
            if (data.newKRA) updateData.newKRA = data.newKRA;
            if (data.newKPI) updateData.newKPI = data.newKPI;
            if (typeof data.newMonthlyTarget === 'number') updateData.newMonthlyTarget = data.newMonthlyTarget;
            if (typeof data.newYearlyTarget === 'number') updateData.newYearlyTarget = data.newYearlyTarget;
            if (data.effectiveDate) updateData.effectiveDate = new Date(data.effectiveDate);

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

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// DELETE: Delete increment (only drafts)
export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
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

            // Can only delete drafts
            if (increment.status !== 'DRAFT') {
                return NextResponse.json(
                    { error: 'Can only delete draft increments' },
                    { status: 400 }
                );
            }

            // Check authorization
            const isManager = increment.employeeProfile.user.managerId === user.id;
            const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user.role);

            if (!isManager && !isAdmin) {
                return NextResponse.json(
                    { error: 'Not authorized' },
                    { status: 403 }
                );
            }

            await prisma.salaryIncrementRecord.delete({
                where: { id }
            });

            return NextResponse.json({ success: true });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
