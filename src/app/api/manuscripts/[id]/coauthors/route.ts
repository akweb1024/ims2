import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { sendCoAuthorInvitation } from '@/lib/email-service';
import crypto from 'crypto';

// POST - Invite co-author
export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user, context) => {
        try {
            const { id: articleId } = await context.params;
            const body = await req.json();
            const { email, name, affiliation } = body;

            if (!email) {
                return createErrorResponse('Email is required', 400);
            }

            // Verify article exists and user is an author
            const article = await prisma.article.findUnique({
                where: { id: articleId },
                include: {
                    authors: true,
                    journal: true
                }
            });

            if (!article) {
                return createErrorResponse('Manuscript not found', 404);
            }

            const isAuthor = article.authors.some(a => a.email === user.email);
            if (!isAuthor) {
                return createErrorResponse('Unauthorized: Only authors can invite co-authors', 403);
            }

            // Check if already an author
            const alreadyAuthor = article.authors.some(a => a.email === email);
            if (alreadyAuthor) {
                return createErrorResponse('This person is already a co-author', 400);
            }

            // Check for pending invitation
            const pendingInvitation = await prisma.coAuthorInvitation.findFirst({
                where: {
                    articleId,
                    email,
                    status: 'PENDING',
                    expiresAt: { gt: new Date() }
                }
            });

            if (pendingInvitation) {
                return createErrorResponse('An invitation is already pending for this email', 400);
            }

            // Generate secure token
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

            // Create invitation
            const invitation = await prisma.coAuthorInvitation.create({
                data: {
                    articleId,
                    email,
                    name,
                    affiliation,
                    invitedBy: user.id,
                    token,
                    expiresAt
                }
            });

            // Send invitation email
            await sendCoAuthorInvitation({
                articleId,
                coAuthorEmail: email,
                coAuthorName: name || email,
                inviterName: (user as any).name || user.email,
                token
            }).catch(err => console.error('Email send failed:', err));

            return NextResponse.json({
                success: true,
                invitation: {
                    id: invitation.id,
                    email: invitation.email,
                    status: invitation.status,
                    expiresAt: invitation.expiresAt
                }
            }, { status: 201 });

        } catch (error) {
            console.error('Co-author invitation error:', error);
            return createErrorResponse(error);
        }
    }
);

// GET - Get co-author invitations
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

            // Fetch invitations
            const invitations = await prisma.coAuthorInvitation.findMany({
                where: { articleId },
                include: {
                    inviter: {
                        select: {
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return NextResponse.json(invitations);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
