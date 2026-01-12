import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// GET /api/reviewer/certificates - Get my certificates
export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user: any) => {
        try {
            // Get reviewer profiles for this user
            const reviewerProfiles = await prisma.journalReviewer.findMany({
                where: {
                    userId: user.id
                },
                select: {
                    id: true
                }
            });

            if (reviewerProfiles.length === 0) {
                return NextResponse.json([]);
            }

            const reviewerIds = reviewerProfiles.map(r => r.id);

            const certificates = await prisma.reviewCertificate.findMany({
                where: {
                    reviewerId: { in: reviewerIds }
                },
                include: {
                    journal: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    article: {
                        select: {
                            id: true,
                            title: true
                        }
                    },
                    issuer: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: { issueDate: 'desc' }
            });

            return NextResponse.json(certificates);
        } catch (error) {
            console.error('Certificates GET Error:', error);
            return createErrorResponse(error);
        }
    }
);
