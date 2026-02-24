import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const limit = parseInt(searchParams.get('limit') || '50');

        const articles = await prisma.knowledgeArticle.findMany({
            where: {
                isActive: true,
                AND: [
                    category ? { category } : {},
                    search ? {
                        OR: [
                            { title: { contains: search, mode: 'insensitive' } },
                            { content: { contains: search, mode: 'insensitive' } }
                        ]
                    } : {},
                    {
                        OR: [
                            { targetRole: 'ALL' },
                            { targetRole: user.role }
                        ]
                    }
                ]
            },
            include: {
                author: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        return NextResponse.json(articles);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { title, content, category, targetRole } = body;

        if (!title || !content || !category) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const article = await prisma.knowledgeArticle.create({
            data: {
                title,
                content,
                category,
                targetRole: targetRole || 'ALL',
                authorId: user.id
            }
        });

        return NextResponse.json(article);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
