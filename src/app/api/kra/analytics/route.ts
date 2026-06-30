import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getKraTeamAnalytics } from '@/lib/kra/analytics';
import type { KraPeriodType } from '@/lib/kra/period';

const MANAGERIAL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER'];
const VALID_PERIODS = new Set(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY']);

// GET /api/kra/analytics?periodType=MONTHLY&periodRef=ISO&departmentId=
//  Team (manager/TL → downline) or company-wide (admin/HR) KRA analytics for charts.
export const GET = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
    try {
        if (!user.companyId) return createErrorResponse('Company association required', 403);

        const { searchParams } = new URL(req.url);
        const periodTypeRaw = (searchParams.get('periodType') || 'MONTHLY').toUpperCase();
        if (!VALID_PERIODS.has(periodTypeRaw)) return createErrorResponse('Invalid periodType', 400);
        const periodType = periodTypeRaw as KraPeriodType;
        const refParam = searchParams.get('periodRef');
        const ref = refParam ? new Date(refParam) : new Date();
        if (Number.isNaN(ref.getTime())) return createErrorResponse('Invalid periodRef', 400);
        const departmentId = searchParams.get('departmentId') || null;

        const analytics = await getKraTeamAnalytics({
            actor: { id: user.id, role: user.role, companyId: user.companyId },
            periodType,
            ref,
            departmentId,
        });

        return NextResponse.json(analytics);
    } catch (error) {
        return createErrorResponse(error);
    }
});
