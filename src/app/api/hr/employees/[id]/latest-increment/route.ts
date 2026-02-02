import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'HR', 'FINANCE_ADMIN'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            // Find profile ID (it could be User ID or Profile ID)
            const profile = await prisma.employeeProfile.findFirst({
                where: {
                    OR: [
                        { id },
                        { userId: id }
                    ]
                },
                select: { id: true }
            });

            if (!profile) return createErrorResponse('Employee profile not found', 404);

            // Fetch latest approved increment
            const latestIncrement = await prisma.salaryIncrementRecord.findFirst({
                where: {
                    employeeProfileId: profile.id,
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
