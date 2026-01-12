import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const articles = await prisma.article.findMany({
            include: {
                journal: { select: { name: true } },
                authors: true,
                issue: { select: { title: true, issueNumber: true } }
            },
            orderBy: { submissionDate: 'desc' }
        });

        return NextResponse.json(articles);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { title, abstract, journalId, authorName } = body; // Simplified for MVP

        const article = await prisma.article.create({
            data: {
                title,
                abstract,
                journalId,
                status: 'SUBMITTED',
                authors: {
                    create: {
                        name: authorName,
                        email: user.email,
                        isCorresponding: true
                    }
                }
            }
        });

        // Log Audit
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'create',
                entity: 'article',
                entityId: article.id,
                changes: JSON.stringify({ title, journalId, authorName })
            }
        });

        return NextResponse.json(article);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
