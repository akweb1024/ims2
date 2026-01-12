import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// GET /api/journals/[id]/reviewers/[reviewerId] - Get reviewer details
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, context: { params: Promise<{ id: string, reviewerId: string }> }) => {
        try {
            const { reviewerId } = await context.params;

            const reviewer = await prisma.journalReviewer.findUnique({
                where: { id: reviewerId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    journal: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    assignments: {
                        include: {
                            article: {
                                select: {
                                    id: true,
                                    title: true,
                                    status: true
                                }
                            },
                            report: true
                        },
                        orderBy: { assignedDate: 'desc' }
                    },
                    certificates: {
                        orderBy: { issueDate: 'desc' }
                    },
                    _count: {
                        select: {
                            assignments: true,
                            certificates: true
                        }
                    }
                }
            });

            if (!reviewer) {
                return createErrorResponse('Reviewer not found', 404);
            }

            return NextResponse.json(reviewer);
        } catch (error) {
            console.error('Reviewer GET Error:', error);
            return createErrorResponse(error);
        }
    }
);

// PATCH /api/journals/[id]/reviewers/[reviewerId] - Update reviewer
export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, context: { params: Promise<{ id: string, reviewerId: string }> }) => {
        try {
            const { reviewerId } = await context.params;
            const body = await req.json();
            const { specialization, bio, isActive } = body;

            const updateData: any = {};

            if (specialization !== undefined) {
                if (!Array.isArray(specialization)) {
                    return createErrorResponse('specialization must be an array', 400);
                }
                updateData.specialization = specialization;
            }

            if (bio !== undefined) updateData.bio = bio;
            if (isActive !== undefined) updateData.isActive = isActive;

            const reviewer = await prisma.journalReviewer.update({
                where: { id: reviewerId },
                data: updateData,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });

            return NextResponse.json(reviewer);
        } catch (error) {
            console.error('Reviewer PATCH Error:', error);
            return createErrorResponse(error);
        }
    }
);

// DELETE /api/journals/[id]/reviewers/[reviewerId] - Remove reviewer
export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user: any, context: { params: Promise<{ id: string, reviewerId: string }> }) => {
        try {
            const { reviewerId } = await context.params;

            // Check if reviewer has pending assignments
            const pendingAssignments = await prisma.reviewAssignment.count({
                where: {
                    reviewerId,
                    status: {
                        in: ['PENDING', 'IN_PROGRESS']
                    }
                }
            });

            if (pendingAssignments > 0) {
                return createErrorResponse(
                    `Cannot delete reviewer with ${pendingAssignments} pending assignment(s)`,
                    400
                );
            }

            await prisma.journalReviewer.delete({
                where: { id: reviewerId }
            });

            return NextResponse.json({ success: true, message: 'Reviewer removed successfully' });
        } catch (error) {
            console.error('Reviewer DELETE Error:', error);
            return createErrorResponse(error);
        }
    }
);
