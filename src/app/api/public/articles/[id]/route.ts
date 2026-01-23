import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const article = await prisma.article.findUnique({
            where: { id, status: 'PUBLISHED' },
            include: {
                journal: { select: { name: true, id: true } },
                issue: { select: { issueNumber: true, volume: { select: { volumeNumber: true, year: true } }, month: true } },
                authors: { select: { name: true, affiliation: true } },
                versions: { take: 1, orderBy: { versionNumber: 'desc' }, select: { fileUrl: true } }
            }
        });

        if (!article) return createErrorResponse('Article not found', 404);

        return NextResponse.json(article);
    } catch (error) {
        return createErrorResponse(error);
    }
}
