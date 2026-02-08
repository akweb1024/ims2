import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['EXECUTIVE', 'MANAGER', 'TEAM_LEADER', 'HR', 'ADMIN', 'SUPER_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            // Get employee profile for the current user
            const profile = await prisma.employeeProfile.findUnique({
                where: { userId: user.id }
            });

            if (!profile) {
                return createErrorResponse('Employee profile not found', 404);
            }

            // Find the most recently approved increment record
            const activeIncrement = await prisma.salaryIncrementRecord.findFirst({
                where: {
                    employeeProfileId: profile.id,
                    status: 'APPROVED'
                },
                include: {
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
                orderBy: { effectiveDate: 'desc' }
            });

            if (!activeIncrement) {
                return NextResponse.json({ message: 'No approved increment found', increment: null });
            }

            return NextResponse.json({ increment: activeIncrement });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
