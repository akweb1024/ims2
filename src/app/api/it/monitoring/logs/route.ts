import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            // Check if user has access to WEB_MONITOR module
            if (user.role !== 'SUPER_ADMIN' && !user.allowedModules?.includes('WEB_MONITOR')) {
                return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
            }
            const url = new URL(req.url);
            const monitorId = url.searchParams.get('monitorId');
            const limit = parseInt(url.searchParams.get('limit') || '50');

            const where: any = {};
            if (monitorId) where.monitorId = monitorId;

            const logs = await prisma.websiteMonitorLog.findMany({
                where,
                orderBy: { checkedAt: 'desc' },
                take: limit,
                include: {
                    monitor: {
                        select: { name: true, url: true }
                    }
                }
            });

            return NextResponse.json(logs);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
