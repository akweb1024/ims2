/**
 * Unified Attendance View API
 * 
 * Cross-company attendance viewing for managers.
 * Allows managers to view attendance records for all team members
 * regardless of which company they belong to.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getManagerTeamUserIds } from '@/lib/team-auth';
import { getUnifiedAttendance } from '@/lib/team-service';

/**
 * GET /api/manager/team/attendance
 * 
 * Get unified attendance view across all team members
 * 
 * Query params:
 * - month (optional): Month to view (1-12)
 * - year (optional): Year to view
 * - userId (optional): Filter by specific team member
 * - companyId (optional): Filter by company
 */
export const GET = authorizedRoute(
    ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
            const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
            const userId = searchParams.get('userId') || undefined;
            const companyId = searchParams.get('companyId') || undefined;

            // Use reusable service to fetch attendance
            const attendance = await getUnifiedAttendance(user.id, {
                month,
                year,
                userId,
                companyId
            });

            return NextResponse.json({ attendance });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
