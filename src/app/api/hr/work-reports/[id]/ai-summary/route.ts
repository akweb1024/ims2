import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, NotFoundError, AuthorizationError } from '@/lib/error-handler';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { generateAIWorkReportSummary } from '@/lib/hr/workReportSummary';

// On-demand AI-enhanced summary for one work report — the rule-based summary (always present
// as `report.summary` from GET /api/hr/work-reports) is free and instant; this is the optional
// "✨ Enhance with AI" upgrade a manager can trigger from the Review Inbox, via the company's
// configured Gemini key (Settings → Integrations → Gemini).
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'],
    async (req: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await context.params;

            const report = await prisma.workReport.findUnique({
                where: { id },
                include: { employee: true },
            });
            if (!report) throw new NotFoundError('Work report');

            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                if (!subIds.includes(report.employee.userId)) {
                    throw new AuthorizationError('Forbidden: This employee is not in your team');
                }
            }

            const summary = await generateAIWorkReportSummary(report, user.companyId);
            if (!summary) {
                return NextResponse.json(
                    { error: 'AI summary unavailable — configure and test a Gemini key under Settings → Integrations.' },
                    { status: 422 }
                );
            }

            return NextResponse.json({ summary });
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);
