import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { TICKET_USER_ROLES } from '@/lib/support-tickets';

/**
 * GET /api/support/departments — the target-department options (id + name) for raising a
 * ticket. Company-scoped and open to any internal role, unlike the admin-gated
 * /api/departments, because every employee needs it to route a request.
 */
export const GET = authorizedRoute(TICKET_USER_ROLES, async (_req: NextRequest, user) => {
  try {
    const companyId = (user as any).companyId;
    if (!companyId) return NextResponse.json([]);
    const departments = await prisma.department.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(departments);
  } catch (error) {
    return createErrorResponse(error);
  }
});
