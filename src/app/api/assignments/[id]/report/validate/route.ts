import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { sendEmail, EmailTemplates } from '@/lib/email';

// POST /api/assignments/[id]/report/validate - Validate review report
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id: assignmentId } = await params;
            const body = await req.json();
            const { isValidated, rejectionReason } = body;

            if (isValidated === undefined) {
                return createErrorResponse('isValidated field is required', 400);
            }

            if (!isValidated && !rejectionReason) {
                return createErrorResponse('rejectionReason is required when rejecting a report', 400);
            }

            // Verify assignment and report exist
            const assignment = await prisma.reviewAssignment.findUnique({
                where: { id: assignmentId },
                include: {
                    report: true,
                    reviewer: {
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
                            }
                        }
                    },
                    article: {
                        select: {
                            id: true,
                            title: true,
                            journalId: true
                        }
                    }
                }
            });

            if (!assignment || !assignment.report) {
                return createErrorResponse('Assignment or report not found', 404);
            }

            if (assignment.report.isValidated) {
                return createErrorResponse('Report is already validated', 400);
            }

            // Update report
            const report = await prisma.reviewReport.update({
                where: { id: assignment.report.id },
                data: {
                    isValidated,
                    validatedBy: user.id,
                    validatedDate: new Date(),
                    rejectionReason: isValidated ? null : rejectionReason
                }
            });

            // Update assignment status
            await prisma.reviewAssignment.update({
                where: { id: assignmentId },
                data: {
                    status: isValidated ? 'VALIDATED' : 'REJECTED'
                }
            });

            // If validated, increment completed reviews count
            if (isValidated) {
                await prisma.journalReviewer.update({
                    where: { id: assignment.reviewerId },
                    data: {
                        completedReviews: {
                            increment: 1
                        }
                    }
                });

                // Auto-generate certificate
                const certificateNumber = `REV-${Date.now()}-${assignment.reviewerId.substring(0, 8).toUpperCase()}`;

                const certificate = await prisma.reviewCertificate.create({
                    data: {
                        reviewerId: assignment.reviewerId,
                        articleId: assignment.article.id,
                        journalId: assignment.article.journalId,
                        certificateNumber,
                        reviewDate: new Date(),
                        articleTitle: assignment.article.title,
                        reviewerName: assignment.reviewer.user.name || assignment.reviewer.user.email,
                        journalName: assignment.reviewer.journal.name,
                        issuedBy: user.id
                    }
                });

                // Trigger email notification to reviewer with certificate
                try {
                    const template = EmailTemplates.reportValidated(
                        assignment.reviewer.user.name || assignment.reviewer.user.email,
                        assignment.article.title,
                        assignment.reviewer.journal.name,
                        certificate.certificateNumber
                    );

                    await sendEmail({
                        to: assignment.reviewer.user.email,
                        ...template
                    });
                } catch (emailError) {
                    console.error('Failed to send validation email:', emailError);
                }
            } else {
                // Trigger email notification for rejection
                try {
                    const template = EmailTemplates.reportRejected(
                        assignment.reviewer.user.name || assignment.reviewer.user.email,
                        assignment.article.title,
                        rejectionReason
                    );

                    await sendEmail({
                        to: assignment.reviewer.user.email,
                        ...template
                    });
                } catch (emailError) {
                    console.error('Failed to send rejection email:', emailError);
                }
            }

            return NextResponse.json({
                success: true,
                report,
                message: isValidated ? 'Report validated and certificate generated' : 'Report rejected'
            });
        } catch (error) {
            console.error('Report Validation Error:', error);
            return createErrorResponse(error);
        }
    }
);
