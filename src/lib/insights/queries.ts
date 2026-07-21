/**
 * Read-only "Insights" query layer — the single source of truth shared by the
 * ims2 MCP server (scripts/mcp-server.ts) and the in-app Insights UI
 * (src/app/api/insights/*, src/app/dashboard/insights).
 *
 * Every function is dependency-injected with a Prisma client so it can run in
 * two very different hosts:
 *   - the standalone MCP server, which builds its own client from DATABASE_URL
 *     and never imports the app's env-validation, and
 *   - Next.js route handlers, which pass the app's shared `prisma` singleton.
 *
 * Because of that, this module must stay free of any IO/side-effect imports
 * beyond pure helpers (date windows, attendance folding) — no `@/lib/prisma`,
 * no env-validation. The Prisma type is imported type-only.
 *
 * `companyId` scopes results to one tenant. The MCP server passes it undefined
 * (query everything it can reach); the app routes always pass the caller's
 * company so a user only ever sees their own org.
 */
import type { PrismaClient } from '@prisma/client';
import { GoalType } from '@prisma/client';

import { getISTDateRangeForPeriod, normalizePeriod, formatToISTDate, type Period } from '@/lib/date-utils';
import { summarizeAttendance, PRESENT_STATUSES, ABSENT_STATUSES } from '@/lib/dashboard/attendance-summary';

/** A Prisma client or transaction handle — the subset we use is read-only. */
export type Db = PrismaClient;

function toRatio(n: number): number {
    return Math.round(n * 10) / 10;
}

/** Map a Period to the GoalType used by PerformanceIndex/KraRollup buckets. */
function periodTypeFor(period: Period): GoalType {
    if (period === 'YEARLY') return GoalType.YEARLY;
    if (period === 'QUARTERLY') return GoalType.QUARTERLY;
    return GoalType.MONTHLY; // MONTHLY and DAILY both roll up to the month bucket
}

/** Period label used by PerformanceIndex/KraRollup ("2026-06" | "2026-Q2" | "2026"). */
export function periodLabel(period: Period, baseDate = new Date()): string {
    const { start } = getISTDateRangeForPeriod(period, baseDate);
    const [year, mm] = formatToISTDate(start).split('-'); // YYYY-MM-DD (en-CA)
    const month = parseInt(mm, 10);
    if (period === 'YEARLY') return year;
    if (period === 'QUARTERLY') return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
    return `${year}-${String(month).padStart(2, '0')}`;
}

export interface EmployeeIdentity {
    profileId: string;
    employeeCode: string | null;
    name: string | null;
    email: string;
    designation: string | null;
    department: string | null;
}

interface ProfileWithUser {
    id: string;
    employeeId: string | null;
    designation: string | null;
    user: { name: string | null; email: string; department: { name: string } | null };
}

function identity(p: ProfileWithUser): EmployeeIdentity {
    return {
        profileId: p.id,
        employeeCode: p.employeeId,
        name: p.user.name,
        email: p.user.email,
        designation: p.designation,
        department: p.user.department?.name ?? null,
    };
}

const includeUserDept = { user: { include: { department: true } } } as const;

/** Resolve a free-text employee reference (id / code / email / name) to a profile. */
export async function resolveEmployee(db: Db, ref: string, companyId?: string): Promise<ProfileWithUser | null> {
    const needle = ref.trim();
    if (!needle) return null;
    const companyScope = companyId ? { user: { is: { companyId } } } : {};

    const byId = await db.employeeProfile.findFirst({
        where: {
            AND: [
                companyScope,
                {
                    OR: [
                        { id: needle },
                        { employeeId: needle },
                        { userId: needle },
                        { user: { email: { equals: needle, mode: 'insensitive' } } },
                    ],
                },
            ],
        },
        include: includeUserDept,
    });
    if (byId) return byId;

    return db.employeeProfile.findFirst({
        where: {
            AND: [
                companyScope,
                {
                    user: {
                        OR: [
                            { name: { contains: needle, mode: 'insensitive' } },
                            { email: { contains: needle, mode: 'insensitive' } },
                        ],
                    },
                },
            ],
        },
        include: includeUserDept,
        orderBy: { createdAt: 'asc' },
    });
}

