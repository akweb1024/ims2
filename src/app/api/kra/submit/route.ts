import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { handleKraError } from '@/lib/kra/http';
import { submitGoal } from '@/lib/kra/goals';
import { kraSubmitGoalSchema } from '@/lib/validators/kra';

// POST /api/kra/submit — employee submits an owned goal for verification, with proof.
export const POST = authorizedRoute([], async (req: NextRequest, user) => {
  try {
    const parsed = kraSubmitGoalSchema.safeParse(await req.json());
    if (!parsed.success) return createErrorResponse(parsed.error);
    const { goalId, proofUrl, proofNote } = parsed.data;
    const result = await submitGoal(user.id, goalId, proofUrl, proofNote);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleKraError(error);
  }
});
