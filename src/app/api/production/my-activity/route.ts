import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const logs = await prisma.auditLog.findMany({
                where: {
                    userId: user.id,
                    createdAt: { gte: today },
                    entity: { in: ['journal', 'journal_issue', 'article_apc', 'article'] }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Summarize
            const summary = {
                articles: logs.filter(l => l.entity === 'article' || l.entity === 'article_apc').length,
                issues: logs.filter(l => l.entity === 'journal_issue').length,
                journals: logs.filter(l => l.entity === 'journal').length,
                totalActions: logs.length,
                logs: logs.map(l => ({
                    action: l.action,
                    entity: l.entity,
                    at: l.createdAt
                }))
            };

            return NextResponse.json(summary);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
