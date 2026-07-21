import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { listEmployees } from '@/lib/insights/queries';
import { INSIGHTS_ROLES } from '../roles';

/** GET /api/insights/employees?query=&department=&limit= — company-scoped employee search. */
export const GET = authorizedRoute(INSIGHTS_ROLES, async (req: NextRequest, user) => {
    try {
        if (!user.companyId) throw new ValidationError('Company context is required');
        const sp = req.nextUrl.searchParams;
        const data = await listEmployees(prisma, {
            companyId: user.companyId,
            query: sp.get('query') ?? undefined,
            department: sp.get('department') ?? undefined,
            limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
        });
        return NextResponse.json(data);
    } catch (error) {
        return handleApiError(error, '/api/insights/employees');
    }
});
