import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            // Extract ID from URL (last segment)
            const id = req.url.split('/').slice(-2, -1)[0];

            if (!id) return createErrorResponse('Employee ID is required', 400);

            // Fetch latest approved increment
            const latestIncrement = await prisma.salaryIncrementRecord.findFirst({
                where: {
                    employeeProfileId: id,
                    status: 'APPROVED'
                },
                orderBy: {
                    effectiveDate: 'desc'
                },
                take: 1
            });

            if (!latestIncrement) {
                return NextResponse.json({ message: 'No approved increments found' }, { status: 404 });
            }

            return NextResponse.json(latestIncrement);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
