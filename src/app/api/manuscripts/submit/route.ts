import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { sendSubmissionAcknowledgment } from '@/lib/notification-service';

// POST - Submit new manuscript
export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const {
                journalId,
                title,
                abstract,
                keywords,
                fileUrl,
                authors, // Array of { name, email, affiliation, isCorresponding }
                draftId // Optional: if converting from draft
            } = body;

            // Validation
            if (!journalId || !title || !fileUrl) {
                return createErrorResponse('Journal ID, title, and file are required', 400);
            }

            // Check if journal is active
            const journal = await prisma.journal.findUnique({
                where: { id: journalId }
            });

            if (!journal || !journal.isActive) {
                return createErrorResponse('Journal not found or inactive', 404);
            }

            // Create manuscript in a transaction
            const result = await prisma.$transaction(async (tx) => {
                // Create article
                const article = await tx.article.create({
                    data: {
                        title,
                        abstract,
                        keywords,
                        journalId,
                        fileUrl,
                        status: 'SUBMITTED',
                        manuscriptStatus: 'SUBMITTED',
                        submissionDate: new Date(),
                        currentRound: 1
                    }
                });

                // Generate manuscript ID
                const manuscriptId = `MS-${journal.name.substring(0, 3).toUpperCase()}-${new Date().getFullYear()}-${article.id.substring(0, 8)}`;

                await tx.article.update({
                    where: { id: article.id },
                    data: { manuscriptId }
                });

                // Add authors
                if (authors && authors.length > 0) {
                    await tx.articleAuthor.createMany({
                        data: authors.map((author: any, index: number) => ({
                            articleId: article.id,
                            userId: author.email === user.email ? user.id : null,
                            name: author.name,
                            email: author.email,
                            affiliation: author.affiliation,
                            isCorresponding: author.isCorresponding || false,
                            displayOrder: index
                        }))
                    });
                }

                // Create initial status history
                await tx.manuscriptStatusHistory.create({
                    data: {
                        articleId: article.id,
                        toStatus: 'SUBMITTED',
                        changedBy: user.id,
                        reason: 'Initial submission'
                    }
                });

                // Mark draft as submitted if converting from draft
                if (draftId) {
                    await tx.manuscriptDraft.update({
                        where: { id: draftId },
                        data: { isSubmitted: true }
                    });
                }

                return { article, manuscriptId };
            });

            // Send acknowledgment email
            const correspondingAuthor = authors?.find((a: any) => a.isCorresponding) || authors?.[0];
            if (correspondingAuthor) {
                await sendSubmissionAcknowledgment({
                    articleId: result.article.id,
                    recipientEmail: correspondingAuthor.email,
                    recipientName: correspondingAuthor.name
                }).catch(err => console.error('Email send failed:', err));
            }

            // Fetch complete article with relations
            const completeArticle = await prisma.article.findUnique({
                where: { id: result.article.id },
                include: {
                    journal: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    authors: true
                }
            });

            return NextResponse.json({
                success: true,
                article: completeArticle,
                manuscriptId: result.manuscriptId
            }, { status: 201 });

        } catch (error) {
            console.error('Submission error:', error);
            return createErrorResponse(error);
        }
    }
);
