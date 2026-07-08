import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// Bulk-assigns (or clears, when shiftId is null) a standing shift on EmployeeProfile.shiftId —
// unlike /api/hr/shifts/roster, this is a persistent assignment (not per calendar day) that
// resolveEffectiveAttendancePolicy uses to derive lateness thresholds automatically.
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company context required', 400);
            const { shiftId, employeeIds } = await req.json();

            if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
                return createErrorResponse('employeeIds is required', 400);
            }

            if (shiftId) {
                const shift = await prisma.shift.findUnique({ where: { id: shiftId }, select: { companyId: true } });
                if (!shift || (user.role !== 'SUPER_ADMIN' && shift.companyId !== user.companyId)) {
                    return createErrorResponse('Shift not found', 404);
                }
            }

            // Only touch employees actually in the caller's own company (SUPER_ADMIN may target any).
            const scoped = await prisma.employeeProfile.findMany({
                where: {
                    id: { in: employeeIds },
                    ...(user.role !== 'SUPER_ADMIN' ? { user: { companyId: user.companyId } } : {})
                },
                select: { id: true }
            });

            const result = await prisma.employeeProfile.updateMany({
                where: { id: { in: scoped.map((e) => e.id) } },
                data: { shiftId: shiftId || null }
            });

            return NextResponse.json({ updated: result.count });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
