import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createNotification } from '@/lib/notifications';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthenticatedUser();
        const { id } = await params;

        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { reviewerId, dueDate } = await req.json();

        // 1. Create the review record
        const review = await prisma.review.create({
            data: {
                articleId: id,
                reviewerId,
                dueDate: dueDate ? new Date(dueDate) : null,
                status: 'PENDING'
            },
            include: {
                article: { select: { title: true } }
            }
        });

        // 2. Update article status
        await prisma.article.update({
            where: { id },
            data: { status: 'UNDER_REVIEW' }
        });

        // 3. Notify the reviewer
        await createNotification({
            userId: reviewerId,
            title: 'New Review Assignment',
            message: `You have been assigned to review the manuscript: "${review.article.title}"`,
            type: 'INFO',
            link: `/dashboard/editorial/reviews/${review.id}`
        });

        return NextResponse.json({ success: true, review });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthenticatedUser();
        const { id } = await params;

        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { issueId } = await req.json();

        if (!issueId) return NextResponse.json({ error: 'Issue ID required' }, { status: 400 });

        const article = await prisma.article.update({
            where: { id },
            data: {
                issueId,
                status: 'ACCEPTED' 
            }
        });

        return NextResponse.json(article);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
