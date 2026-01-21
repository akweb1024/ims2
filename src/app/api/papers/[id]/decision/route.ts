import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const paperId = id;
            const body = await req.json();
            const { decision } = body; // ACCEPTED, REJECTED, REVISION_REQUIRED

            if (!decision) {
                return createErrorResponse('Decision is required', 400);
            }

            const updatedPaper = await prisma.conferencePaper.update({
                where: { id: paperId },
                data: {
                    finalDecision: decision,
                    reviewStatus: 'REVIEWED'
                }
            });

            return NextResponse.json(updatedPaper);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
