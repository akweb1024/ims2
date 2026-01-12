import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const journalId = searchParams.get('journalId');

            if (!journalId) {
                return NextResponse.json({ error: 'journalId is required' }, { status: 400 });
            }

            const issues = await prisma.journalIssue.findMany({
                where: {
                    volume: { journalId }
                },
                include: {
                    volume: true,
                    _count: {
                        select: { articles: true }
                    }
                },
                orderBy: [
                    { volume: { year: 'desc' } },
                    { issueNumber: 'desc' }
                ]
            });

            return NextResponse.json(issues);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'EDITOR'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { volumeId, issueNumber, month, title, expectedManuscripts } = body;

            // Verify if user is editor of this journal
            const volume = await prisma.journalVolume.findUnique({
                where: { id: volumeId },
                include: { journal: true }
            });

            if (!volume) return createErrorResponse('Volume not found', 404);

            if (user.role === 'EDITOR' && volume.journal.editorId !== user.id) {
                return createErrorResponse('Forbidden: You are not the editor of this journal', 403);
            }

            const issue = await prisma.journalIssue.create({
                data: {
                    volumeId,
                    issueNumber: parseInt(issueNumber),
                    month,
                    title,
                    expectedManuscripts: parseInt(expectedManuscripts || '0'),
                    status: 'PLANNED'
                }
            });

            // Log Audit
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'create',
                    entity: 'journal_issue',
                    entityId: issue.id,
                    changes: JSON.stringify(body)
                }
            });

            return NextResponse.json(issue);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
