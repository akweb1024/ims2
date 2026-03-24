import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { buildRoleGuideMarkdown, ROLE_GUIDE_ARTICLE_CATEGORY, ROLE_GUIDE_ARTICLES } from '@/lib/knowledge-base';

async function ensureRoleGuideArticle(role: string, authorId: string) {
    const guide = ROLE_GUIDE_ARTICLES[role] || ROLE_GUIDE_ARTICLES.CUSTOMER;
    const existing = await prisma.knowledgeArticle.findFirst({
        where: {
            category: ROLE_GUIDE_ARTICLE_CATEGORY,
            targetRole: role,
            title: guide.title,
            isActive: true,
        },
    });

    if (existing) return existing;

    return prisma.knowledgeArticle.create({
        data: {
            title: guide.title,
            content: buildRoleGuideMarkdown(role),
            category: ROLE_GUIDE_ARTICLE_CATEGORY,
            targetRole: role,
            authorId,
            status: 'PUBLISHED',
            publishedAt: new Date(),
            lastEditedBy: authorId,
            revisions: {
                create: {
                    editorId: authorId,
                    version: 1,
                    title: guide.title,
                    content: buildRoleGuideMarkdown(role),
                    category: ROLE_GUIDE_ARTICLE_CATEGORY,
                    targetRole: role,
                    status: 'PUBLISHED',
                    notes: 'Initial role guide provisioning',
                }
            }
        },
    });
}

export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await ensureRoleGuideArticle(user.role, user.id);

        const articles = await prisma.knowledgeArticle.findMany({
            where: {
                isActive: true,
                category: ROLE_GUIDE_ARTICLE_CATEGORY,
                status: 'PUBLISHED',
                OR: [
                    { targetRole: user.role },
                    { targetRole: 'ALL' },
                ],
            },
            include: {
                author: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(articles);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
