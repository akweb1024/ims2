import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const profile = await prisma.employeeProfile.findFirst({
                where: { userId: user.id },
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true,
                            role: true,
                            companies: { select: { name: true, website: true, address: true, logoUrl: true } },
                            department: { select: { id: true, name: true } }
                        }
                    },
                    documents: true,
                    digitalDocuments: true,
                    designatRef: true,
                    incrementHistory: {
                        where: { status: 'APPROVED' },
                        orderBy: { effectiveDate: 'desc' }
                    }
                }
            });

            if (!profile) return createErrorResponse('Profile not found', 404);

            // Flatten department for frontend compatibility
            const response = {
                ...profile,
                department: profile.user?.department
            };

            return NextResponse.json(response);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
