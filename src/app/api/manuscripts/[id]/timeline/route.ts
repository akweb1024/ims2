import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// GET - Get manuscript timeline (status history + events)
export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user, context) => {
        try {
            const { id: articleId } = await context.params;

            // Verify article exists and user has access
            const article = await prisma.article.findUnique({
                where: { id: articleId },
                include: {
                    authors: true,
                    journal: {
                        select: {
                            journalManagerId: true
                        }
                    }
                }
            });

            if (!article) {
                return createErrorResponse('Manuscript not found', 404);
            }

            // Check access: author or journal manager
            const isAuthor = article.authors.some(a => a.email === user.email);
            const isManager = article.journal.journalManagerId === user.id;
            const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);

            if (!isAuthor && !isManager && !isAdmin) {
                return createErrorResponse('Unauthorized', 403);
            }

            // Fetch timeline events
            const [statusHistory, revisions, communications, plagiarismReport, qualityReport] = await Promise.all([
                prisma.manuscriptStatusHistory.findMany({
                    where: { articleId },
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                                role: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }),
                prisma.manuscriptRevision.findMany({
                    where: { articleId },
                    include: {
                        submitter: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    },
                    orderBy: { submittedAt: 'asc' }
                }),
                prisma.manuscriptCommunication.findMany({
                    where: { articleId },
                    include: {
                        fromUser: {
                            select: {
                                name: true,
                                email: true
                            }
                        },
                        toUser: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    },
                    orderBy: { sentAt: 'asc' }
                }),
                prisma.plagiarismReport.findUnique({
                    where: { articleId },
                    include: {
                        checker: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    }
                }),
                prisma.qualityReport.findUnique({
                    where: { articleId },
                    include: {
                        checker: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    }
                })
            ]);

            // Build unified timeline
            const timeline = [];

            // Add status changes
            statusHistory.forEach(event => {
                timeline.push({
                    type: 'status_change',
                    timestamp: event.createdAt,
                    title: `Status changed to ${event.toStatus.replace(/_/g, ' ')}`,
                    description: event.reason || event.comments,
                    user: event.user,
                    data: {
                        fromStatus: event.fromStatus,
                        toStatus: event.toStatus
                    }
                });
            });

            // Add revisions
            revisions.forEach(revision => {
                timeline.push({
                    type: 'revision',
                    timestamp: revision.submittedAt,
                    title: `Revision ${revision.revisionNumber} submitted`,
                    description: revision.changesDescription,
                    user: revision.submitter,
                    data: {
                        revisionNumber: revision.revisionNumber,
                        status: revision.status
                    }
                });
            });

            // Add communications (only if author or manager)
            if (isAuthor || isManager || isAdmin) {
                communications.forEach(comm => {
                    timeline.push({
                        type: 'communication',
                        timestamp: comm.sentAt,
                        title: comm.subject,
                        description: comm.message.substring(0, 200),
                        user: comm.fromUser,
                        data: {
                            communicationType: comm.type,
                            isRead: comm.isRead
                        }
                    });
                });
            }

            // Add plagiarism check
            if (plagiarismReport) {
                timeline.push({
                    type: 'plagiarism_check',
                    timestamp: plagiarismReport.checkedDate,
                    title: `Plagiarism check ${plagiarismReport.status.toLowerCase()}`,
                    description: `Similarity score: ${plagiarismReport.similarityScore}%`,
                    user: plagiarismReport.checker,
                    data: {
                        status: plagiarismReport.status,
                        similarityScore: plagiarismReport.similarityScore,
                        tool: plagiarismReport.toolUsed
                    }
                });
            }

            // Add quality check
            if (qualityReport) {
                timeline.push({
                    type: 'quality_check',
                    timestamp: qualityReport.checkedDate,
                    title: `Quality check ${qualityReport.status.toLowerCase()}`,
                    description: `Overall score: ${qualityReport.overallScore}/10`,
                    user: qualityReport.checker,
                    data: {
                        status: qualityReport.status,
                        overallScore: qualityReport.overallScore
                    }
                });
            }

            // Sort by timestamp
            timeline.sort((a, b) => {
                const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                return timeA - timeB;
            });

            return NextResponse.json({
                manuscript: {
                    id: article.id,
                    title: article.title,
                    manuscriptId: article.manuscriptId,
                    currentStatus: article.manuscriptStatus,
                    submissionDate: article.submissionDate
                },
                timeline
            });

        } catch (error) {
            console.error('Timeline fetch error:', error);
            return createErrorResponse(error);
        }
    }
);
