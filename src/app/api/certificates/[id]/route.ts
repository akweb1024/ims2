import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// GET /api/certificates/[id] - Get certificate details
export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await context.params;

            const certificate = await prisma.reviewCertificate.findUnique({
                where: { id },
                include: {
                    reviewer: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    },
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
                }
            });

            if (!certificate) {
                return createErrorResponse('Certificate not found', 404);
            }

            // Check permissions: reviewer can only see their own certificates
            const isOwner = certificate.reviewer.userId === user.id;
            const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);

            if (!isOwner && !isAdmin) {
                return createErrorResponse('Forbidden', 403);
            }

            return NextResponse.json(certificate);
        } catch (error) {
            console.error('Certificate GET Error:', error);
            return createErrorResponse(error);
        }
    }
);
