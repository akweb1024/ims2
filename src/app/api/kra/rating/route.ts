import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { computePeriodWindow, type KraPeriodType } from '@/lib/kra/period';
import { handleKraError } from '@/lib/kra/http';
import { saveRating, moderateRating } from '@/lib/kra/rating';
import { kraSaveRatingSchema, kraModerateRatingSchema } from '@/lib/validators/kra';
import { GROUP_WIDE_ROLES, MANAGERIAL_ROLES } from '@/lib/kra/scope';

// GET /api/kra/rating?periodType=QUARTERLY&periodRef=ISO — saved ratings in the viewer's scope.
export const GET = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const { searchParams } = new URL(req.url);
    const periodType = (searchParams.get('periodType') || 'QUARTERLY').toUpperCase() as KraPeriodType;
    const ref = searchParams.get('periodRef') ? new Date(searchParams.get('periodRef')!) : new Date();
    const win = computePeriodWindow(periodType, ref);

    // Resolve scoped employee profiles.
    let profiles: { id: string; user: { name: string | null; email: string } }[];
    if (GROUP_WIDE_ROLES.has(user.role)) {
      profiles = await prisma.employeeProfile.findMany({
        where: { user: { companyId: user.companyId, isActive: true } },
        select: { id: true, user: { select: { name: true, email: true } } },
        take: 300,
      });
    } else {
      const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
      profiles = await prisma.employeeProfile.findMany({
        where: { userId: { in: [...downline, user.id] } },
        select: { id: true, user: { select: { name: true, email: true } } },
      });
    }
    const nameById = new Map(profiles.map((p) => [p.id, p.user.name || p.user.email]));

    const ratings = await prisma.performanceIndex.findMany({
      where: { employeeId: { in: profiles.map((p) => p.id) }, periodType, period: win.label },
      select: {
        id: true, employeeId: true, letterRating: true, achievementScore: true, overallIndex: true,
        grade: true, ratingStatus: true, hrModeration: true, managerComments: true, period: true,
      },
      orderBy: { achievementScore: 'desc' },
    });

    return NextResponse.json({
      period: win.label,
      ratings: ratings.map((r) => ({ ...r, name: nameById.get(r.employeeId) ?? 'Employee' })),
    });
  } catch (error) {
    return handleKraError(error);
  }
});

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
