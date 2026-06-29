import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { handleKraError } from '@/lib/kra/http';
import { saveRating, moderateRating } from '@/lib/kra/rating';
import { kraSaveRatingSchema, kraModerateRatingSchema } from '@/lib/validators/kra';
import { MANAGERIAL_ROLES } from '@/lib/kra/scope';

// POST /api/kra/rating — compute + save a quarterly rating from KRAs. MANAGER+ with scope.
export const POST = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
  try {
    const parsed = kraSaveRatingSchema.safeParse(await req.json());
    if (!parsed.success) return createErrorResponse(parsed.error);
    const actor = { id: user.id, role: user.role, companyId: user.companyId };
    const { employeeId, periodType, periodRef, managerComments } = parsed.data;
    const result = await saveRating(actor, {
      employeeId,
      periodType,
      periodRef: periodRef ? new Date(periodRef) : undefined,
      managerComments,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleKraError(error);
  }
});

// PATCH /api/kra/rating — HR moderation / letter override. ADMIN-class only.
export const PATCH = authorizedRoute(['SUPER_ADMIN', 'ADMIN'], async (req: NextRequest, user) => {
  try {
    const parsed = kraModerateRatingSchema.safeParse(await req.json());
    if (!parsed.success) return createErrorResponse(parsed.error);
    const actor = { id: user.id, role: user.role, companyId: user.companyId };
    const { ratingId, hrModeration, ratingOverride } = parsed.data;
    const result = await moderateRating(actor, ratingId, hrModeration, ratingOverride);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleKraError(error);
  }
});
