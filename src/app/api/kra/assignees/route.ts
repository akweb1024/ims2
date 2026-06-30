import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { GROUP_WIDE_ROLES } from '@/lib/kra/scope';

const MANAGERIAL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER'];

// GET /api/kra/assignees — employees the actor may assign KRAs to.
//  - MANAGER / TEAM_LEADER → their downline (+ self)
//  - ADMIN / SUPER_ADMIN / HR / HR_MANAGER → company-wide
// Returns EmployeeProfile id (what the assign endpoints expect) + display info.
export const GET = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
    try {
        if (!user.companyId) return createErrorResponse('Company association required', 403);

        const select = {
            id: true,
            userId: true,
            designationId: true,
            user: { select: { name: true, email: true, departmentId: true, department: { select: { name: true } } } },
        } as const;

        let rows;
        if (GROUP_WIDE_ROLES.has(user.role)) {
            rows = await prisma.employeeProfile.findMany({
                where: { user: { companyId: user.companyId, isActive: true } },
                select,
                take: 500,
            });
        } else {
            const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
            rows = await prisma.employeeProfile.findMany({
                where: { userId: { in: [...downline, user.id] } },
                select,
            });
        }

        const assignees = rows
            .map((p) => ({
                employeeId: p.id,
                userId: p.userId,
                name: p.user?.name || p.user?.email || 'Unknown',
                departmentId: p.user?.departmentId ?? null,
                departmentName: p.user?.department?.name ?? null,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({ assignees });
    } catch (error) {
        return createErrorResponse(error);
    }
});
