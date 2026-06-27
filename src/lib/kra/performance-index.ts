/**
 * Performance Index computation (Phase 3).
 *
 * Composite score per employee per period from four components:
 *   - achievementScore   : weighted KRA goal achievement (verified rollup)
 *   - attendanceScore    : present days / recorded days
 *   - managerRatingScore : avg work-report manager rating (1-5 → 0-100)
 *   - focusScore         : avg work-report KRA-match ratio (narrative alignment)
 *
 * overallIndex = Σ weightᵢ · componentᵢ, with configurable weights.
 */
import { prisma } from '@/lib/prisma';
import { computePeriodWindow, type KraPeriodType } from '@/lib/kra/period';

export const DEFAULT_WEIGHTS = { achievement: 0.45, attendance: 0.2, managerRating: 0.2, focus: 0.15 };

const PRESENT_STATUSES = ['PRESENT', 'LATE', 'WORK_FROM_HOME', 'HALF_DAY', 'WFH'];

export interface IndexResult {
  period: string;
  periodType: KraPeriodType;
  achievementScore: number;
  attendanceScore: number;
  managerRatingScore: number;
  focusScore: number;
  overallIndex: number;
  grade: string;
  weights: typeof DEFAULT_WEIGHTS;
  goalCount: number;
}

function gradeFor(index: number): string {
  if (index >= 85) return 'A';
  if (index >= 70) return 'B';
  if (index >= 55) return 'C';
  return 'D';
}

const round = (n: number) => Math.round(n * 10) / 10;

export async function computePerformanceIndex(args: {
  employeeId: string;
  companyId: string;
  periodType: KraPeriodType;
  ref?: Date;
  persist?: boolean;
  weights?: typeof DEFAULT_WEIGHTS;
}): Promise<IndexResult> {
  const weights = args.weights ?? DEFAULT_WEIGHTS;
  const win = computePeriodWindow(args.periodType, args.ref ?? new Date());
  const windowFilter = { gte: win.startDate, lte: win.endDate };

  // 1) Achievement — weighted across KRA goals in this period window.
  const goals = await prisma.employeeGoal.findMany({
    where: { employeeId: args.employeeId, isKra: true, type: args.periodType, startDate: win.startDate },
    select: { achievementPercentage: true, weight: true },
  });
  const totalWeight = goals.reduce((s, g) => s + (g.weight || 1), 0);
  const achievementScore = totalWeight
    ? goals.reduce((s, g) => s + Math.min(100, g.achievementPercentage) * (g.weight || 1), 0) / totalWeight
    : 0;

  // 2) Attendance — present days / recorded days.
  const attendance = await prisma.attendance.findMany({
    where: { employeeId: args.employeeId, date: windowFilter },
    select: { status: true },
  });
  const present = attendance.filter((a) => PRESENT_STATUSES.includes((a.status || '').toUpperCase())).length;
  const attendanceScore = attendance.length ? (present / attendance.length) * 100 : 0;

  // 3) Manager rating — avg of work-report manager ratings (1-5 scaled to 0-100).
  const ratingAgg = await prisma.workReport.aggregate({
    _avg: { managerRating: true },
    where: { employeeId: args.employeeId, date: windowFilter, managerRating: { not: null } },
  });
  const managerRatingScore = ratingAgg._avg.managerRating ? Math.min(100, ratingAgg._avg.managerRating * 20) : 0;

  // 4) Focus — avg KRA-match ratio of work reports (narrative alignment with KRA).
  const focusAgg = await prisma.workReport.aggregate({
    _avg: { kraMatchRatio: true },
    where: { employeeId: args.employeeId, date: windowFilter, kraMatchRatio: { not: null } },
  });
  const focusScore = focusAgg._avg.kraMatchRatio ? Math.min(100, focusAgg._avg.kraMatchRatio * 100) : 0;

  const overallIndex =
    weights.achievement * achievementScore +
    weights.attendance * attendanceScore +
    weights.managerRating * managerRatingScore +
    weights.focus * focusScore;

  const result: IndexResult = {
    period: win.label,
    periodType: args.periodType,
    achievementScore: round(achievementScore),
    attendanceScore: round(attendanceScore),
    managerRatingScore: round(managerRatingScore),
    focusScore: round(focusScore),
    overallIndex: round(overallIndex),
    grade: gradeFor(overallIndex),
    weights,
    goalCount: goals.length,
  };

  if (args.persist) {
    await prisma.performanceIndex.upsert({
      where: { employeeId_periodType_period: { employeeId: args.employeeId, periodType: args.periodType, period: win.label } },
      update: {
        achievementScore: result.achievementScore, attendanceScore: result.attendanceScore,
        managerRatingScore: result.managerRatingScore, focusScore: result.focusScore,
        overallIndex: result.overallIndex, grade: result.grade, weights, computedAt: new Date(),
      },
      create: {
        companyId: args.companyId, employeeId: args.employeeId, periodType: args.periodType, period: win.label,
        achievementScore: result.achievementScore, attendanceScore: result.attendanceScore,
        managerRatingScore: result.managerRatingScore, focusScore: result.focusScore,
        overallIndex: result.overallIndex, grade: result.grade, weights,
      },
    });
  }

  return result;
}
