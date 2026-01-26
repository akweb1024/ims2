import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createNotification } from '@/lib/system-notifications';
import { generateCertificate } from '@/lib/certificate-utils';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthenticatedUser();
        const { id } = await params;

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { rating, commentsToEditor, commentsToAuthor, recommendation } = body;

        // 1. Verify this review belongs to the user
        const existing = await prisma.review.findUnique({
            where: { id },
            include: { article: true }
        });

        if (!existing || existing.reviewerId !== user.id) {
            return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
        }

        // 2. Update the review
        const review = await prisma.review.update({
            where: { id },
            data: {
                rating: parseInt(rating),
                commentsToEditor,
                commentsToAuthor,
                recommendation,
                status: 'COMPLETED'
            }
        });

        // 2b. Generate Certificate for Reviewer
        await generateCertificate({
            userId: user.id,
            type: 'REVIEWER',
            title: 'Certificate of Reviewing',
            description: `Verify that ${user.email} has completed a peer review for the article "${existing.article.title}".`
        });

        // 3. Notify the Editorial Team
        const staff = await prisma.user.findMany({
            where: { role: { in: ['SUPER_ADMIN', 'EDITOR', 'MANAGER'] } },
            select: { id: true }
        });

        for (const member of staff) {
            await createNotification({
                userId: member.id,
                title: 'Review Completed',
                message: `Review completed for "${existing.article.title}" by ${user.email}`,
                type: 'SUCCESS',
                link: `/dashboard/editorial`
            });
        }

        return NextResponse.json({ success: true, review });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
