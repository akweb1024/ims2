import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { getISTDayRange } from '@/lib/hr/work-agenda';
import { companyScopeWhere } from '@/lib/company-scope';
import { computeCapacityMap } from '@/lib/hr/capacity';

export const dynamic = 'force-dynamic';

// GET /api/hr/capacity?employeeIds=a,b,c&date=YYYY-MM-DD
// Per-employee daily capacity ({ shiftHours, plannedHours, remainingHours,
// overload }) for the assign screens — computed by the same helper as the
// agenda guardrails so two managers assigning to one person see one number.
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER'],
    async (req: NextRequest, user: any) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeIds = String(searchParams.get('employeeIds') || '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            if (!employeeIds.length) {
                return createErrorResponse('employeeIds is required', 400);
            }
            if (employeeIds.length > 200) {
                return createErrorResponse('Too many employeeIds (max 200)', 400);
            }

            const dateParam = searchParams.get('date');
            let baseDate: Date | undefined;
            if (dateParam) {
                const parsed = new Date(`${dateParam}T00:00:00.000+05:30`);
                if (Number.isNaN(parsed.getTime())) {
                    return createErrorResponse('Invalid date (expected YYYY-MM-DD)', 400);
                }
                baseDate = parsed;
            }
            const { start, end } = getISTDayRange(baseDate);

            // Scope: the caller may only read capacity for employees they can assign to.
            const profiles = await prisma.employeeProfile.findMany({
                where: {
                    id: { in: employeeIds },
                    user: companyScopeWhere(user),
                },
                select: { id: true, userId: true },
            });
            let visible = profiles;
            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
                const allowed = new Set([user.id, ...downline]);
                visible = profiles.filter((p) => allowed.has(p.userId));
            }
            const visibleIds = visible.map((p) => p.id);

            const capacityMap = await computeCapacityMap(visibleIds, start, end, companyScopeWhere(user));

            return NextResponse.json({
                date: start,
                capacities: visibleIds.map((id) => capacityMap.get(id)).filter(Boolean),
            });
        } catch (error: any) {
            return createErrorResponse(error?.message || error);
        }
    }
);
