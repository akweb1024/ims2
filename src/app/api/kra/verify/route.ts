import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { handleKraError } from '@/lib/kra/http';
import { tlVerify, managerVerify } from '@/lib/kra/goals';
import { kraVerifyGoalSchema } from '@/lib/validators/kra';
import { GROUP_WIDE_ROLES, MANAGERIAL_ROLES } from '@/lib/kra/scope';

// GET /api/kra/verify — goals awaiting verification at this viewer's stage.
// TEAM_LEADER -> SUBMITTED; MANAGER -> TL_VERIFIED; ADMIN/HR -> both. Scoped to downline.
export const GET = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
  try {
    let statuses: string[];
    if (user.role === 'TEAM_LEADER') statuses = ['SUBMITTED'];
    else if (user.role === 'MANAGER') statuses = ['TL_VERIFIED'];
    else statuses = ['SUBMITTED', 'TL_VERIFIED']; // ADMIN/HR class

    // Restrict to the viewer's downline unless they are group-wide.
    let employeeFilter = {};
    if (!GROUP_WIDE_ROLES.has(user.role)) {
      const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
      employeeFilter = { employee: { userId: { in: downline } } };
    } else if (user.companyId) {
      employeeFilter = { companyId: user.companyId };
    }

    const goals = await prisma.employeeGoal.findMany({
      where: { status: { in: statuses }, ...employeeFilter },
      include: {
        proofs: { orderBy: { createdAt: 'desc' } },
        verifications: { orderBy: { createdAt: 'asc' } },
        employee: { select: { id: true, user: { select: { name: true, email: true } } } },
      },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json({ goals });
  } catch (error) {
    return handleKraError(error);
  }
});

// POST /api/kra/verify — TL or Manager verifies a goal (level in body, sequential + status-guarded).
export const POST = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
  try {
    const parsed = kraVerifyGoalSchema.safeParse(await req.json());
    if (!parsed.success) return createErrorResponse(parsed.error);
    const { goalId, level, decision, comment } = parsed.data;
    const actor = { id: user.id, role: user.role, companyId: user.companyId };
    const result =
      level === 'TL'
        ? await tlVerify(actor, goalId, decision, comment)
        : await managerVerify(actor, goalId, decision, comment);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleKraError(error);
  }
});
