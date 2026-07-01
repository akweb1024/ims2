import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { handleKraError } from '@/lib/kra/http';
import { assignGoal, updateGoal, deleteGoal } from '@/lib/kra/goals';
import { kraAssignGoalSchema, kraUpdateGoalSchema } from '@/lib/validators/kra';
import { MANAGERIAL_ROLES } from '@/lib/kra/scope';

// POST /api/kra/goal — manual single goal assignment (spec §5a). MANAGER+ with scope.
export const POST = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
  try {
    const parsed = kraAssignGoalSchema.safeParse(await req.json());
    if (!parsed.success) return createErrorResponse(parsed.error);
    const actor = { id: user.id, role: user.role, companyId: user.companyId };
    const result = await assignGoal(actor, parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleKraError(error);
  }
});

// PATCH /api/kra/goal — edit an assigned goal (target / rate / daily / title). MANAGER+ with scope.
export const PATCH = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
  try {
    const parsed = kraUpdateGoalSchema.safeParse(await req.json());
    if (!parsed.success) return createErrorResponse(parsed.error);
    const actor = { id: user.id, role: user.role, companyId: user.companyId };
    const result = await updateGoal(actor, parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleKraError(error);
  }
});

// DELETE /api/kra/goal?goalId=... — unassign (delete) a goal. MANAGER+ with scope.
export const DELETE = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
  try {
    const goalId = new URL(req.url).searchParams.get('goalId');
    if (!goalId) return createErrorResponse('goalId is required', 400);
    const actor = { id: user.id, role: user.role, companyId: user.companyId };
    const result = await deleteGoal(actor, goalId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleKraError(error);
  }
});
