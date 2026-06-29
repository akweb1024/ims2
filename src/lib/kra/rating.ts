/**
 * Quarterly rating layer (Plan B, Phase 3).
 *
 * Reuses the existing composite PerformanceIndex computation and layers the spec's
 * letter grade (A+…D) + HR moderation on top. The letter is derived from the pure
 * weighted KRA achievement (spec §10 step 4-5), while the full composite index is
 * still persisted for the leaderboard.
 */
import { prisma } from '@/lib/prisma';
import { computePerformanceIndex } from '@/lib/kra/performance-index';
import { computePeriodWindow, type KraPeriodType } from '@/lib/kra/period';
import { type Actor, KraScopeError, assertCompanyScope, assertManagerScope, requireRole } from '@/lib/kra/scope';
import { notify, userIdForProfile } from '@/lib/kra/notify';

/** Map a 0..100 weighted score to the spec's letter rating. */
export function letterRatingFromScore(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

export interface SaveRatingArgs {
  employeeId: string; // EmployeeProfile id
  periodType: KraPeriodType;
  periodRef?: Date;
  managerComments?: string;
}

/** Compute + persist a quarterly rating from the employee's KRA goals. MANAGER+ with scope. */
export async function saveRating(actor: Actor, args: SaveRatingArgs) {
  requireRole(actor.role, 3); // MANAGER+
  const profile = await assertManagerScope(actor, args.employeeId);
  const companyId = profile.user?.companyId;
  if (!companyId) throw new KraScopeError('Employee has no company', 400);

  const ref = args.periodRef ?? new Date();
  const win = computePeriodWindow(args.periodType, ref);

  // Persist the composite index (achievement/attendance/managerRating/focus).
  const index = await computePerformanceIndex({
    employeeId: args.employeeId,
    companyId,
    periodType: args.periodType,
    ref,
    persist: true,
  });

  // Per-KRA achievement snapshot for this window.
  const kraGoals = await prisma.employeeGoal.findMany({
    where: { employeeId: args.employeeId, isKra: true, type: args.periodType, startDate: win.startDate },
    select: { id: true, achievementPercentage: true },
  });
  const kraAchievement: Record<string, number> = {};
  for (const g of kraGoals) kraAchievement[g.id] = g.achievementPercentage;

  // Letter from the pure weighted KRA achievement (spec §10).
  const letterRating = letterRatingFromScore(index.achievementScore);

  const rating = await prisma.performanceIndex.update({
    where: { employeeId_periodType_period: { employeeId: args.employeeId, periodType: args.periodType, period: win.label } },
    data: {
      letterRating,
      kraAchievement,
      managerComments: args.managerComments ?? null,
      raterId: actor.id,
      ratingStatus: 'SUBMITTED',
    },
    select: { id: true },
  });

  const employeeUserId = await userIdForProfile(args.employeeId);
  if (employeeUserId) {
    await notify({
      userId: employeeUserId,
      title: 'Performance rating saved',
      message: `Your ${win.label} rating is ${letterRating} (${index.achievementScore}% KRA achievement).`,
      type: 'KRA_RATING',
      link: '/dashboard/my-performance',
    });
  }
  return { ratingId: rating.id, period: win.label, letterRating, achievementScore: index.achievementScore };
}

/** HR moderation / letter override (spec §10). ADMIN-class only. */
export async function moderateRating(actor: Actor, ratingId: string, hrModeration: string, ratingOverride?: string) {
  requireRole(actor.role, 5); // ADMIN+
  const rating = await prisma.performanceIndex.findUnique({
    where: { id: ratingId },
    select: { id: true, companyId: true, employeeId: true, period: true },
  });
  if (!rating) throw new KraScopeError('Rating not found', 404);
  assertCompanyScope(actor, rating.companyId);

  await prisma.performanceIndex.update({
    where: { id: rating.id },
    data: {
      hrModeration,
      ratingStatus: 'HR_MODERATED',
      ...(ratingOverride ? { letterRating: ratingOverride } : {}),
    },
  });

  const employeeUserId = await userIdForProfile(rating.employeeId);
  if (employeeUserId) {
    await notify({
      userId: employeeUserId,
      title: 'Rating moderated by HR',
      message: `Your ${rating.period} rating was reviewed by HR.`,
      type: 'KRA_RATING',
      link: '/dashboard/my-performance',
    });
  }
  return { ok: true as const };
}
