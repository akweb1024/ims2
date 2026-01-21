import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// Check-in
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const registrationId = id;

            const registration = await prisma.conferenceRegistration.update({
                where: { id: registrationId },
                data: {
                    checkInTime: new Date(),
                    status: 'CHECKED_IN'
                }
            });

            return NextResponse.json(registration);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
