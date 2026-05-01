import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { markSalarySlipPaid } from '@/lib/services/payroll/markSalarySlipPaid';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'FINANCE_ADMIN'],
    async (req: NextRequest, user, { params }: { params: { id: string } }) => {
        try {
            const { id } = params;
            const result = await prisma.$transaction((tx) => markSalarySlipPaid(id, tx));

            if (!result.ok) {
                return createErrorResponse(result.error, result.status);
            }

            return NextResponse.json(result.slip);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
