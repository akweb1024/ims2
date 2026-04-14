import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

import { sendEmail, EmailTemplates } from '@/lib/email';
 
// POST /api/reviewer/reports/[id]/validate - Admin validates a review report
export const POST = authorizedRoute(
    ['ADMIN', 'SUPER_ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
 
            // 1. Fetch the report with all necessary relations
            const report = await prisma.reviewReport.findUnique({
                where: { id },
                include: {
                    assignment: {
                        include: {
                            article: {
                                select: {
                                    id: true,
                                    title: true,
                                    journalId: true
                                }
                            },
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
                            }
                        }
                    }
                }
            });
 
            if (!report) {
                return createErrorResponse('Review report not found', 404);
            }
 
            if (report.isValidated) {
                return createErrorResponse('This report has already been validated', 400);
            }
 
            const { assignment } = report;
            const reviewerName = assignment.reviewer.user.name || assignment.reviewer.user.email;
            const journalName = assignment.reviewer.journal.name;
            const articleTitle = assignment.article.title;
 
            // 2. Generate Certificate Number
            const certNumber = `CERT-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`;
 
            // 3. Perform Transactional update
            const result = await prisma.$transaction(async (tx) => {
                // Mark report as validated
                const updatedReport = await tx.reviewReport.update({
                    where: { id },
                    data: {
                        isValidated: true,
                        validatedBy: user.id,
                        validatedDate: new Date()
                    }
                });
 
                // Update assignment status
                await tx.reviewAssignment.update({
                    where: { id: report.assignmentId },
                    data: { status: 'VALIDATED' }
                });
 
                // Create Review Certificate
                const certificate = await tx.reviewCertificate.create({
                    data: {
                        reviewerId: assignment.reviewerId,
                        articleId: assignment.article.id,
                        journalId: assignment.article.journalId || assignment.reviewer.journalId,
                        certificateNumber: certNumber,
                        reviewDate: report.submittedDate,
                        issueDate: new Date(),
                        articleTitle,
                        reviewerName,
                        journalName,
                        issuedBy: user.id,
                        pdfUrl: `/certificates/${certNumber}.pdf` // Placeholder for actual PDF generation service
                    }
                });
 
                return { updatedReport, certificate };
            });
 
            logger.info('Review report validated and certificate issued', { 
                reportId: id, 
                certificateId: result.certificate.id,
                validatedBy: user.id 
            });
 
            // 4. Send Email Notification
            try {
                const emailTemplate = EmailTemplates.reviewCertificateIssued(
                    reviewerName,
                    journalName,
                    certNumber
                );
 
                await sendEmail({
                    to: assignment.reviewer.user.email,
                    subject: emailTemplate.subject,
                    text: emailTemplate.text,
                    html: emailTemplate.html,
                });
            } catch (emailErr) {
                logger.error('Failed to send certificate notification email', emailErr);
                // We don't fail the whole request if only the email fails
            }
 
            return NextResponse.json({
                message: 'Review report validated and certificate issued successfully',
                certificate: result.certificate
            });

        } catch (error) {
            console.error('Review Validation Error:', error);
            return createErrorResponse(error);
        }
    }
);
