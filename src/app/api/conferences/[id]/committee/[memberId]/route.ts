import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string, memberId: string }> }) => {
        try {
            const { memberId } = await params;
            await prisma.conferenceCommitteeMember.delete({
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
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string, memberId: string }> }) => {
        try {
            const { memberId } = await params;
            const body = await req.json();
            const updated = await prisma.conferenceCommitteeMember.update({
                where: { id: memberId },
                data: body
            });
            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
