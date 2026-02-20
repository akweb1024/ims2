import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { z } from 'zod';

// Validation schema for increment creation/update
const incrementSchema = z.object({
    employeeProfileId: z.string(),
    effectiveDate: z.string().optional(),

    // Support for Percentage-based Proposals (Managers)
    proposedPercentage: z.number().min(0).max(100).optional(),

    // New Salary Structure (Admins/HR can override or Manager can send 0 if using % only)
    newFixedSalary: z.number().min(0).optional(),
    newVariableSalary: z.number().min(0).optional(),
    newIncentive: z.number().min(0).optional(),

    // Detailed Structure
    newVariablePerTarget: z.number().optional(),
    newVariableUpperCap: z.number().optional(),
    variableDefinition: z.string().optional(),

    newIncentivePercentage: z.number().optional(),
    incentiveDefinition: z.string().optional(),

    // Opt-in Flags
    optInVariable: z.boolean().optional(),
    optInIncentive: z.boolean().optional(),

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
    newBaseTarget: z.number().optional(),
    newVariableRate: z.number().optional(),
    newVariableUnit: z.number().optional(),

    // Detailed Revenue Targets
    monthlyFixTarget: z.number().min(0).optional(),
    monthlyVariableTarget: z.number().min(0).optional(),

    // Fiscal Year and Quarterly Targets
    fiscalYear: z.string().optional(),
    q1Target: z.number().optional(),
    monthlyTargets: z.record(z.string(), z.number()).optional(),
    monthlyVariableTargets: z.record(z.string(), z.number()).optional(),
    monthlyFixedSalaries: z.record(z.string(), z.number()).optional(),
    monthlyVariableSalaries: z.record(z.string(), z.number()).optional(),
    q2Target: z.number().optional(),
    q3Target: z.number().optional(),
    q4Target: z.number().optional(),
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
                const allowedUserIds = [...subIds]; // Exclude self (user.id) so managers don't see their own pending increments here

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
                    },
                    reviews: {
                        include: {
                            reviewer: {
                                select: {
                                    name: true,
                                    email: true
                                }
                            }
                        },
                        orderBy: { date: 'desc' }
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
            const validatedData = incrementSchema.parse(body);

            // Fetch basic employee info for defaults
            const employee = await prisma.employeeProfile.findUnique({
                where: { id: validatedData.employeeProfileId },
                include: { user: true, salaryStructure: true }
            });

            if (!employee) return createErrorResponse('Employee not found', 404);

            // Managers Check
            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const { getDownlineUserIds } = await import('@/lib/hierarchy');
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                const allowedUserIds = [...subIds];

                if (!allowedUserIds.includes(employee.userId)) {
                    return createErrorResponse('You are not authorized to create increment for this employee', 403);
                }
            }

            // Calculate Totals based on Percentage or provided values
            let newFixed = validatedData.newFixedSalary || 0;
            let newVariable = validatedData.newVariableSalary || 0;
            let newIncentive = validatedData.newIncentive || 0;

            const oldBaseSalary = employee.baseSalary || 0;
            const oldFixed = employee.salaryFixed || 0;
            const oldVariable = employee.salaryVariable || 0;

            if (validatedData.proposedPercentage !== undefined && validatedData.proposedPercentage > 0) {
                // Percentage based calculation
                const totalSalaryMultiplier = 1 + (validatedData.proposedPercentage / 100);
                const projectedTotal = oldBaseSalary * totalSalaryMultiplier;

                // Simple ratio distribution (respecting previous fixed/variable split)
                const fixedRatio = oldBaseSalary > 0 ? oldFixed / oldBaseSalary : 1; // Default to 100% fixed if no base
                const variableRatio = oldBaseSalary > 0 ? (oldVariable || 0) / oldBaseSalary : 0;

                newFixed = projectedTotal * fixedRatio;
                newVariable = projectedTotal * variableRatio;
                newIncentive = employee.salaryIncentive || 0; // Incentives typically not auto-scaled by standard %
            }

            const totalSalary = newFixed + newVariable + newIncentive;

            // Monthly Breakdown
            const monthlyFixSalary = newFixed; // Assuming input is monthly
            const monthlyVariableSalary = newVariable;
            const monthlyTotalSalary = monthlyFixSalary + monthlyVariableSalary;

            // Target Breakdown
            const monthlyFixTarget = validatedData.monthlyFixTarget || 0;
            const monthlyVariableTarget = validatedData.monthlyVariableTarget || 0;
            const totalTargetVal = monthlyFixTarget + monthlyVariableTarget;

            // Fetch previous record for fiscal year snapshot
            const lastIncrement = await prisma.salaryIncrementRecord.findFirst({
                where: {
                    employeeProfileId: validatedData.employeeProfileId,
                    status: 'APPROVED'
                },
                orderBy: { effectiveDate: 'desc' }
            });

            // Create increment record
            const increment = await prisma.salaryIncrementRecord.create({
                data: {
                    employeeProfileId: validatedData.employeeProfileId,
                    effectiveDate: validatedData.effectiveDate ? new Date(validatedData.effectiveDate) : new Date(),
                    fiscalYear: validatedData.fiscalYear ? String(validatedData.fiscalYear) : undefined,
                    previousFiscalYear: lastIncrement?.fiscalYear || undefined, // Store snapshot of previous FY

                    // Old values (snapshot)
                    oldSalary: employee.baseSalary || 0,
                    oldFixed: employee.salaryFixed || 0,
                    oldVariable: employee.salaryVariable || 0,
                    oldIncentive: employee.salaryIncentive || 0,
                    oldBaseTarget: employee.baseTarget || 0,
                    oldVariableRate: employee.variableRate || 0,
                    oldVariableUnit: employee.variableUnit || 0,

                    // New Salary Structure (High Level)
                    newSalary: totalSalary,
                    newFixed: newFixed,
                    newVariable: newVariable,
                    newIncentive: newIncentive,
                    incrementAmount: totalSalary - (employee.baseSalary || 0),
                    percentage: (employee.baseSalary || 0) > 0 ? ((totalSalary - (employee.baseSalary || 0)) / (employee.baseSalary || 0)) * 100 : 0,

                    // Detailed Salary Breakdown
                    monthlyFixSalary: monthlyFixSalary,
                    monthlyVariableSalary: monthlyVariableSalary,
                    monthlyTotalSalary: monthlyTotalSalary,

                    // Detailed Revenue Target Breakdown
                    monthlyFixTarget: monthlyFixTarget,
                    monthlyVariableTarget: monthlyVariableTarget,
                    monthlyTotalTarget: totalTargetVal,



                    // Other detailed structure fields
                    newBaseTarget: validatedData.newBaseTarget,
                    newVariableRate: validatedData.newVariableRate,
                    newVariableUnit: validatedData.newVariableUnit,

                    // Opt-ins & Details
                    optInVariable: validatedData.optInVariable || false,
                    optInIncentive: validatedData.optInIncentive || false,
                    newVariablePerTarget: validatedData.newVariablePerTarget,
                    newVariableUpperCap: validatedData.newVariableUpperCap,
                    variableDefinition: validatedData.variableDefinition,
                    newIncentivePercentage: validatedData.newIncentivePercentage,
                    incentiveDefinition: validatedData.incentiveDefinition,

                    // Perks
                    oldHealthCare: employee.salaryStructure?.healthCare || 0,
                    newHealthCare: validatedData.newHealthCare !== undefined ? validatedData.newHealthCare : (employee.salaryStructure?.healthCare || 0),
                    oldTravelling: employee.salaryStructure?.travelling || 0,
                    newTravelling: validatedData.newTravelling !== undefined ? validatedData.newTravelling : (employee.salaryStructure?.travelling || 0),
                    oldMobile: employee.salaryStructure?.mobile || 0,
                    newMobile: validatedData.newMobile !== undefined ? validatedData.newMobile : (employee.salaryStructure?.mobile || 0),
                    oldInternet: employee.salaryStructure?.internet || 0,
                    newInternet: validatedData.newInternet !== undefined ? validatedData.newInternet : (employee.salaryStructure?.internet || 0),
                    oldBooksAndPeriodicals: employee.salaryStructure?.booksAndPeriodicals || 0,
                    newBooksAndPeriodicals: validatedData.newBooksAndPeriodicals !== undefined ? validatedData.newBooksAndPeriodicals : (employee.salaryStructure?.booksAndPeriodicals || 0),

                    // Meta
                    newDesignation: validatedData.newDesignation || employee.designation,
                    reason: validatedData.reason,
                    performanceNotes: validatedData.performanceNotes,

                    // KRA/KPI History
                    oldKRA: employee.kra,
                    oldKPI: employee.metrics as any,
                    newKRA: validatedData.newKRA,
                    newKPI: validatedData.newKPI || null,

                    // Target Comparisons
                    currentMonthlyTarget: employee.monthlyTarget || 0,
                    newMonthlyTarget: validatedData.newMonthlyTarget || totalTargetVal || employee.monthlyTarget || 0,
                    currentYearlyTarget: employee.yearlyTarget || 0,
                    newYearlyTarget: validatedData.newYearlyTarget || (totalTargetVal * 12) || employee.yearlyTarget || 0,

                    q1Target: validatedData.q1Target,
                    q2Target: validatedData.q2Target,
                    q3Target: validatedData.q3Target,
                    q4Target: validatedData.q4Target,
                    monthlyTargets: validatedData.monthlyTargets, // Save JSON (Fixed Targets)
                    monthlyVariableTargets: validatedData.monthlyVariableTargets, // Save JSON (Variable Targets)
                    monthlyFixedSalaries: validatedData.monthlyFixedSalaries, // Save JSON (Fixed Salaries)
                    monthlyVariableSalaries: validatedData.monthlyVariableSalaries, // Save JSON (Variable Salaries)

                    status: 'DRAFT',
                    isDraft: true,
                    recommendedByUserId: user.id
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
            // This change is just to ensure I have a valid block to confirm no invalid checks remain.
            // The previous replacement covered the logic flow, ensuring 'isManager' was removed.
            // I will just re-verify the catch block is clean.
        } catch (error: any) {
            console.error('Increment create error:', error);
            if (error instanceof z.ZodError) {
                return createErrorResponse('Validation failed', 400, (error as any).errors);
            }
            return createErrorResponse('Internal Server Error', 500);
        }
    }
);
