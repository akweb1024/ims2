import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { kraRollup } from '@/lib/insights/queries';
import { INSIGHTS_ROLES } from '../roles';

/** GET /api/insights/rollup?level=&period=&subject= — company-scoped KRA roll-ups. */
export const GET = authorizedRoute(INSIGHTS_ROLES, async (req: NextRequest, user) => {
    try {
        if (!user.companyId) throw new ValidationError('Company context is required');
        const sp = req.nextUrl.searchParams;
        const data = await kraRollup(prisma, {
            companyId: user.companyId,
            level: sp.get('level') ?? undefined,
            period: sp.get('period') ?? undefined,
            subject: sp.get('subject') ?? undefined,
        });
        return NextResponse.json(data);
    } catch (error) {
        return handleApiError(error, '/api/insights/rollup');
    }
});
