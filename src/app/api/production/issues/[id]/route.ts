import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'EDITOR'],
    async (req: NextRequest, user) => {
        try {
            const { pathname } = new URL(req.url);
            const id = pathname.split('/').pop();
            const body = await req.json();

            const existing = await prisma.journalIssue.findUnique({
                where: { id },
                include: { volume: { include: { journal: true } } }
            });

            if (!existing) return createErrorResponse('Issue not found', 404);

            if (user.role === 'EDITOR' && existing.volume.journal.editorId !== user.id) {
                return createErrorResponse('Forbidden', 403);
            }

            // Planned release date: present-and-empty clears it, a value sets it,
            // absent leaves it unchanged.
            let plannedReleaseAt: Date | null | undefined;
            if ('plannedReleaseAt' in body) {
                if (!body.plannedReleaseAt) {
                    plannedReleaseAt = null;
                } else {
                    const d = new Date(body.plannedReleaseAt);
                    if (isNaN(d.getTime())) return createErrorResponse('Invalid plannedReleaseAt date', 400);
                    plannedReleaseAt = d;
                }
            }

            const updated = await prisma.journalIssue.update({
                where: { id },
                data: {
                    issueNumber: body.issueNumber ? parseInt(body.issueNumber) : undefined,
                    month: body.month,
                    title: body.title,
                    status: body.status,
                    expectedManuscripts: body.expectedManuscripts ? parseInt(body.expectedManuscripts) : undefined,
                    isComplete: body.isComplete,
                    validationStatus: body.validationStatus,
                    plannedReleaseAt,
                    publishedAt: body.status === 'PUBLISHED' ? new Date() : undefined
                }
            });

            // Log Audit
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'update',
                    entity: 'journal_issue',
                    entityId: updated.id,
                    changes: JSON.stringify(body)
                }
            });

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
