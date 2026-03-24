import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await context.params;
        const article = await prisma.knowledgeArticle.findUnique({
            where: { id },
            include: {
                author: { select: { id: true, email: true, name: true } },
                revisions: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        editor: { select: { id: true, email: true, name: true } }
                    }
                }
            }
        });

        if (!article || !article.isActive) {
            return NextResponse.json({ error: 'Article not found' }, { status: 404 });
        }

        const isPrivileged = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);
        const allowedRole = article.targetRole === 'ALL' || article.targetRole === (user.role === 'CUSTOMER' ? 'CUSTOMER' : 'STAFF');

        if (!isPrivileged && (!allowedRole || article.status !== 'PUBLISHED')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.knowledgeArticle.update({
            where: { id },
            data: { views: { increment: 1 } }
        });

        return NextResponse.json({
            ...article,
            views: article.views + 1
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await context.params;
        const body = await req.json();
        const existing = await prisma.knowledgeArticle.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

        if (body.restoreRevisionId) {
            const revision = await prisma.knowledgeArticleRevision.findFirst({
                where: {
                    id: body.restoreRevisionId,
                    articleId: existing.id,
                },
            });

            if (!revision) {
                return NextResponse.json({ error: 'Revision not found' }, { status: 404 });
            }

            const restoreStatus = revision.status;
            const restoredArticle = await prisma.$transaction(async (tx) => {
                await tx.knowledgeArticleRevision.create({
                    data: {
                        articleId: existing.id,
                        editorId: user.id,
                        version: existing.version,
                        title: existing.title,
                        content: existing.content,
                        category: existing.category,
                        targetRole: existing.targetRole,
                        status: existing.status,
                        notes: body.revisionNotes || `Snapshot before restoring version ${revision.version}`,
                    }
                });

                return tx.knowledgeArticle.update({
                    where: { id },
                    data: {
                        title: revision.title,
                        content: revision.content,
                        category: revision.category,
                        targetRole: revision.targetRole,
                        status: restoreStatus,
                        version: existing.version + 1,
                        lastEditedBy: user.id,
                        ...(restoreStatus === 'PUBLISHED' ? { publishedAt: existing.publishedAt || new Date() } : {}),
                        ...(restoreStatus === 'IN_REVIEW' ? { reviewedAt: new Date() } : {}),
                    },
                    include: {
                        author: { select: { id: true, email: true, name: true } },
                        revisions: {
                            orderBy: { createdAt: 'desc' },
                            include: {
                                editor: { select: { id: true, email: true, name: true } }
                            }
                        }
                    }
                });
            });

            return NextResponse.json(restoredArticle);
        }

        const nextStatus = body.status || existing.status;
        const updateData: any = {
            ...(body.title !== undefined ? { title: body.title } : {}),
            ...(body.content !== undefined ? { content: body.content } : {}),
            ...(body.category !== undefined ? { category: body.category } : {}),
            ...(body.targetRole !== undefined ? { targetRole: body.targetRole } : {}),
            ...(body.status !== undefined ? { status: body.status } : {}),
            ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
            version: existing.version + 1,
            lastEditedBy: user.id,
        };

        if (nextStatus === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
            updateData.publishedAt = new Date();
        }
        if (nextStatus === 'IN_REVIEW' && existing.status !== 'IN_REVIEW') {
            updateData.reviewedAt = new Date();
        }

        const article = await prisma.$transaction(async (tx) => {
            await tx.knowledgeArticleRevision.create({
                data: {
                    articleId: existing.id,
                    editorId: user.id,
                    version: existing.version,
                    title: existing.title,
                    content: existing.content,
                    category: existing.category,
                    targetRole: existing.targetRole,
                    status: existing.status,
                    notes: body.revisionNotes || `Snapshot before version ${existing.version + 1}`,
                }
            });

            return tx.knowledgeArticle.update({
                where: { id },
                data: updateData,
                include: {
                    author: { select: { id: true, email: true, name: true } },
                    revisions: {
                        orderBy: { createdAt: 'desc' },
                        include: {
                            editor: { select: { id: true, email: true, name: true } }
                        }
                    }
                }
            });
        });

        return NextResponse.json(article);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
