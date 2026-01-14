import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [], // Allow all authenticated first, filter by module inside or here
    async (req: NextRequest, user) => {
        try {
            // Check if user has access to WEB_MONITOR module
            if (user.role !== 'SUPER_ADMIN' && !user.allowedModules?.includes('WEB_MONITOR')) {
                return NextResponse.json({ error: 'Access Denied: Web Monitor module not granted' }, { status: 403 });
            }

            const monitors = await prisma.websiteMonitor.findMany({
                where: user.companyId ? { companyId: user.companyId } : {},
                orderBy: { createdAt: 'desc' },
                include: {
                    logs: {
                        take: 1,
                        orderBy: { checkedAt: 'desc' }
                    }
                }
            });
            return NextResponse.json(monitors);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            // Check if user has access to WEB_MONITOR module
            if (user.role !== 'SUPER_ADMIN' && !user.allowedModules?.includes('WEB_MONITOR')) {
                return NextResponse.json({ error: 'Access Denied: Web Monitor module not granted' }, { status: 403 });
            }

            const body = await req.json();
            const { name, url, category, frequency, notifyEmail, notifyWhatsapp } = body;

            if (!name || !url) {
                return createErrorResponse('Name and URL are required', 400);
            }

            // Simple URL validation
            try {
                new URL(url);
            } catch {
                return createErrorResponse('Invalid URL format', 400);
            }

            const monitor = await prisma.websiteMonitor.create({
                data: {
                    name,
                    url,
                    category,
                    frequency: parseInt(frequency) || 5,
                    notifyEmail: notifyEmail ?? true,
                    notifyWhatsapp: notifyWhatsapp ?? true,
                    companyId: user.companyId,
                    status: 'PENDING'
                }
            });

            return NextResponse.json(monitor, { status: 201 });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