// --- list_employees ------------------------------------------------------

export interface ListEmployeesArgs {
    companyId?: string;
    query?: string;
    department?: string;
    limit?: number;
}

export async function listEmployees(db: Db, args: ListEmployeesArgs) {
    const query = (args.query ?? '').trim();
    const department = (args.department ?? '').trim();
    const limit = Math.min(Math.max(Number(args.limit) || 25, 1), 100);

    const profiles = await db.employeeProfile.findMany({
        where: {
            user: {
                isActive: true,
                ...(args.companyId ? { companyId: args.companyId } : {}),
                ...(query
                    ? {
                          OR: [
                              { name: { contains: query, mode: 'insensitive' } },
                              { email: { contains: query, mode: 'insensitive' } },
                          ],
                      }
                    : {}),
                ...(department ? { department: { name: { contains: department, mode: 'insensitive' } } } : {}),
            },
        },
        include: includeUserDept,
        orderBy: { user: { name: 'asc' } },
        take: limit,
    });

    return { count: profiles.length, employees: profiles.map(identity) };
}

// --- employee_kra_goals --------------------------------------------------

export interface EmployeeKraGoalsArgs {
    companyId?: string;
    employee: string;
    period?: string;
    kraOnly?: boolean;
}

export async function employeeKraGoals(db: Db, args: EmployeeKraGoalsArgs) {
    const period = normalizePeriod(args.period ?? 'MONTHLY');
    const kraOnly = args.kraOnly === undefined ? true : Boolean(args.kraOnly);

    const profile = await resolveEmployee(db, args.employee, args.companyId);
    if (!profile) return { notFound: true as const, ref: args.employee };

    const { start, end } = getISTDateRangeForPeriod(period);
    const goals = await db.employeeGoal.findMany({
        where: {
            employeeId: profile.id,
            ...(kraOnly ? { isKra: true } : {}),
            startDate: { lte: end },
            endDate: { gte: start },
        },
        orderBy: [{ weight: 'desc' }, { title: 'asc' }],
    });

    const items = goals.map((g) => ({
        id: g.id,
        title: g.title,
        kra: g.kra,
        unit: g.unit,
        targetValue: g.targetValue,
        currentValue: g.currentValue,
        verifiedValue: g.verifiedValue,
        achievementPercentage: toRatio(g.achievementPercentage),
        weight: g.weight,
        isKra: g.isKra,
        dimension: g.dimension,
        status: g.status,
        window: { start: g.startDate.toISOString(), end: g.endDate.toISOString() },
    }));

    const kraGoals = items.filter((g) => g.isKra);
    const totalWeight = kraGoals.reduce((s, g) => s + (g.weight || 0), 0);
    const weightedKraAchievement = totalWeight
        ? toRatio(kraGoals.reduce((s, g) => s + g.achievementPercentage * (g.weight || 0), 0) / totalWeight)
        : null;

    return {
        notFound: false as const,
        employee: identity(profile),
        period,
        window: { start: start.toISOString(), end: end.toISOString() },
        goalCount: items.length,
        weightedKraAchievement,
        goals: items,
    };
}

// --- attendance_summary --------------------------------------------------

export interface AttendanceSummaryArgs {
    companyId?: string;
    employee: string;
    period?: string;
    month?: string; // YYYY-MM overrides period
}

export async function attendanceSummary(db: Db, args: AttendanceSummaryArgs) {
    const profile = await resolveEmployee(db, args.employee, args.companyId);
    if (!profile) return { notFound: true as const, ref: args.employee };

    let start: Date;
    let end: Date;
    let label: string;
    const month = (args.month ?? '').trim();
    if (/^\d{4}-\d{2}$/.test(month)) {
        const base = new Date(`${month}-01T00:00:00+05:30`);
        ({ start, end } = getISTDateRangeForPeriod('MONTHLY', base));
        label = month;
    } else {
        const period = normalizePeriod(args.period ?? 'MONTHLY');
        ({ start, end } = getISTDateRangeForPeriod(period));
        label = period;
    }

    const records = await db.attendance.findMany({
        where: { employeeId: profile.id, date: { gte: start, lte: end } },
        select: { status: true, isLate: true },
    });

    const summary = summarizeAttendance(records.map((r) => ({ status: r.status, isLate: r.isLate })));
    const byStatus: Record<string, number> = {};
    for (const r of records) {
        const s = (r.status || 'UNKNOWN').toUpperCase();
        byStatus[s] = (byStatus[s] || 0) + 1;
    }

    return {
        notFound: false as const,
        employee: identity(profile),
        period: label,
        window: { start: start.toISOString(), end: end.toISOString() },
        recordedDays: records.length,
        ...summary,
        byStatus,
        legend: {
            presentStatuses: [...PRESENT_STATUSES],
            absentStatuses: [...ABSENT_STATUSES],
            note: 'LEAVE / HOLIDAY / WEEKOFF are sanctioned days — neither present nor absent.',
        },
    };
}

