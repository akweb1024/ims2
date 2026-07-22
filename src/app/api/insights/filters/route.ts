import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { insightsFilters } from '@/lib/insights/queries';
import { INSIGHTS_ROLES } from '../roles';

/** GET /api/insights/filters — department + team (manager) options for the insights filters. */
export const GET = authorizedRoute(INSIGHTS_ROLES, async (_req: NextRequest, user) => {
    try {
        if (!user.companyId) throw new ValidationError('Company context is required');
        return NextResponse.json(await insightsFilters(prisma, user.companyId));
    } catch (error) {
        return handleApiError(error, '/api/insights/filters');
    }
});
