import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { employeeKraGoals, attendanceSummary, performanceIndex } from '@/lib/insights/queries';
import { INSIGHTS_ROLES } from '../roles';

/**
 * GET /api/insights/employee?ref=&period=&month= — one employee's KRA goals,
 * attendance summary and PerformanceIndex for a period, combined.
 */
export const GET = authorizedRoute(INSIGHTS_ROLES, async (req: NextRequest, user) => {
    try {
        if (!user.companyId) throw new ValidationError('Company context is required');
        const sp = req.nextUrl.searchParams;
        const ref = sp.get('ref')?.trim();
        if (!ref) throw new ValidationError('An employee reference (ref) is required');
        const period = sp.get('period') ?? undefined;
        const month = sp.get('month') ?? undefined;
        const companyId = user.companyId;

        const [goals, attendance, performance] = await Promise.all([
            employeeKraGoals(prisma, { companyId, employee: ref, period }),
            attendanceSummary(prisma, { companyId, employee: ref, period, month }),
            performanceIndex(prisma, { companyId, employee: ref, period }),
        ]);

        if (goals.notFound) {
            return NextResponse.json({ error: `No employee matched "${ref}".` }, { status: 404 });
        }

        return NextResponse.json({
            employee: goals.employee,
            goals,
            attendance,
            performance,
        });
    } catch (error) {
        return handleApiError(error, '/api/insights/employee');
    }
});
