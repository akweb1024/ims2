/**
 * KRA roll-ups above the employee level (Phase 2 of KRA unification).
 *
 * Employee KRA truth stays in EmployeeGoal / PerformanceIndex. This module
 * derives one aggregate row per (level, subject, period):
 *   TEAM       — a manager's DIRECT reports (subjectId = manager User.id)
 *   DEPARTMENT — everyone with User.departmentId set (subjectId = Department.id)
 *   COMPANY    — every active employee (subjectId = companyId)
 *
 * Aggregation is over already-counted per-employee numbers — the KRA
 * achievementScore and overallIndex from PerformanceIndex — so a roll-up can
 * never disagree with the per-employee views it summarizes. Dimension averages
 * come from the same isKra goals the index used. Employees average with equal
 * weight (goal weights already shaped each employee's own score).
 *
 * The pure aggregation lives in aggregateEntries(); computeKraRollupsForCompany
 * does the IO and upserts KraRollup rows (idempotent per level/subject/period).
 */
import type { Prisma } from '@prisma/client';
import type { prisma } from '@/lib/prisma';
import { computePeriodWindow, type KraPeriodType } from '@/lib/kra/period';

type Db = Prisma.TransactionClient | typeof prisma;

export type RollupLevel = 'TEAM' | 'DEPARTMENT' | 'COMPANY';

export interface RollupEntry {
    employeeId: string;
    achievement: number;      // PerformanceIndex.achievementScore (0..100)
    index: number;            // PerformanceIndex.overallIndex (0..100)
    grade: string | null;     // PerformanceIndex.grade
    goals: { dimension: string | null; achievementPercentage: number }[];
}

export interface RollupAggregate {
    employeeCount: number;
    goalCount: number;
    avgAchievement: number;
    avgIndex: number;
    gradeCounts: Record<string, number>;
    dimensionAvgs: Record<string, number>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Pure aggregation of per-employee entries into one roll-up row. */
export function aggregateEntries(entries: RollupEntry[]): RollupAggregate {
    const employeeCount = entries.length;
    if (employeeCount === 0) {
        return { employeeCount: 0, goalCount: 0, avgAchievement: 0, avgIndex: 0, gradeCounts: {}, dimensionAvgs: {} };
    }

    let achievementSum = 0;
    let indexSum = 0;
    let goalCount = 0;
    const gradeCounts: Record<string, number> = {};
    const dimSums: Record<string, { sum: number; n: number }> = {};

    for (const e of entries) {
        achievementSum += e.achievement;
        indexSum += e.index;
        if (e.grade) gradeCounts[e.grade] = (gradeCounts[e.grade] ?? 0) + 1;
        for (const g of e.goals) {
            goalCount++;
            const dim = g.dimension ?? 'OUTPUT';
            const bucket = (dimSums[dim] ??= { sum: 0, n: 0 });
            bucket.sum += g.achievementPercentage;
            bucket.n++;
        }
    }

    const dimensionAvgs: Record<string, number> = {};
    for (const [dim, { sum, n }] of Object.entries(dimSums)) {
        dimensionAvgs[dim] = round2(n > 0 ? sum / n : 0);
    }

    return {
        employeeCount,
        goalCount,
        avgAchievement: round2(achievementSum / employeeCount),
        avgIndex: round2(indexSum / employeeCount),
        gradeCounts,
        dimensionAvgs,
    };
}

/** Group entries by a key, dropping entries whose key is null/undefined. */
export function groupByKey<T>(items: T[], key: (item: T) => string | null | undefined): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    for (const item of items) {
        const k = key(item);
        if (!k) continue;
        const list = groups.get(k) ?? [];
        list.push(item);
        groups.set(k, list);
    }
    return groups;
}

export interface ComputeRollupsResult { level: RollupLevel; subjects: number }

/**
 * Compute + persist all three roll-up levels for one company & period.
 * Employees without a PerformanceIndex row for the period contribute zeros —
 * an unassessed employee still counts toward their team's size, not its score
 * inflation.
 */
