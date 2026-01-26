import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createNotification } from '@/lib/system-notifications';

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

import { StorageService } from '@/lib/storage';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthenticatedUser();
        const { id } = await params;

        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { issueId } = await req.json();

        if (!issueId) return NextResponse.json({ error: 'Issue ID required' }, { status: 400 });

        // Fetch issue details for movement
        const issue = await prisma.journalIssue.findUnique({
            where: { id: issueId },
            include: { volume: true }
        });

        if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });

        // Update article issue assignment
        const article = await prisma.article.findUnique({
            where: { id },
            include: { versions: true }
        });

        if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

        // Move current article file if it exists
        let updatedFileUrl = article.fileUrl;
        const meta = {
            journalId: article.journalId,
            volumeNumber: issue.volume.volumeNumber,
            issueNumber: issue.issueNumber
        };

        if (article.fileUrl) {
            updatedFileUrl = await StorageService.moveFile(article.fileUrl, 'publications', meta);
        }

        // Update all versions to move their files too
        for (const version of article.versions) {
            if (version.fileUrl) {
                const newVersionUrl = await StorageService.moveFile(version.fileUrl, 'publications', meta);
                await prisma.articleVersion.update({
                    where: { id: version.id },
                    data: { fileUrl: newVersionUrl }
                });
            }
        }

        const updatedArticle = await prisma.article.update({
            where: { id },
            data: {
                issueId,
                status: 'ACCEPTED',
                fileUrl: updatedFileUrl
            }
        });

        return NextResponse.json(updatedArticle);

    } catch (error: any) {
        console.error('Issue Assignment Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

