import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// GET /api/journals/[id]/reviewers - List all reviewers for a journal
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id: journalId } = await params;
            const { searchParams } = new URL(req.url);
            const isActive = searchParams.get('isActive');
            const specialization = searchParams.get('specialization');

            const where: any = { journalId };

            if (isActive !== null) {
                where.isActive = isActive === 'true';
            }

            if (specialization) {
                where.specialization = {
                    has: specialization
                };
            }

            const reviewers = await prisma.journalReviewer.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    _count: {
                        select: {
                            assignments: true,
                            certificates: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return NextResponse.json(reviewers);
        } catch (error) {
            console.error('Reviewers GET Error:', error);
            return createErrorResponse(error);
        }
    }
);

// POST /api/journals/[id]/reviewers - Add a new reviewer
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id: journalId } = await params;
            const body = await req.json();
            const { userId, specialization, bio } = body;

            if (!userId || !specialization || !Array.isArray(specialization)) {
                return createErrorResponse('userId and specialization (array) are required', 400);
            }

            // Check if reviewer already exists
            const existing = await prisma.journalReviewer.findUnique({
                where: {
                    journalId_userId: {
                        journalId,
                        userId
                    }
                }
            });

            if (existing) {
                return createErrorResponse('This user is already a reviewer for this journal', 409);
            }

            // Verify user exists
            const userExists = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!userExists) {
                return createErrorResponse('User not found', 404);
            }

            const reviewer = await prisma.journalReviewer.create({
                data: {
                    journalId,
                    userId,
                    specialization,
                    bio: bio || null,
                    isActive: true
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });

            return NextResponse.json(reviewer, { status: 201 });
        } catch (error) {
            console.error('Reviewer POST Error:', error);
            return createErrorResponse(error);
        }
    }
);