// --- performance_index ---------------------------------------------------

export interface PerformanceIndexArgs {
    companyId?: string;
    employee: string;
    period?: string;
    periodLabel?: string;
}

export async function performanceIndex(db: Db, args: PerformanceIndexArgs) {
    const profile = await resolveEmployee(db, args.employee, args.companyId);
    if (!profile) return { notFound: true as const, ref: args.employee };

    const period = normalizePeriod(args.period ?? 'MONTHLY');
    const periodType = periodTypeFor(period);
    const label = (args.periodLabel ?? '').trim() || periodLabel(period === 'DAILY' ? 'MONTHLY' : period);

    const idx = await db.performanceIndex.findFirst({
        where: { employeeId: profile.id, periodType, period: label },
    });

    if (!idx) {
        return {
            notFound: false as const,
            employee: identity(profile),
            period: label,
            periodType,
            found: false as const,
            note: 'No PerformanceIndex row yet — the kra-snapshot cron computes these; it may not have run for this period.',
        };
    }

    return {
        notFound: false as const,
        employee: identity(profile),
        period: label,
        periodType,
        found: true as const,
        scores: {
            achievement: toRatio(idx.achievementScore),
            attendance: toRatio(idx.attendanceScore),
            managerRating: toRatio(idx.managerRatingScore),
            focus: toRatio(idx.focusScore),
            overallIndex: toRatio(idx.overallIndex),
        },
        grade: idx.grade,
        letterRating: idx.letterRating,
        ratingStatus: idx.ratingStatus,
        computedAt: idx.computedAt.toISOString(),
    };
}

// --- kra_rollup ----------------------------------------------------------

export type RollupLevel = 'TEAM' | 'DEPARTMENT' | 'COMPANY';

export interface KraRollupArgs {
    companyId?: string;
    level?: string;
    period?: string;
    periodLabel?: string;
    subject?: string;
}

export async function kraRollup(db: Db, args: KraRollupArgs) {
    const level: RollupLevel = ['TEAM', 'DEPARTMENT', 'COMPANY'].includes((args.level ?? '').toUpperCase())
        ? ((args.level as string).toUpperCase() as RollupLevel)
        : 'COMPANY';
    const period = normalizePeriod(args.period ?? 'MONTHLY');
    const periodType = periodTypeFor(period);
    const label = (args.periodLabel ?? '').trim() || periodLabel(period === 'DAILY' ? 'MONTHLY' : period);
    const subject = (args.subject ?? '').trim();

    const rows = await db.kraRollup.findMany({
        where: {
            level,
            periodType,
            period: label,
            ...(args.companyId ? { companyId: args.companyId } : {}),
            ...(subject ? { subjectName: { contains: subject, mode: 'insensitive' } } : {}),
        },
        orderBy: { avgIndex: 'desc' },
    });

    return {
        level,
        period: label,
        periodType,
        count: rows.length,
        rollups: rows.map((r) => ({
            subjectName: r.subjectName,
            subjectId: r.subjectId,
            employeeCount: r.employeeCount,
            goalCount: r.goalCount,
            avgAchievement: toRatio(r.avgAchievement),
            avgIndex: toRatio(r.avgIndex),
            gradeCounts: r.gradeCounts,
            dimensionAvgs: r.dimensionAvgs,
            computedAt: r.computedAt.toISOString(),
        })),
    };
}
