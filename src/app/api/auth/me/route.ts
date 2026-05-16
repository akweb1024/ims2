import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getAvailableCompaniesForUser } from '@/lib/access-policy';

export const dynamic = 'force-dynamic';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const fullUser = await prisma.user.findUnique({
                where: { id: user.id },
                include: {
                    company: true,
                    companies: true,
                    customerProfile: true
                }
            });

            if (!fullUser) {
                return createErrorResponse('User not found', 404);
            }

            const availableCompanies = await getAvailableCompaniesForUser(user);

            const { password, ...userWithoutPassword } = fullUser;

            return NextResponse.json({
                user: userWithoutPassword,
                availableCompanies
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
