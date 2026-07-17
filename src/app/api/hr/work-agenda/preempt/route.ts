import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';
import { companyScopeWhere } from '@/lib/company-scope';
import { preemptWithCriticalTask } from '@/lib/hr/preemption';

// POST /api/hr/work-agenda/preempt — insert a critical task at the top of an
// employee's day and defer their other unfinished tasks to tomorrow.
// Deliberately senior-gated (not every manager): preempting someone's day
// affects other managers' assignments too.
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'],
    async (req: NextRequest, user: any) => {
        try {
            const body = await req.json();
            const employeeId = String(body.employeeId || '');
            const title = typeof body.title === 'string' ? body.title.trim() : '';
            const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
            const estimatedHours = body.estimatedHours !== undefined && body.estimatedHours !== null && body.estimatedHours !== ''
                ? Number(body.estimatedHours)
                : null;

            if (!employeeId) return createErrorResponse('employeeId is required', 400);
            if (!title) return createErrorResponse('title is required', 400);
            // Same rule as priority changes: an unexplained preemption is the
            // thing being complained about.
            if (!reason) return createErrorResponse('reason is required', 400);

            const target = await prisma.employeeProfile.findFirst({
                where: { id: employeeId, user: companyScopeWhere(user) },
                select: { id: true },
            });
            if (!target) return createErrorResponse('Employee not found', 404);

            const result = await preemptWithCriticalTask({
                employeeId,
                actorId: user.id,
                title,
                reason,
                estimatedHours,
            });

            return NextResponse.json({ success: true, ...result });
        } catch (error: any) {
            return createErrorResponse(error?.message || error);
        }
    }
);
