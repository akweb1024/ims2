import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { handleKraError } from '@/lib/kra/http';
import { assignGoal } from '@/lib/kra/goals';
import { kraAssignGoalSchema } from '@/lib/validators/kra';
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
