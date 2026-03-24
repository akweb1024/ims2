import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const isPrivileged = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);

        const articles = await prisma.knowledgeArticle.findMany({
            where: {
                isActive: true,
                category: category || undefined,
                status: isPrivileged ? (status as any || undefined) : 'PUBLISHED',
                title: search ? { contains: search, mode: 'insensitive' } : undefined,
                OR: [
                    { targetRole: 'ALL' },
                    { targetRole: user.role === 'CUSTOMER' ? 'CUSTOMER' : 'STAFF' }
                ]
            },
            include: {
                author: { select: { id: true, email: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(articles);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { title, content, category, targetRole, status } = body;

        const article = await prisma.knowledgeArticle.create({
            data: {
                title,
                content,
                category,
                targetRole: targetRole || 'ALL',
                authorId: user.id,
                status: status || 'PUBLISHED',
                publishedAt: (status || 'PUBLISHED') === 'PUBLISHED' ? new Date() : null,
                reviewedAt: (status || 'PUBLISHED') === 'IN_REVIEW' ? new Date() : null,
                lastEditedBy: user.id,
                revisions: {
                    create: {
                        editorId: user.id,
                        version: 1,
                        title,
                        content,
                        category,
                        targetRole: targetRole || 'ALL',
                        status: status || 'PUBLISHED',
                        notes: 'Initial article creation',
                    }
                }
            }
        });

        return NextResponse.json(article);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
