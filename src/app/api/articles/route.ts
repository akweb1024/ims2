import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, _user) => {
        try {
            const { searchParams } = new URL(req.url);
            const status = searchParams.get('status');
            const search = searchParams.get('search');

            const whereClause: any = {};

            if (status && status !== 'ALL') {
                whereClause.status = status;
            }

            if (search) {
                whereClause.title = { contains: search, mode: 'insensitive' };
            }

            const articles = await prisma.article.findMany({
                where: whereClause,
                include: {
                    journal: { select: { name: true } },
                    authors: { where: { isCorresponding: true }, take: 1 },
                    issue: { select: { volumeId: true, issueNumber: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            });

            return NextResponse.json(articles);
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);
