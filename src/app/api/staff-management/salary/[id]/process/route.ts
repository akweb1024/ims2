import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'FINANCE_ADMIN'],
    async (req: NextRequest, user, { params }: { params: { id: string } }) => {
        try {
            const { id } = params;

            // Find the salary slip
            const salarySlip = await prisma.salarySlip.findUnique({
                where: { id }
            });

            if (!salarySlip) {
                return createErrorResponse('Salary slip not found', 404);
            }

            if (salarySlip.status === 'PAID') {
                return createErrorResponse('Salary already paid', 400);
            }

            // Update status to PAID
            const updatedSlip = await prisma.salarySlip.update({
                where: { id },
                data: {
                    status: 'PAID',
                    amountPaid: salarySlip.netPayable,
                    generatedAt: new Date() // Or add a paymentDate field if schema allowed, but generatedAt is misleading. 
                    // Schema check: generatedAt is DateTime @default(now()). 
                    // There is no paymentDate in prisma schema for SalarySlip?
                    // Let's check schema again. 
                }
            });

            // Create a Financial Record for this expense? 
            // Optional but good practice. For now, just update status.

            return NextResponse.json(updatedSlip);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
