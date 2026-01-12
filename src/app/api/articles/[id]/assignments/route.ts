import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { sendEmail, EmailTemplates } from '@/lib/email';

// GET /api/articles/[id]/assignments - List assignments for an article
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
        try {
            const { id: articleId } = await context.params;
            const { searchParams } = new URL(req.url);
            const status = searchParams.get('status');
            const round = searchParams.get('round');

            const where: any = { articleId };

            if (status) {
                where.status = status;
            }

            if (round) {
                where.round = parseInt(round);
            }

            const assignments = await prisma.reviewAssignment.findMany({
                where,
                include: {
                    reviewer: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    },
                    assignedByUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    report: true
                },
                orderBy: { assignedDate: 'desc' }
            });

            return NextResponse.json(assignments);
        } catch (error) {
            console.error('Assignments GET Error:', error);
            return createErrorResponse(error);
        }
    }
);

// POST /api/articles/[id]/assignments - Assign reviewer to article
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
        try {
            const { id: articleId } = await context.params;
            const body = await req.json();
            const { reviewerId, dueDate, priority, round, notes } = body;

            if (!reviewerId || !dueDate) {
                return createErrorResponse('reviewerId and dueDate are required', 400);
            }

            // Verify article exists
            const article = await prisma.article.findUnique({
                where: { id: articleId }
            });

            if (!article) {
                return createErrorResponse('Article not found', 404);
            }

            // Verify reviewer exists and is active
            const reviewer = await prisma.journalReviewer.findUnique({
                where: { id: reviewerId }
            });

            if (!reviewer) {
                return createErrorResponse('Reviewer not found', 404);
            }

            if (!reviewer.isActive) {
                return createErrorResponse('Reviewer is not active', 400);
            }

            // Check if reviewer is already assigned to this article in the same round
            const existingAssignment = await prisma.reviewAssignment.findFirst({
                where: {
                    articleId,
                    reviewerId,
                    round: round || 1
                }
            });

            if (existingAssignment) {
                return createErrorResponse('Reviewer is already assigned to this article for this round', 409);
            }

            const assignment = await prisma.reviewAssignment.create({
                data: {
                    articleId,
                    reviewerId,
                    assignedBy: user.id,
                    dueDate: new Date(dueDate),
                    priority: priority || 'NORMAL',
                    round: round || 1,
                    notes: notes || null,
                    status: 'PENDING'
                },
                include: {
                    reviewer: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    },
                    article: {
                        include: {
                            journal: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            });

            // Update reviewer's total reviews count
            await prisma.journalReviewer.update({
                where: { id: reviewerId },
                data: {
                    totalReviews: {
                        increment: 1
                    }
                }
            });

            // Trigger email notification to reviewer
            try {
                const template = EmailTemplates.reviewerAssignment(
                    assignment.reviewer.user.name || assignment.reviewer.user.email,
                    assignment.article.title,
                    assignment.article.journal.name,
                    new Date(dueDate).toLocaleDateString(),
                    assignment.id
                );

                await sendEmail({
                    to: assignment.reviewer.user.email,
                    ...template
                });
            } catch (emailError) {
                console.error('Failed to send assignment email:', emailError);
                // We don't fail the whole request if email fails
            }

            return NextResponse.json(assignment, { status: 201 });
        } catch (error) {
            console.error('Assignment POST Error:', error);
            return createErrorResponse(error);
        }
    }
);
