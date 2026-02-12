/**
 * Unified Performance & KPI API
 * 
 * Cross-company performance and KPI viewing for managers.
 * Allows managers to view KPIs and performance reviews for all team members.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
// import { getManagerTeamUserIds } from '@/lib/team-auth';
import { getUnifiedPerformance } from '@/lib/team-service';

/**
 * GET /api/manager/team/performance
 * 
 * Get unified performance and KPI data across all team members
 * 
 * Query params:
 * - userId (optional): Filter by specific team member
 * - companyId (optional): Filter by company
 * - period (optional): Filter by period (monthly, quarterly, yearly)
 */
export const GET = authorizedRoute(
    ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const userId = searchParams.get('userId') || undefined;
            const companyId = searchParams.get('companyId') || undefined;
            const period = searchParams.get('period') || undefined;

            // Get unified performance data using the service
            const performance = await getUnifiedPerformance(user.id, {
                userId,
                companyId,
                period
            });

            return NextResponse.json({ performance });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
