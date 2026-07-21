import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import { MANAGERIAL_ROLES } from '@/lib/kra/scope';
import { computeKraRollupsForCompany } from '@/lib/kra/rollups';
import { computePeriodWindow, normalizePeriod } from '@/lib/kra/period';

export const dynamic = 'force-dynamic';

/**
 * GET /api/kra/rollups?level=TEAM|DEPARTMENT|COMPANY&periodType=MONTHLY&period=2026-07
 *
 * Read the stored team/department/company KRA aggregates. Company-scoped;
 * MANAGER/TEAM_LEADER only see their own TEAM row (their direct reports) plus
 * department/company aggregates; admin/HR see everything. `period` defaults to
 * the current window for the periodType.
 */
export const GET = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
    try {
        if (!user.companyId) return createErrorResponse('Company association required', 403);

        const { searchParams } = new URL(req.url);
        const level = (searchParams.get('level') || '').toUpperCase();
        const periodType = normalizePeriod(searchParams.get('periodType') || 'MONTHLY');
        const period = searchParams.get('period') || computePeriodWindow(periodType, new Date()).label;

        const where: Record<string, unknown> = {
            companyId: user.companyId,
            periodType,
            period,
            ...(level === 'TEAM' || level === 'DEPARTMENT' || level === 'COMPANY' ? { level } : {}),
        };

        // Managers see department/company aggregates but only their own team row.
        if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
            where.OR = [
                { level: { in: ['DEPARTMENT', 'COMPANY'] } },
                { level: 'TEAM', subjectId: user.id },
            ];
        }

        const rollups = await prisma.kraRollup.findMany({
            where: where as never,
            orderBy: [{ level: 'asc' }, { avgIndex: 'desc' }],
            take: 200,
        });

        return NextResponse.json({ periodType, period, rollups });
    } catch (error) {
        return createErrorResponse(error);
    }
});

/**
 * POST /api/kra/rollups — recompute the current period's roll-ups on demand
 * (admin/HR). Body: { periodType? } — defaults MONTHLY.
 */
export const POST = authorizedRoute(['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'], async (req: NextRequest, user) => {
    try {
        if (!user.companyId) return createErrorResponse('Company association required', 403);
        const body = await req.json().catch(() => ({}));
        const periodType = normalizePeriod(String(body?.periodType || 'MONTHLY'));

        const results = await computeKraRollupsForCompany(prisma, { companyId: user.companyId, periodType });
        return NextResponse.json({ ok: true, periodType, results });
    } catch (error) {
        return createErrorResponse(error);
    }
});
