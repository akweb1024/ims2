import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { z } from 'zod';

const reviewSchema = z.object({
    type: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
    period: z.string(),
    revenueAchievement: z.number().optional(),
    kraProgress: z.string().optional(),
    kpiProgress: z.record(z.string(), z.any()).optional(),
    comments: z.string().optional(),
    status: z.string().optional()
});

// GET: Fetch reviews for a specific increment
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER'],
    async (req: NextRequest, user, { params }: any) => {
        try {
            const incrementId = params.id;

            const reviews = await prisma.salaryIncrementReview.findMany({
                where: { incrementRecordId: incrementId },
                include: {
                    reviewer: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: { date: 'desc' }
            });

            return NextResponse.json(reviews);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// POST: Create a new review for an increment
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER'],
    async (req: NextRequest, user, { params }: any) => {
        try {
            const incrementId = params.id;
            const body = await req.json();
            const validatedData = reviewSchema.parse(body);

            // Check if increment exists
            const increment = await prisma.salaryIncrementRecord.findUnique({
                where: { id: incrementId }
            });

            if (!increment) {
                return createErrorResponse('Increment record not found', 404);
            }

            const review = await prisma.salaryIncrementReview.create({
                data: {
                    incrementRecordId: incrementId,
                    reviewerId: user.id,
                    type: validatedData.type,
                    period: validatedData.period,
                    revenueAchievement: validatedData.revenueAchievement || 0,
                    kraProgress: validatedData.kraProgress,
                    kpiProgress: validatedData.kpiProgress || {},
                    comments: validatedData.comments,
                    status: validatedData.status || 'COMPLETED'
                },
                include: {
                    reviewer: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });

            return NextResponse.json(review);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return createErrorResponse('Validation failed', 400, (error as any).errors);
            }
            return createErrorResponse(error);
        }
    }
);
