import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, context: { params: Promise<{ mid: string }> }) => {
        try {
            const params = await context.params;
            const { mid } = params;
            const body = await req.json();

            const courseModule = await prisma.courseModule.update({
                where: { id: mid },
                data: body
            });

            return NextResponse.json(courseModule);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, context: { params: Promise<{ mid: string }> }) => {
        try {
            const params = await context.params;
            const { mid } = params;

            await prisma.courseModule.delete({
                where: { id: mid }
            });

            return NextResponse.json({ success: true });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
