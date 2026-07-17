import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

// GET /api/articles/[id] - Fetch a single article
// EDITOR included: the assign-reviewer page loads the article through this
// endpoint before listing the journal's reviewer pool.
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'],
    async (req: NextRequest, _user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;

            const article = await prisma.article.findUnique({
                where: { id },
                include: {
                    journal: { select: { id: true, name: true } },
                    authors: { orderBy: { displayOrder: 'asc' } },
                    issue: { select: { volumeId: true, issueNumber: true } }
                }
            });

            if (!article) {
                return NextResponse.json({ error: 'Article not found' }, { status: 404 });
            }

            return NextResponse.json(article);
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);
