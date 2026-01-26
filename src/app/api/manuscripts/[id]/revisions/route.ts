import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { sendStatusChangeNotification } from '@/lib/email-service';

// POST - Submit revision
export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user, context) => {
        try {
            const { id: articleId } = await context.params;
            const body = await req.json();
            const { fileUrl, coverLetter, responseToReviewers, changesDescription } = body;

            if (!fileUrl) {
                return createErrorResponse('Revised file is required', 400);
            }

            // Verify article exists and user is an author
            const article = await prisma.article.findUnique({
                where: { id: articleId },
                include: {
                    authors: true,
                    journal: true,
                    revisions: {
                        orderBy: { revisionNumber: 'desc' },
                        take: 1
                    }
                }
            });

            if (!article) {
                return createErrorResponse('Manuscript not found', 404);
            }

            const isAuthor = article.authors.some(a => a.email === user.email);
            if (!isAuthor) {
                return createErrorResponse('Unauthorized: You are not an author of this manuscript', 403);
            }

            // Check if revision is allowed
            if (article.manuscriptStatus !== 'REVISION_REQUIRED') {
                return createErrorResponse('Manuscript is not in revision status', 400);
            }

            // Calculate revision number
            const lastRevisionNumber = article.revisions[0]?.revisionNumber || 0;
            const newRevisionNumber = lastRevisionNumber + 1;

            // Create revision in transaction
            const result = await prisma.$transaction(async (tx) => {
                // Create revision record
                const revision = await tx.manuscriptRevision.create({
                    data: {
                        articleId,
                        revisionNumber: newRevisionNumber,
                        fileUrl,
                        coverLetter,
                        responseToReviewers,
                        changesDescription,
                        submittedBy: user.id,
                        status: 'PENDING'
                    }
                });

                // Update article status
                await tx.article.update({
                    where: { id: articleId },
                    data: {
                        manuscriptStatus: 'REVISED_SUBMITTED',
                        fileUrl // Update to latest file
                    }
                });

                // Create status history
                await tx.manuscriptStatusHistory.create({
                    data: {
                        articleId,
                        fromStatus: 'REVISION_REQUIRED',
                        toStatus: 'REVISED_SUBMITTED',
                        changedBy: user.id,
                        reason: `Revision ${newRevisionNumber} submitted`
                    }
                });

                return revision;
            });

            // Send notification to journal manager
            if (article.journal.journalManagerId) {
                const manager = await prisma.user.findUnique({
                    where: { id: article.journal.journalManagerId }
                });

                if (manager) {
                    await sendStatusChangeNotification({
                        articleId,
                        recipientEmail: manager.email,
                        recipientName: manager.name || 'Journal Manager',
                        newStatus: 'REVISED_SUBMITTED'
                    }).catch(err => console.error('Email send failed:', err));
                }
            }

            return NextResponse.json({
                success: true,
                revision: result,
                message: 'Revision submitted successfully'
            }, { status: 201 });

        } catch (error) {
            console.error('Revision submission error:', error);
            return createErrorResponse(error);
        }
    }
);

// GET - Get revisions for a manuscript
export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user, context) => {
        try {
            const { id: articleId } = await context.params;

            // Verify article exists and user is an author
            const article = await prisma.article.findUnique({
                where: { id: articleId },
                include: {
                    authors: true
                }
            });

            if (!article) {
                return createErrorResponse('Manuscript not found', 404);
            }

            const isAuthor = article.authors.some(a => a.email === user.email);
            if (!isAuthor) {
                return createErrorResponse('Unauthorized', 403);
            }

            // Fetch revisions
            const revisions = await prisma.manuscriptRevision.findMany({
                where: { articleId },
                include: {
                    submitter: {
                        select: {
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: { submittedAt: 'desc' }
            });

            return NextResponse.json(revisions);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
