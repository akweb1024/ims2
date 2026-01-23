import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// GET - Fetch author's manuscripts
export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const status = searchParams.get('status');

            // Find manuscripts where user is an author
            const manuscripts = await prisma.article.findMany({
                where: {
                    authors: {
                        some: {
                            email: user.email
                        }
                    },
                    ...(status && { manuscriptStatus: status as any })
                },
                include: {
                    journal: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    authors: {
                        orderBy: { displayOrder: 'asc' }
                    },
                    statusHistory: {
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    },
                    plagiarismReport: {
                        select: {
                            status: true,
                            similarityScore: true,
                            checkedDate: true
                        }
                    },
                    qualityReport: {
                        select: {
                            status: true,
                            overallScore: true,
                            checkedDate: true
                        }
                    },
                    revisions: {
                        orderBy: { submittedAt: 'desc' }
                    },
                    reviews: {
                        where: { status: 'COMPLETED' },
                        select: {
                            id: true,
                            rating: true,
                            recommendation: true,
                            createdAt: true
                        }
                    }
                },
                orderBy: { submissionDate: 'desc' }
            });

            return NextResponse.json(manuscripts);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
