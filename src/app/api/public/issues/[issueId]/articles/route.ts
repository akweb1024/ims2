import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ issueId: string }> }) {
    try {
        const { issueId } = await params;

        const articles = await prisma.article.findMany({
            where: { issueId, status: 'PUBLISHED' },
            include: {
                authors: { select: { name: true, affiliation: true } },
                versions: { take: 1, orderBy: { versionNumber: 'desc' }, select: { fileUrl: true } }
            },
            orderBy: { title: 'asc' } // Or page number if we had it
        });

        return NextResponse.json(articles);
    } catch (error) {
        return createErrorResponse(error);
    }
}
