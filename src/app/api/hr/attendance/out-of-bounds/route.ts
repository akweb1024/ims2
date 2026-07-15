import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { canAccessAllCompanies } from '@/lib/access-policy';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            // Prisma drops an undefined key rather than matching null, so
            // `companyId: user.companyId || undefined` returned every company's
            // attendance records to a null-company user.
            const where: any = { workFrom: 'OFFICE', isGeofenced: false };
            if (!canAccessAllCompanies(user)) {
                if (!user.companyId) return NextResponse.json([]);
                where.companyId = user.companyId;
            }

            const outOfBounds = await prisma.attendance.findMany({
                where,
                include: {
                    employee: {
                        include: { user: { select: { email: true } } }
                    }
                },
                orderBy: { date: 'desc' }
            });

            return NextResponse.json(outOfBounds);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
