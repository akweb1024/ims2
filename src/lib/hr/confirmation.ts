import { prisma } from '@/lib/prisma';

// Default probation length and how far ahead the reminder job looks.
export const PROBATION_DAYS = 90;
export const REMINDER_WINDOW_DAYS = 14;

// A review is "open" (blocks creating another) while it awaits a decision.
export const OPEN_REVIEW_STATUSES = ['PENDING', 'RECOMMENDED'];

/**
 * When probationEndDate wasn't set explicitly, fall back to joining + 90 days so
 * the reminder job still works for hires onboarded before a date was recorded.
 */
export function effectiveProbationEnd(
    profile: { probationEndDate: Date | null; dateOfJoining: Date | null }
): Date | null {
    if (profile.probationEndDate) return profile.probationEndDate;
    if (profile.dateOfJoining) {
        const d = new Date(profile.dateOfJoining);
        d.setDate(d.getDate() + PROBATION_DAYS);
        return d;
    }
    return null;
}

/**
 * Compact performance snapshot captured at review time so the confirmation
 * decision reflects the record as it stood then, not whatever it becomes later.
 */
export async function buildKraSnapshot(employeeId: string) {
    const [latestSnapshot, latestIndex, goalTotals] = await Promise.all([
        prisma.monthlyPerformanceSnapshot.findFirst({
            where: { employeeId },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            select: {
                month: true, year: true, overallScore: true,
                performanceGrade: true, attendanceScore: true, taskCompletionRate: true,
            },
        }),
        prisma.performanceIndex.findFirst({
            where: { employeeId },
            orderBy: { computedAt: 'desc' },
            select: { period: true, overallIndex: true, letterRating: true },
        }),
        prisma.employeeGoal.groupBy({
            by: ['status'],
            where: { employeeId, isKra: true },
            _count: { _all: true },
        }),
    ]);

    const goalsByStatus: Record<string, number> = {};
    let totalKraGoals = 0;
    for (const row of goalTotals) {
        goalsByStatus[row.status] = row._count._all;
        totalKraGoals += row._count._all;
    }

    return {
        capturedAt: new Date().toISOString(),
        latestSnapshot,
        latestIndex,
        kra: {
            totalKraGoals,
            achievedKraGoals: goalsByStatus['ACHIEVED'] || 0,
            goalsByStatus,
        },
    };
}
