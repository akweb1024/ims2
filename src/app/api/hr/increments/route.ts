import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { z } from 'zod';

// Validation schema for increment creation/update
const incrementSchema = z.object({
    employeeProfileId: z.string(),
    effectiveDate: z.string().optional(),

    // New Salary Structure
    newFixedSalary: z.number().min(0),
    newVariableSalary: z.number().min(0).optional(),
    newIncentive: z.number().min(0).optional(),

    // Designation change
    newDesignation: z.string().optional(),

    // Reason and notes
    reason: z.string().optional(),
    performanceNotes: z.string().optional(),

    // KRA/KPI Redefinition
    newKRA: z.string().optional(),
    newKPI: z.any().optional(),

    // Targets
    newMonthlyTarget: z.number().min(0).optional(),
    newYearlyTarget: z.number().min(0).optional(),

    // Sec-10 Exemp / Perks
    newHealthCare: z.number().min(0).optional(),
    newTravelling: z.number().min(0).optional(),
    newMobile: z.number().min(0).optional(),
    newInternet: z.number().min(0).optional(),
    newBooksAndPeriodicals: z.number().min(0).optional(),
});

// GET: List all increments (with filtering)
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const status = searchParams.get('status');
            const employeeId = searchParams.get('employeeId');

            const where: any = {};

            // Filter by status
            if (status) {
                where.status = status;
            }

            // Filter by employee
            if (employeeId) {
                where.employeeProfileId = employeeId;
            }

            // Managers can only see their team's increments (including recursive downline)
            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const { getDownlineUserIds } = await import('@/lib/hierarchy');
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                const allowedUserIds = [...subIds, user.id];

                const managedProfiles = await prisma.employeeProfile.findMany({
                    where: { userId: { in: allowedUserIds } },
                    select: { id: true }
                });

                where.employeeProfileId = {
                    in: managedProfiles.map(p => p.id)
                };
            }

            const increments = await prisma.salaryIncrementRecord.findMany({
                where,
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
                },
                orderBy: { createdAt: 'desc' }
            });

            return NextResponse.json(increments);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// POST: Create new increment (draft)
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();

            const result = incrementSchema.safeParse(body);
            if (!result.success) {
                return createErrorResponse(result.error);
            }

            const data = result.data;

            // Get employee current salary
            const employee = await prisma.employeeProfile.findUnique({
                where: { id: data.employeeProfileId },
                include: {
                    user: true,
                    salaryStructure: true
                }
            });

            if (!employee) {
                return NextResponse.json(
                    { error: 'Employee not found' },
                    { status: 404 }
                );
            }

            // Check if user is manager of this employee
            const isManager = employee.user.managerId === user.id;
            const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user.role);

            if (!isManager && !isAdmin) {
                return NextResponse.json(
                    { error: 'You are not authorized to create increment for this employee' },
                    { status: 403 }
                );
            }

            // Calculate old salary structure
            const oldSalary = employee.baseSalary || 0;
            const oldFixedSalary = employee.fixedSalary || oldSalary;
            const oldVariableSalary = employee.variableSalary || 0;
            const oldIncentive = employee.incentiveSalary || 0;

            // Calculate new total salary
            const newSalary = data.newFixedSalary + (data.newVariableSalary || 0) + (data.newIncentive || 0);
            const incrementAmount = newSalary - oldSalary;
            const percentage = oldSalary > 0 ? (incrementAmount / oldSalary) * 100 : 0;

            // Create increment record
            const increment = await prisma.salaryIncrementRecord.create({
                data: {
                    employeeProfileId: data.employeeProfileId,
                    effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : new Date(),

                    // Old salary
                    oldSalary,
                    oldFixedSalary,
                    oldVariableSalary,
                    oldIncentive,

                    // New salary
                    newSalary,
                    newFixedSalary: data.newFixedSalary,
                    newVariableSalary: data.newVariableSalary || 0,
                    newIncentive: data.newIncentive || 0,

                    incrementAmount,
                    percentage,

                    previousDesignation: employee.designation,
                    newDesignation: data.newDesignation || employee.designation,

                    reason: data.reason,
                    performanceNotes: data.performanceNotes,

                    // KRA/KPI History
                    oldKRA: employee.kra,
                    oldKPI: employee.metrics as any,
                    newKRA: data.newKRA,
                    newKPI: data.newKPI || null,

                    // Target Comparisons
                    currentMonthlyTarget: employee.monthlyTarget || 0,
                    newMonthlyTarget: data.newMonthlyTarget || employee.monthlyTarget || 0,
                    currentYearlyTarget: employee.yearlyTarget || 0,
                    newYearlyTarget: data.newYearlyTarget || employee.yearlyTarget || 0,

                    // Sec-10 Exemp / Perks
                    oldHealthCare: employee.salaryStructure?.healthCare || 0,
                    newHealthCare: data.newHealthCare !== undefined ? data.newHealthCare : (employee.salaryStructure?.healthCare || 0),
                    oldTravelling: employee.salaryStructure?.travelling || 0,
                    newTravelling: data.newTravelling !== undefined ? data.newTravelling : (employee.salaryStructure?.travelling || 0),
                    oldMobile: employee.salaryStructure?.mobile || 0,
                    newMobile: data.newMobile !== undefined ? data.newMobile : (employee.salaryStructure?.mobile || 0),
                    oldInternet: employee.salaryStructure?.internet || 0,
                    newInternet: data.newInternet !== undefined ? data.newInternet : (employee.salaryStructure?.internet || 0),
                    oldBooksAndPeriodicals: employee.salaryStructure?.booksAndPeriodicals || 0,
                    newBooksAndPeriodicals: data.newBooksAndPeriodicals !== undefined ? data.newBooksAndPeriodicals : (employee.salaryStructure?.booksAndPeriodicals || 0),

                    // Set as draft
                    status: 'DRAFT',
                    isDraft: true,

                    // If created by manager, mark as recommended
                    ...(isManager && {
                        recommendedByUserId: user.id,
                        managerApproved: false
                    })
                },
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

            return NextResponse.json(increment);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