export async function computeKraRollupsForCompany(
    db: Db,
    args: { companyId: string; periodType: KraPeriodType; ref?: Date },
): Promise<ComputeRollupsResult[]> {
    const win = computePeriodWindow(args.periodType, args.ref ?? new Date());

    const employees = await db.employeeProfile.findMany({
        where: { user: { companyId: args.companyId, isActive: true } },
        select: {
            id: true,
            user: {
                select: {
                    id: true, name: true, managerId: true, departmentId: true,
                    manager: { select: { id: true, name: true } },
                    department: { select: { id: true, name: true } },
                },
            },
        },
    });
    if (employees.length === 0) return [];

    const employeeIds = employees.map((e) => e.id);
    const [indices, goals] = await Promise.all([
        db.performanceIndex.findMany({
            where: { companyId: args.companyId, periodType: args.periodType as never, period: win.label, employeeId: { in: employeeIds } },
            select: { employeeId: true, achievementScore: true, overallIndex: true, grade: true },
        }),
        db.employeeGoal.findMany({
            where: { companyId: args.companyId, isKra: true, type: args.periodType as never, startDate: win.startDate, employeeId: { in: employeeIds } },
            select: { employeeId: true, dimension: true, achievementPercentage: true },
        }),
    ]);

    const indexByEmployee = new Map(indices.map((i) => [i.employeeId, i]));
    const goalsByEmployee = groupByKey(goals, (g) => g.employeeId);

    const entryFor = (profileId: string): RollupEntry => {
        const idx = indexByEmployee.get(profileId);
        return {
            employeeId: profileId,
            achievement: idx?.achievementScore ?? 0,
            index: idx?.overallIndex ?? 0,
            grade: idx?.grade ?? null,
            goals: (goalsByEmployee.get(profileId) ?? []).map((g) => ({
                dimension: (g.dimension as string | null) ?? null,
                achievementPercentage: g.achievementPercentage,
            })),
        };
    };

    const upsert = async (level: RollupLevel, subjectId: string, subjectName: string, entries: RollupEntry[]) => {
        const agg = aggregateEntries(entries);
        await db.kraRollup.upsert({
            where: { level_subjectId_periodType_period: { level, subjectId, periodType: args.periodType as never, period: win.label } },
            create: {
                companyId: args.companyId, level, subjectId, subjectName,
                periodType: args.periodType as never, period: win.label,
                employeeCount: agg.employeeCount, goalCount: agg.goalCount,
                avgAchievement: agg.avgAchievement, avgIndex: agg.avgIndex,
                gradeCounts: agg.gradeCounts, dimensionAvgs: agg.dimensionAvgs,
            },
            update: {
                subjectName,
                employeeCount: agg.employeeCount, goalCount: agg.goalCount,
                avgAchievement: agg.avgAchievement, avgIndex: agg.avgIndex,
                gradeCounts: agg.gradeCounts, dimensionAvgs: agg.dimensionAvgs,
                computedAt: new Date(),
            },
        });
    };

    const results: ComputeRollupsResult[] = [];

    // COMPANY — everyone.
    await upsert('COMPANY', args.companyId, 'Company', employees.map((e) => entryFor(e.id)));
    results.push({ level: 'COMPANY', subjects: 1 });

    // DEPARTMENT — by User.departmentId.
    const byDept = groupByKey(employees, (e) => e.user.departmentId);
    for (const [deptId, members] of byDept) {
        const name = members[0].user.department?.name ?? 'Department';
        await upsert('DEPARTMENT', deptId, name, members.map((m) => entryFor(m.id)));
    }
    results.push({ level: 'DEPARTMENT', subjects: byDept.size });

    // TEAM — direct reports per manager.
    const byManager = groupByKey(employees, (e) => e.user.managerId);
    for (const [managerId, members] of byManager) {
        const name = members[0].user.manager?.name ?? 'Team';
        await upsert('TEAM', managerId, name, members.map((m) => entryFor(m.id)));
    }
    results.push({ level: 'TEAM', subjects: byManager.size });

    return results;
}
