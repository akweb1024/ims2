import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// GET /api/conferences/[id]/feedback - Get conference feedback summary
export const GET = authorizedRoute(
    ['ADMIN', 'SUPER_ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;

            const [feedbacks, stats] = await Promise.all([
                prisma.conferenceFeedback.findMany({
                    where: { conferenceId: id },
                    include: {
                        user: {
                            select: { name: true, email: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 50
                }),
                prisma.conferenceFeedback.aggregate({
                    where: { conferenceId: id },
                    _avg: { rating: true },
                    _count: { _all: true }
                })
            ]);

            // Group by category for distribution
            const categoryStats = await prisma.conferenceFeedback.groupBy({
                by: ['category'],
                where: { conferenceId: id },
                _avg: { rating: true },
                _count: { _all: true }
            });

            return NextResponse.json({
                feedbacks,
                statistics: {
                    averageRating: stats._avg.rating || 0,
                    totalResponses: stats._count._all,
                    byCategory: categoryStats.map(c => ({
                        category: c.category || 'GENERAL',
                        avgRating: c._avg.rating || 0,
                        count: c._count._all
                    }))
                }
            });

        } catch (error) {
            console.error('Conference Feedback GET Error:', error);
            return createErrorResponse(error);
        }
    }
);

// POST /api/conferences/[id]/feedback - attendee submits feedback
export const POST = authorizedRoute(
    [], // Any authenticated user can submit feedback
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const { rating, content, category } = await req.json();

            if (!rating || !content) {
                return createErrorResponse('Rating and content are required', 400);
            }

            // Verify the user was registered for this conference
            const registration = await prisma.conferenceRegistration.findFirst({
                where: {
                    conferenceId: id,
                    userId: user.id
                }
            });

            if (!registration && user.role !== 'SUPER_ADMIN') {
                return createErrorResponse('Only registered attendees can provide feedback', 403);
            }

            const feedback = await prisma.conferenceFeedback.create({
                data: {
                    conferenceId: id,
                    userId: user.id,
                    rating: Number(rating),
                    content,
                    category: category || 'GENERAL'
                }
            });

            return NextResponse.json({
                message: 'Thank you for your feedback!',
                feedback
            });

        } catch (error) {
            console.error('Conference Feedback POST Error:', error);
            return createErrorResponse(error);
        }
    }
);
