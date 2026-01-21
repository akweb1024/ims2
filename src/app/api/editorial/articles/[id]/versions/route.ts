import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CUSTOMER'], // Customers (authors) can upload revisions
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const articleId = id;
            const body = await req.json();
            const { fileUrl, changelog } = body;

            // Fetch article
            const article = await prisma.article.findUnique({
                where: { id: articleId }
            });

            if (!article) return createErrorResponse('Article not found', 404);

            // Check ownership (simple check for now)
            // Ideally we check if user is author. For now we trust authenticated user if role is CUSTOMER, assuming UI restricts visibility.
            // But better: check if user.email matches one of the authors.
            const isAuthor = await prisma.articleAuthor.findFirst({
                where: { articleId, email: user.email } // Assuming user.email is reliable linking
            });

            if (!isAuthor && !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'].includes(user.role)) {
                return createErrorResponse('Forbidden', 403);
            }

            const nextVersion = await prisma.articleVersion.count({ where: { articleId } }) + 1;

            const version = await prisma.articleVersion.create({
                data: {
                    articleId,
                    versionNumber: nextVersion,
                    fileUrl,
                    changelog
                }
            });

            // If article was REVISION_REQUESTED, move back to UNDER_REVIEW (or SUBMITTED?)
            // Usually revisions go back to Editor first.
            if (article.status === 'REVISION_REQUESTED') {
                await prisma.article.update({
                    where: { id: articleId },
                    data: {
                        status: 'UNDER_REVIEW', // Or RESUBMITTED
                        currentRound: { increment: 1 }
                    }
                });
            }

            return NextResponse.json(version, { status: 201 });

        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR', 'CUSTOMER', 'STAFF'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const articleId = id;

            const versions = await prisma.articleVersion.findMany({
                where: { articleId },
                orderBy: { versionNumber: 'desc' }
            });

            return NextResponse.json(versions);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
