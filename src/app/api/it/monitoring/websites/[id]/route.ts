import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const urlPath = req.nextUrl.pathname.split('/');
            const id = urlPath[urlPath.length - 1]; // Robust ID extraction
            const body = await req.json();
            const { name, url, frequency, notifyEmail, notifyWhatsapp, isPaused } = body;

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
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_ADMIN'],
    async (req: NextRequest, user) => {
        try {
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
