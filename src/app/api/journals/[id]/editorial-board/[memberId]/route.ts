import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, context: { params: Promise<{ id: string, memberId: string }> }) => {
        try {
            const params = await context.params;
            const { memberId } = params;

            await prisma.editorialBoardMember.delete({
                where: { id: memberId }
            });

            return NextResponse.json({ success: true });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, context: { params: Promise<{ id: string, memberId: string }> }) => {
        try {
            const params = await context.params;
            const { memberId } = params;
            const body = await req.json();

            const member = await prisma.editorialBoardMember.update({
                where: { id: memberId },
                data: body
            });

            return NextResponse.json(member);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
