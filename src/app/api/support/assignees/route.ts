import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { UserRole } from '@prisma/client';
import { TICKET_TRIAGE_ROLES, TICKET_USER_ROLES } from '@/lib/support-tickets';

/**
 * GET /api/support/assignees — the people a triager can put on a ticket.
 *
 * Company-scoped and gated to the ticket triage roles, unlike /api/kra/assignees, whose
 * managerial gate omits IT_MANAGER and IT_ADMIN — the very roles that run the helpdesk.
 * They could triage a ticket but were served an empty assignee list, so nobody could be
 * assigned from an IT account. Shape matches what the triage panel already consumes.
 *
 * ?departmentId=… narrows to one department (used to offer "the team this is routed to"
 * first when assigning from the IT command centre).
 */
export const GET = authorizedRoute(TICKET_TRIAGE_ROLES, async (req: NextRequest, user) => {
  try {
    const companyId = (user as any).companyId;
    if (!companyId) return NextResponse.json([]);

    const departmentId = new URL(req.url).searchParams.get('departmentId');

    const users = await prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
        // Staff only. A company's user table also holds CUSTOMER, AGENCY and REVIEWER
        // accounts (plus generated conference logins) — none of them resolve tickets, and
        // they would otherwise crowd out the real team in the dropdown.
        role: { in: TICKET_USER_ROLES as UserRole[] },
        ...(departmentId ? { departmentId } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
      take: 500,
    });

    return NextResponse.json(
      users.map((u) => ({
        userId: u.id,
        name: u.name || u.email || 'Unknown',
        email: u.email,
        departmentName: u.department?.name ?? null,
      })),
    );
  } catch (error) {
    return createErrorResponse(error);
  }
});
