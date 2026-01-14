import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import prisma from '@/lib/prisma';

// POST - Update manuscript status
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        if (!['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER', 'EDITOR_IN_CHIEF'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { articleId, toStatus, reason, comments } = body;

        if (!articleId || !toStatus) {
            return NextResponse.json({ error: 'Article ID and status are required' }, { status: 400 });
        }

        // Get current article
        const article = await prisma.article.findUnique({
            where: { id: articleId },
            select: { manuscriptStatus: true }
        });

        if (!article) {
            return NextResponse.json({ error: 'Article not found' }, { status: 404 });
        }

        // Update article status
        const updatedArticle = await prisma.article.update({
            where: { id: articleId },
            data: {
                manuscriptStatus: toStatus,
                ...(toStatus === 'ACCEPTED' && { acceptanceDate: new Date() }),
                ...(toStatus === 'PUBLISHED' && { publicationDate: new Date() })
            }
        });

        // Create status history
        await prisma.manuscriptStatusHistory.create({
            data: {
                articleId,
                fromStatus: article.manuscriptStatus,
                toStatus,
                changedBy: user.id,
                reason,
                comments
            }
        });

        return NextResponse.json(updatedArticle);
    } catch (error) {
        console.error('Error updating manuscript status:', error);
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }
}

// GET - Get manuscript status history
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const articleId = searchParams.get('articleId');

        if (!articleId) {
            return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
        }

        const history = await prisma.manuscriptStatusHistory.findMany({
            where: { articleId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(history);
    } catch (error) {
        console.error('Error fetching status history:', error);
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}
