import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'REVIEWER'],
    async (req: NextRequest, context: { params: Promise<{ id: string }> }, user) => {
        try {
            const params = await context.params;
            const { id: paperId } = params;
            const body = await req.json();
            const { score, comments, decision } = body;

            if (score === undefined || !decision) {
                return createErrorResponse('Score and decision are required', 400);
            }

            // Check if already reviewed by this user
            const existingReview = await prisma.paperReview.findFirst({
                where: {
                    paperId,
                    reviewerId: user.id
                }
            });

            if (existingReview) {
                // Update existing review
                const updated = await prisma.paperReview.update({
                    where: { id: existingReview.id },
                    data: {
                        score: parseInt(score),
                        comments,
                        decision, // ACCEPT, REJECT, REVISE
                        submittedAt: new Date()
                    }
                });
                return NextResponse.json(updated);
            } else {
                // Create new review
                const review = await prisma.paperReview.create({
                    data: {
                        paperId,
                        reviewerId: user.id,
                        score: parseInt(score),
                        comments,
                        decision
                    }
                });

                // Update paper status to UNDER_REVIEW if it was PENDING
                await prisma.conferencePaper.updateMany({
                    where: { id: paperId, reviewStatus: 'PENDING' },
                    data: { reviewStatus: 'UNDER_REVIEW' }
                });

                return NextResponse.json(review);
            }
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
