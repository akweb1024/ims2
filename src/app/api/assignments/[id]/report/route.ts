import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { sendEmail, EmailTemplates } from '@/lib/email';

// GET /api/assignments/[id]/report - Get review report
export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id: assignmentId } = await params;

            const assignment = await prisma.reviewAssignment.findUnique({
                where: { id: assignmentId },
                include: {
                    reviewer: true,
                    report: true
                }
            });

            if (!assignment) {
                return createErrorResponse('Assignment not found', 404);
            }

            // Check permissions
            const isReviewer = assignment.reviewer.userId === user.id;
            const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);

            if (!isReviewer && !isAdmin) {
                return createErrorResponse('Forbidden', 403);
            }

            if (!assignment.report) {
                return createErrorResponse('Report not found', 404);
            }

            return NextResponse.json(assignment.report);
        } catch (error) {
            console.error('Report GET Error:', error);
            return createErrorResponse(error);
        }
    }
);

// POST /api/assignments/[id]/report - Submit review report
export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id: assignmentId } = await params;
            const body = await req.json();
            const {
                overallRating,
                originality,
                methodology,
                clarity,
                significance,
                commentsToEditor,
                commentsToAuthor,
                recommendation,
                confidentialComments
            } = body;

            // Validate required fields
            if (!overallRating || !originality || !methodology || !clarity || !significance || !commentsToEditor || !recommendation) {
                return createErrorResponse('All rating fields, commentsToEditor, and recommendation are required', 400);
            }

            // Validate ratings are between 1-5
            const ratings = [overallRating, originality, methodology, clarity, significance];
            if (ratings.some(r => r < 1 || r > 5)) {
                return createErrorResponse('All ratings must be between 1 and 5', 400);
            }

            // Verify assignment exists and belongs to user
            const assignment = await prisma.reviewAssignment.findUnique({
                where: { id: assignmentId },
                include: {
                    reviewer: {
                        include: {
                            user: true
                        }
                    },
                    report: true,
                    article: true,
                    assignedByUser: true
                }
            });

            if (!assignment) {
                return createErrorResponse('Assignment not found', 404);
            }

            // Check if user is the assigned reviewer
            if (assignment.reviewer.userId !== user.id) {
                return createErrorResponse('You are not authorized to submit this review', 403);
            }

            // Check if report already exists
            if (assignment.report) {
                return createErrorResponse('Report already submitted. Use PATCH to update.', 409);
            }

            const report = await prisma.reviewReport.create({
                data: {
                    assignmentId,
                    overallRating,
                    originality,
                    methodology,
                    clarity,
                    significance,
                    commentsToEditor,
                    commentsToAuthor: commentsToAuthor || null,
                    recommendation,
                    confidentialComments: confidentialComments || null,
                    isValidated: false
                }
            });

            // Update assignment status
            await prisma.reviewAssignment.update({
                where: { id: assignmentId },
                data: { status: 'SUBMITTED' }
            });

            // Trigger email notification to admin/editor
            if (assignment.assignedByUser) {
                try {
                    const template = EmailTemplates.reviewSubmitted(
                        assignment.assignedByUser.name || assignment.assignedByUser.email,
                        assignment.article.title,
                        assignment.reviewer.user.name || assignment.reviewer.user.email,
                        recommendation
                    );

                    await sendEmail({
                        to: assignment.assignedByUser.email,
                        ...template
                    });
                } catch (emailError) {
                    console.error('Failed to send submission email:', emailError);
                }
            }

            return NextResponse.json(report, { status: 201 });
        } catch (error) {
            console.error('Report POST Error:', error);
            return createErrorResponse(error);
        }
    }
);

// PATCH /api/assignments/[id]/report - Update review report
export const PATCH = authorizedRoute(
    [],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id: assignmentId } = await params;
            const body = await req.json();

            // Verify assignment and report exist
            const assignment = await prisma.reviewAssignment.findUnique({
                where: { id: assignmentId },
                include: { reviewer: true, report: true }
            });

            if (!assignment || !assignment.report) {
                return createErrorResponse('Assignment or report not found', 404);
            }

            // Check permissions
            const isReviewer = assignment.reviewer.userId === user.id;
            const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);

            if (!isReviewer && !isAdmin) {
                return createErrorResponse('Forbidden', 403);
            }

            // Reviewers cannot edit validated reports
            if (assignment.report.isValidated && isReviewer) {
                return createErrorResponse('Cannot edit validated report', 400);
            }

            const updateData: any = {};

            // Only allow certain fields to be updated
            const allowedFields = [
                'overallRating', 'originality', 'methodology', 'clarity', 'significance',
                'commentsToEditor', 'commentsToAuthor', 'recommendation', 'confidentialComments'
            ];

            allowedFields.forEach(field => {
                if (body[field] !== undefined) {
                    updateData[field] = body[field];
                }
            });

            // Validate ratings if provided
            const ratingFields = ['overallRating', 'originality', 'methodology', 'clarity', 'significance'];
            for (const field of ratingFields) {
                if (updateData[field] && (updateData[field] < 1 || updateData[field] > 5)) {
                    return createErrorResponse(`${field} must be between 1 and 5`, 400);
                }
            }

            const report = await prisma.reviewReport.update({
                where: { id: assignment.report.id },
                data: updateData
            });

            return NextResponse.json(report);
        } catch (error) {
            console.error('Report PATCH Error:', error);
            return createErrorResponse(error);
        }
    }
);
