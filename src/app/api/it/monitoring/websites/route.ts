import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_ADMIN'],
    async (req: NextRequest, user) => {
        try {
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
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { name, url, frequency, notifyEmail, notifyWhatsapp } = body;

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
