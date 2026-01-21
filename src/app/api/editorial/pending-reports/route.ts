import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// GET /api/editorial/pending-reports - List all submitted reports awaiting validation
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'],
    async (req: NextRequest, user: any) => {
        try {
            const { searchParams } = new URL(req.url);
            const journalId = searchParams.get('journalId');

            const where: any = {
                status: 'SUBMITTED',
                report: { isNot: null }
            };

            if (journalId) {
                where.article = {
                    journalId: journalId
                };
            }

            const pendingAssignments = await prisma.reviewAssignment.findMany({
                where,
                include: {
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
                            title: true
                        }
                    },
                    report: true,
                    assignedByUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: {
                    report: {
                        submittedDate: 'desc'
                    }
                }
            });

            return NextResponse.json(pendingAssignments);
        } catch (error) {
            console.error('Pending Reports GET Error:', error);
            return createErrorResponse(error);
        }
    }
);
