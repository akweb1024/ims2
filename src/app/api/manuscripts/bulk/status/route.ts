import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import prisma from '@/lib/prisma';

// POST - Bulk update manuscript status
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
        const { articleIds, toStatus, reason, comments } = body;

        if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
            return NextResponse.json({ error: 'Article IDs array is required' }, { status: 400 });
        }

        if (!toStatus) {
            return NextResponse.json({ error: 'Target status is required' }, { status: 400 });
        }

        // Update all articles
        const updatePromises = articleIds.map(async (articleId) => {
            // Get current status
            const article = await prisma.article.findUnique({
                where: { id: articleId },
                select: { manuscriptStatus: true }
            });

            if (!article) return null;

            // Update article
            await prisma.article.update({
                where: { id: articleId },
                data: {
                    manuscriptStatus: toStatus,
                    ...(toStatus === 'ACCEPTED' && { acceptanceDate: new Date() }),
                    ...(toStatus === 'PUBLISHED' && { publicationDate: new Date() })
                }
            });

            // Create history entry
            await prisma.manuscriptStatusHistory.create({
                data: {
                    articleId,
                    fromStatus: article.manuscriptStatus,
                    toStatus,
                    changedBy: user.id,
                    reason: reason || 'Bulk status update',
                    comments
                }
            });

            return articleId;
        });

        const results = await Promise.all(updatePromises);
        const successCount = results.filter(r => r !== null).length;

        return NextResponse.json({
            success: true,
            updated: successCount,
            total: articleIds.length,
            failed: articleIds.length - successCount
        });
    } catch (error) {
        console.error('Error in bulk status update:', error);
        return NextResponse.json({ error: 'Failed to update statuses' }, { status: 500 });
    }
}
