/**
 * Unified Work Reports API
 * 
 * Cross-company work report viewing for managers.
 * Allows managers to view work reports submitted by all team members.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getManagerTeamUserIds } from '@/lib/team-auth';
import { getUnifiedWorkReports } from '@/lib/team-service';

/**
 * GET /api/manager/team/work-reports
 * 
 * Get unified work reports view across all team members
 * 
 * Query params:
 * - startDate (optional): Start date (ISO string)
 * - endDate (optional): End date (ISO string)
 * - userId (optional): Filter by specific team member
 * - companyId (optional): Filter by company
 * - status (optional): Filter by status
 */
export const GET = authorizedRoute(
    ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const startDate = searchParams.get('startDate');
            const endDate = searchParams.get('endDate');
            const userId = searchParams.get('userId') || undefined;
            const companyId = searchParams.get('companyId') || undefined;
            const status = searchParams.get('status') || undefined;

            // Use reusable service to fetch work reports
            const reports = await getUnifiedWorkReports(user.id, {
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                userId,
                companyId,
                status
            });

            return NextResponse.json({ reports });


        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
