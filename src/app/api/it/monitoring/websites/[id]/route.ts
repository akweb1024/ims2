import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const PATCH = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            // Check if user has access to WEB_MONITOR module
            if (user.role !== 'SUPER_ADMIN' && !user.allowedModules?.includes('WEB_MONITOR')) {
                return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
            }

            const urlPath = req.nextUrl.pathname.split('/');
            const id = urlPath[urlPath.length - 1];
            const body = await req.json();
            const { name, url, category, frequency, notifyEmail, notifyWhatsapp, isPaused } = body;

            if (url) {
                try {
                    new URL(url);
                } catch {
                    return createErrorResponse('Invalid URL format', 400);
                }
            }

            const monitor = await prisma.websiteMonitor.update({
                where: { id },
                data: {
                    name,
                    url,
                    category,
                    frequency: frequency ? parseInt(frequency) : undefined,
                    notifyEmail,
                    notifyWhatsapp,
                    isPaused
                }
            });

            return NextResponse.json(monitor);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const DELETE = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            // Check if user has access to WEB_MONITOR module
            if (user.role !== 'SUPER_ADMIN' && !user.allowedModules?.includes('WEB_MONITOR')) {
                return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
            }

            const urlPath = req.nextUrl.pathname.split('/');
            const id = urlPath[urlPath.length - 1];
            await prisma.websiteMonitor.delete({
                where: { id }
            });

            return NextResponse.json({ success: true });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
