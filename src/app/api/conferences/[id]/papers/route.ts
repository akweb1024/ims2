import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
        try {
            const params = await context.params;
            const { id: conferenceId } = params;
            const { searchParams } = new URL(req.url);

            // Filters
            const trackId = searchParams.get('trackId');
            const status = searchParams.get('status');
            const userId = searchParams.get('userId');

            const where: any = { conferenceId };

            if (trackId && trackId !== 'all') where.trackId = trackId;
            if (status && status !== 'all') where.status = status;
            if (userId) where.userId = userId;

            // Security: Role-based filtering
            const isStaff = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);
            const isReviewer = user.role === 'REVIEWER';

            if (!isStaff) {
                if (isReviewer) {
                    // Reviewers only see papers where they are assigned a review
                    where.reviews = {
                        some: {
                            reviewerId: user.id
                        }
                    };
                } else {
                    // Standard users only see their own submissions
                    where.userId = user.id;
                }
            }

            const papers = await prisma.conferencePaper.findMany({
                where,
                include: {
                    track: true,
                    reviews: {
                        select: {
                            score: true,
                            decision: true
                        }
                    },
                    conference: {
                        select: {
                            title: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return NextResponse.json(papers);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
        try {
            const params = await context.params;
            const { id: conferenceId } = params;
            const body = await req.json();

            // Check if CFP is open
            const conference = await prisma.conference.findUnique({
                where: { id: conferenceId }
            });

            if (!conference) {
                return createErrorResponse('Conference not found', 404);
            }

            const now = new Date();
            if (conference.cfpStartDate && now < conference.cfpStartDate) {
                return createErrorResponse('Call for papers has not started yet', 400);
            }
            if (conference.cfpEndDate && now > conference.cfpEndDate) {
                return createErrorResponse('Call for papers has ended', 400);
            }

            const {
                title,
                abstract,
                authors,
                submissionType,
                keywords,
                trackId,
                fileUrl
            } = body;

            if (!title || !abstract || !authors) {
                return createErrorResponse('Missing required fields', 400);
            }

            const paper = await prisma.conferencePaper.create({
                data: {
                    conferenceId,
                    userId: user.id || null, // Optional link to user if logged in
                    title,
                    abstract,
                    authors,
                    submissionType: submissionType || 'ABSTRACT',
                    keywords,
                    trackId: trackId || null,
                    fileUrl,
                    status: 'SUBMITTED',
                    reviewStatus: 'PENDING'
                }
            });

            return NextResponse.json(paper);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
