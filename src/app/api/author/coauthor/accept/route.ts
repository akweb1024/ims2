import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';

// POST - Accept or decline co-author invitation
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, action, name, affiliation } = body;

        if (!token || !action) {
            return createErrorResponse('Token and action are required', 400);
        }

        if (!['accept', 'decline'].includes(action)) {
            return createErrorResponse('Invalid action. Must be "accept" or "decline"', 400);
        }

        // Find invitation
        const invitation = await prisma.coAuthorInvitation.findUnique({
            where: { token },
            include: {
                article: {
                    include: {
                        authors: true,
                        journal: true
                    }
                }
            }
        });

        if (!invitation) {
            return createErrorResponse('Invalid invitation token', 404);
        }

        // Check if already responded
        if (invitation.status !== 'PENDING') {
            return createErrorResponse(`Invitation already ${invitation.status.toLowerCase()}`, 400);
        }

        // Check expiration
        if (new Date() > invitation.expiresAt) {
            await prisma.coAuthorInvitation.update({
                where: { id: invitation.id },
                data: { status: 'EXPIRED' }
            });
            return createErrorResponse('Invitation has expired', 400);
        }

        if (action === 'accept') {
            // Add as co-author in transaction
            await prisma.$transaction(async (tx) => {
                // Get current max display order
                const maxOrder = invitation.article.authors.reduce(
                    (max, author) => Math.max(max, author.displayOrder),
                    0
                );

                // Add as author
                await tx.articleAuthor.create({
                    data: {
                        articleId: invitation.articleId,
                        name: name || invitation.name || invitation.email,
                        email: invitation.email,
                        affiliation: affiliation || invitation.affiliation,
                        isCorresponding: false,
                        displayOrder: maxOrder + 1
                    }
                });

                // Update invitation status
                await tx.coAuthorInvitation.update({
                    where: { id: invitation.id },
                    data: {
                        status: 'ACCEPTED',
                        respondedAt: new Date()
                    }
                });
            });

            return NextResponse.json({
                success: true,
                message: 'You have been added as a co-author',
                manuscript: {
                    id: invitation.article.id,
                    title: invitation.article.title,
                    journal: invitation.article.journal.name
                }
            });

        } else {
            // Decline invitation
            await prisma.coAuthorInvitation.update({
                where: { id: invitation.id },
                data: {
                    status: 'DECLINED',
                    respondedAt: new Date()
                }
            });

            return NextResponse.json({
                success: true,
                message: 'Invitation declined'
            });
        }

    } catch (error) {
        console.error('Co-author response error:', error);
        return createErrorResponse(error);
    }
}

// GET - Verify invitation token
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
            return createErrorResponse('Token is required', 400);
        }

        const invitation = await prisma.coAuthorInvitation.findUnique({
            where: { token },
            include: {
                article: {
                    select: {
                        id: true,
                        title: true,
                        abstract: true,
                        journal: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                inviter: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });

        if (!invitation) {
            return createErrorResponse('Invalid invitation token', 404);
        }

        // Check expiration
        const isExpired = new Date() > invitation.expiresAt;
        const isValid = invitation.status === 'PENDING' && !isExpired;

        return NextResponse.json({
            valid: isValid,
            invitation: {
                email: invitation.email,
                name: invitation.name,
                affiliation: invitation.affiliation,
                status: invitation.status,
                expiresAt: invitation.expiresAt,
                manuscript: invitation.article,
                inviter: invitation.inviter
            }
        });

    } catch (error) {
        return createErrorResponse(error);
    }
}
