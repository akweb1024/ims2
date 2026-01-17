import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const PUT = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const url = new URL(req.url);
            const id = url.pathname.split('/').pop();

            if (!id) {
                return createErrorResponse('Record ID required', 400);
            }

            const body = await req.json();
            const { newSalary, effectiveDate, reason, type } = body;

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

            const oldSalary = record.oldSalary;
            const updatedNewSalary = parseFloat(newSalary);
            const incrementAmount = updatedNewSalary - oldSalary;
            const percentage = oldSalary > 0 ? (incrementAmount / oldSalary) * 100 : 0;

            const updated = await prisma.salaryIncrementRecord.update({
                where: { id },
                data: {
                    newSalary: updatedNewSalary,
                    incrementAmount,
                    percentage: parseFloat(percentage.toFixed(2)),
                    effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
                    reason,
                    type
                } as any
            });

            return NextResponse.json(updated);
        } catch (error) {
            console.error('Update Recommendation Error:', error);
            return createErrorResponse(error);
        }
    }
);
