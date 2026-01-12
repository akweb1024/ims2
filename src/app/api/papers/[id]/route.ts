import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, context: { params: Promise<{ id: string }> }, user) => {
        try {
            const params = await context.params;
            const { id } = params;

            const paper = await prisma.conferencePaper.findUnique({
                where: { id },
                include: {
                    track: true,
                    conference: true,
                    reviews: {
                        include: {
                            reviewer: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    }
                }
            });

            if (!paper) {
                return createErrorResponse('Paper not found', 404);
            }

            // Access Control: 
            // - Author can see their own paper standard details (reviews might be blind)
            // - Reviewers/Admins can see everything
            // For now, simpler: user.id === paper.userId || role >= MANAGER

            const isAuthor = user.id === paper.userId;
            const isStaff = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'REVIEWER'].includes(user.role);

            if (!isAuthor && !isStaff) {
                return createErrorResponse('Unauthorized', 403);
            }

            // Hide review details from author if strict double-blind (optional, but good practice)
            // For this phase, we'll strip reviewer info if user is author
            if (isAuthor && !isStaff) {
                paper.reviews = paper.reviews.map((r: any) => ({
                    ...r,
                    reviewer: undefined, // Hide reviewer identity
                    reviewerId: undefined
                }));
            }

            return NextResponse.json(paper);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PATCH = authorizedRoute(
    [],
    async (req: NextRequest, context: { params: Promise<{ id: string }> }, user) => {
        try {
            const params = await context.params;
            const { id } = params;
            const body = await req.json();

            const paper = await prisma.conferencePaper.findUnique({
                where: { id }
            });

            if (!paper) {
                return createErrorResponse('Paper not found', 404);
            }

            const isAuthor = user.id === paper.userId;
            const isStaff = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);

            if (!isAuthor && !isStaff) {
                return createErrorResponse('Unauthorized', 403);
            }

            // Allowed fields for author: title, abstract, fileUrl, authors, keywords
            // Allowed fields for staff: everything including status, trackId

            const updateData: any = {};
            if (isAuthor || isStaff) {
                if (body.title) updateData.title = body.title;
                if (body.abstract) updateData.abstract = body.abstract;
                if (body.authors) updateData.authors = body.authors;
                if (body.keywords) updateData.keywords = body.keywords;
                if (body.fileUrl) updateData.fileUrl = body.fileUrl;
                if (body.submissionType) updateData.submissionType = body.submissionType;
            }

            if (isStaff) {
                if (body.trackId) updateData.trackId = body.trackId;
                if (body.status) updateData.status = body.status;
                // Note: reviewStatus and finalDecision usually updated via specific endpoints/actions
            }

            const updatedPaper = await prisma.conferencePaper.update({
                where: { id },
                data: updateData
            });

            return NextResponse.json(updatedPaper);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// Delete paper
export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
        try {
            const params = await context.params;
            const { id } = params;

            await prisma.conferencePaper.delete({
                where: { id }
            });

            return NextResponse.json({ success: true });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
