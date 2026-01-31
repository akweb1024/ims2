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
    fiscalYear: z.string().optional(),
    q1Target: z.number().min(0).optional(),
    q2Target: z.number().min(0).optional(),
    q3Target: z.number().min(0).optional(),
    q4Target: z.number().min(0).optional(),
    newHealthCare: z.number().min(0).optional(),
    newTravelling: z.number().min(0).optional(),
    newMobile: z.number().min(0).optional(),
    newInternet: z.number().min(0).optional(),
    newBooksAndPeriodicals: z.number().min(0).optional(),
    newJobDescription: z.string().optional(),
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
                const newFixed = data.newFixedSalary ?? increment.newFixed ?? 0;
                const newVariable = data.newVariableSalary ?? increment.newVariable ?? 0;
                const newIncentive = data.newIncentive ?? increment.newIncentive ?? 0;

                const newSalary = newFixed + newVariable + newIncentive;
                const incrementAmount = newSalary - increment.oldSalary;
                const percentage = increment.oldSalary > 0 ? (incrementAmount / increment.oldSalary) * 100 : 0;

                updateData = {
                    newFixed,
                    newVariable,
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
            if (data.newJobDescription) updateData.newJobDescription = data.newJobDescription;
            if (typeof data.newMonthlyTarget === 'number') updateData.newMonthlyTarget = data.newMonthlyTarget;
            if (typeof data.newYearlyTarget === 'number') updateData.newYearlyTarget = data.newYearlyTarget;
            if (data.effectiveDate) updateData.effectiveDate = new Date(data.effectiveDate);
            if (data.fiscalYear) updateData.fiscalYear = data.fiscalYear;
            if (typeof data.q1Target === 'number') updateData.q1Target = data.q1Target;
            if (typeof data.q2Target === 'number') updateData.q2Target = data.q2Target;
            if (typeof data.q3Target === 'number') updateData.q3Target = data.q3Target;
            if (typeof data.q4Target === 'number') updateData.q4Target = data.q4Target;
            if (typeof data.newHealthCare === 'number') updateData.newHealthCare = data.newHealthCare;
            if (typeof data.newTravelling === 'number') updateData.newTravelling = data.newTravelling;
            if (typeof data.newMobile === 'number') updateData.newMobile = data.newMobile;
            if (typeof data.newInternet === 'number') updateData.newInternet = data.newInternet;
            if (typeof data.newBooksAndPeriodicals === 'number') updateData.newBooksAndPeriodicals = data.newBooksAndPeriodicals;

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
