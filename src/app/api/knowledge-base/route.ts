import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');

        const articles = await prisma.knowledgeArticle.findMany({
            where: {
                isActive: true,
                category: category || undefined,
                OR: [
                    { targetRole: 'ALL' },
                    { targetRole: user.role === 'CUSTOMER' ? 'CUSTOMER' : 'STAFF' }
                ]
            },
            include: {
                author: { select: { email: true } }
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
        const { title, content, category, targetRole } = body;

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
