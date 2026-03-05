import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';

export const GET = authorizedRoute(
    ['SUPER_ADMIN'],
    async (_req: NextRequest, _user) => {
        try {
            const logs = await prisma.auditLog.findMany({
                take: 100,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { email: true } }
                }
            });

            return NextResponse.json(logs);
        } catch (error) {
            return handleApiError(error, '/api/admin/audit-logs');
        }
    }
);
