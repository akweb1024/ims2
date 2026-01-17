import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
                journal: {
                    select: { name: true }
                },
                authors: {
                    where: { isCorresponding: true },
                    take: 1
                },
                issue: {
                    select: { volumeId: true, issueNumber: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 50
        });

        return NextResponse.json(articles);
    } catch (error) {
        console.error('Error fetching articles:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
