'use server';

import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function getAuthorManuscripts() {
    const user = await getAuthenticatedUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    try {
        // Find manuscripts where user is an author
        const manuscripts = await prisma.article.findMany({
            where: {
                authors: {
                    some: {
                        email: user.email
                    }
                }
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

        return manuscripts;
    } catch (error) {
        console.error('Failed to fetch manuscripts:', error);
        throw new Error('Failed to fetch manuscripts');
    }
}
