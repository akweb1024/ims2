import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
        try {
            const { id: paperId } = await context.params;
            const { reviewerId } = await req.json();

            if (!reviewerId) {
                return createErrorResponse('Reviewer ID is required', 400);
            }

            // Check if already assigned
            const existing = await prisma.paperReview.findFirst({
                where: { paperId, reviewerId }
            });

            if (existing) {
                return createErrorResponse('Reviewer already assigned to this paper', 400);
            }

            const review = await prisma.paperReview.create({
                data: {
                    paperId,
                    reviewerId,
                    score: 0,
                    decision: 'PENDING',
                    comments: ''
                }
            });

            // Update paper status to UNDER_REVIEW if it was SUBMITTED
            await prisma.conferencePaper.update({
                where: { id: paperId },
                data: { reviewStatus: 'UNDER_REVIEW' }
            });

            return NextResponse.json(review);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
