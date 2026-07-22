import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { templateAssignments } from '@/lib/insights/queries';
import { INSIGHTS_ROLES } from '../roles';

/** GET /api/insights/templates?query=&department=&team= — KRA templates with their assigned employees. */
export const GET = authorizedRoute(INSIGHTS_ROLES, async (req: NextRequest, user) => {
    try {
        if (!user.companyId) throw new ValidationError('Company context is required');
        const sp = req.nextUrl.searchParams;
        const data = await templateAssignments(prisma, {
            companyId: user.companyId,
            query: sp.get('query') ?? undefined,
            department: sp.get('department') ?? undefined,
            managerUserId: sp.get('team') ?? undefined,
        });
        return NextResponse.json(data);
    } catch (error) {
        return handleApiError(error, '/api/insights/templates');
    }
});
