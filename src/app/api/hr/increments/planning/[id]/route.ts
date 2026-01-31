import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const PUT = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const url = new URL(req.url);
            const id = url.pathname.split('/').pop();

            if (!id) {
                return createErrorResponse('Record ID required', 400);
            }

            const body = await req.json();
            const {
                newFixed, newVariable, newIncentive,
                newMonthlyTarget, newYearlyTarget,
                newBaseTarget, newVariableRate, newVariableUnit, // New Fields
                newHealthCare, newTravelling, newMobile, newInternet,
                effectiveDate, reason, type, newSalary
            } = body;

            // 1. Fetch current record to get oldSalary
            const record = await prisma.salaryIncrementRecord.findUnique({
                where: { id },
                include: {
                    employeeProfile: {
                        include: { user: true }
                    }
                }
            }) as any;

            if (!record) {
                return createErrorResponse('Record not found', 404);
            }

            if (record.status !== 'RECOMMENDED') {
                return createErrorResponse('Only pending recommendations can be modified', 400);
            }

            // RBAC check: Only Super Admin, or Admin of same company, or Manager of the employee
            const isSuperAdmin = user.role === 'SUPER_ADMIN';
            const isSameCompany = user.companyId === record.employeeProfile.user.companyId;
            const isManager = user.id === record.employeeProfile.user.managerId;

            if (!isSuperAdmin && !isSameCompany && !isManager) {
                return createErrorResponse('Forbidden', 403);
            }

            const fixed = parseFloat(newFixed) || 0;
            const parsedNewSalary = parseFloat(newSalary) || 0;
            const parsedFixed = parseFloat(newFixed) || 0;
            const parsedVariable = parseFloat(newVariable) || 0;
            const parsedIncentive = parseFloat(newIncentive) || 0;
            const parsedMonthlyTarget = parseFloat(newMonthlyTarget) || 0;
            const parsedYearlyTarget = parseFloat(newYearlyTarget) || 0;

            const parsedBaseTarget = parseFloat(newBaseTarget) || 0;
            const parsedVariableRate = parseFloat(newVariableRate) || 0;
            const parsedVariableUnit = parseFloat(newVariableUnit) || 0;

            const parsedHealthCare = parseFloat(newHealthCare) || 0;
            const parsedTravelling = parseFloat(newTravelling) || 0;
            const parsedMobile = parseFloat(newMobile) || 0;
            const parsedInternet = parseFloat(newInternet) || 0;

            const oldSalary = record.oldSalary;
            const incrementAmount = parsedNewSalary - oldSalary;
            const percentage = oldSalary > 0 ? (incrementAmount / oldSalary) * 100 : 0;

            const updated = await prisma.salaryIncrementRecord.update({
                where: { id },
                data: {
                    newSalary: parsedNewSalary,

                    // New Components
                    newFixed: parsedFixed,
                    newVariable: parsedVariable,
                    newIncentive: parsedIncentive,

                    newMonthlyTarget: parsedMonthlyTarget,
                    newYearlyTarget: parsedYearlyTarget,

                    newBaseTarget: parsedBaseTarget,
                    newVariableRate: parsedVariableRate,
                    newVariableUnit: parsedVariableUnit,

                    newHealthCare: parsedHealthCare,
                    newTravelling: parsedTravelling,
                    newMobile: parsedMobile,
                    newInternet: parsedInternet,

                    incrementAmount,
                    percentage: parseFloat(percentage.toFixed(2)),
                    effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
                    reason,
                    type,
                    status: 'DRAFT'
                }
            });

            return NextResponse.json(updated);
        } catch (error) {
            console.error('Update Recommendation Error:', error);
            return createErrorResponse(error);
        }
    }
);
