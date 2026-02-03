import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// POST - Update manuscript status
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER', 'EDITOR_IN_CHIEF', 'MANAGING_EDITOR', 'EDITOR'],
    async (req: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
        try {
            const params = await context.params;
            const { status, comments, reason } = await req.json();

            const article = await prisma.article.findUnique({
                where: { id: params.id },
                select: { id: true, manuscriptStatus: true }
            });

            if (!article) {
                return NextResponse.json({ error: 'Article not found' }, { status: 404 });
            }

            // Update article status and record history
            const updatedArticle = await prisma.$transaction(async (tx) => {
                // 1. Create history record
                await tx.manuscriptStatusHistory.create({
                    data: {
                        articleId: article.id,
                        fromStatus: article.manuscriptStatus,
                        toStatus: status,
                        changedBy: user.id,
                        reason: reason,
                        comments: comments
                    }
                });

                // 2. Update status
                return await tx.article.update({
                    where: { id: article.id },
                    data: { manuscriptStatus: status }
                });
            });

            return NextResponse.json(updatedArticle);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
