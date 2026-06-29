import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { handleKraError } from '@/lib/kra/http';
import { logProgress, deleteLog } from '@/lib/kra/goals';
import { kraLogProgressSchema, kraDeleteLogSchema } from '@/lib/validators/kra';

// POST /api/kra/log — employee logs dated progress against a goal they own.
export const POST = authorizedRoute([], async (req: NextRequest, user) => {
  try {
    const parsed = kraLogProgressSchema.safeParse(await req.json());
    if (!parsed.success) return createErrorResponse(parsed.error);
    const { goalId, value, note, date } = parsed.data;
    const result = await logProgress({
      actorUserId: user.id,
      goalId,
      value,
      note,
      date: date ? new Date(date) : undefined,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleKraError(error);
  }
});

// DELETE /api/kra/log — employee deletes one of their own logs (auto-revenue cascades).
export const DELETE = authorizedRoute([], async (req: NextRequest, user) => {
  try {
    const body = await req.json().catch(() => ({}));
    const fromQuery = new URL(req.url).searchParams.get('logId');
    const parsed = kraDeleteLogSchema.safeParse({ logId: body.logId ?? fromQuery });
    if (!parsed.success) return createErrorResponse(parsed.error);
    const result = await deleteLog(user.id, parsed.data.logId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleKraError(error);
  }
});
