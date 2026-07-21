/**
 * Legacy KPI → KRA engine bridge (unification: console as single source of truth).
 *
 * The legacy path (`upsertEmployeeKpis`) still writes `EmployeeKPI` because
 * non-KRA consumers (work-agenda generator, salary/incentive service, staff
 * portal) read that table. But KRA truth lives in `EmployeeGoal`. This module
 * mirrors every legacy KPI write into the canonical goal engine via
 * `upsertGoal`, so the HR KRA console, my-performance, the manager team page,
 * and the workload dashboards all see the same targets no matter which surface
 * wrote them.
 *
 * Rules:
 *  - mirrored goals carry origin 'LEGACY_SYNC' and a kpiId link back to the
 *    EmployeeKPI row (provenance + idempotency across re-syncs);
 *  - target/title/unit/period sync on every write; PROGRESS does not — the KRA
 *    engine (contributions/rollup) owns progress. `current` is only used as the
 *    starting value when the goal is first created (e.g. one-shot migration);
 *  - deleting a legacy KPI does NOT delete the mirrored goal: goals carry
 *    contribution/verification history the legacy table knows nothing about.
 */
import type { Prisma } from '@prisma/client';
import type { prisma } from '@/lib/prisma';
import { upsertGoal } from '@/lib/kra/create-goals';
import { computePeriodWindow, normalizePeriod } from '@/lib/kra/period';

export { normalizePeriod };

type Db = Prisma.TransactionClient | typeof prisma;

export interface LegacyKpiRow {
    id: string;
    title: string;
    target: number;
    current: number;
    unit: string;
    period: string;   // DAILY | WEEKLY | MONTHLY | QUARTERLY | YEARLY
    category: string | null;
}

export interface SyncArgs {
    employeeId: string;   // EmployeeProfile id
    companyId: string;
    kpi: LegacyKpiRow;
    /** The employee's free-text KRA statement, if maintained (EmployeeProfile.kra). */
    kraStatement?: string | null;
    assignedById?: string | null;
    now?: Date;
}

/** Mirror one legacy KPI row into the canonical EmployeeGoal engine. */
export async function syncKpiRowToGoal(db: Db, args: SyncArgs): Promise<{ goalId: string; created: boolean }> {
    const period = normalizePeriod(args.kpi.period);
    const window = computePeriodWindow(period, args.now ?? new Date());

    const result = await upsertGoal(db, {
        employeeId: args.employeeId,
        companyId: args.companyId,
        origin: 'LEGACY_SYNC',
        title: args.kpi.title,
        unit: args.kpi.unit || 'COUNT',
        targetValue: args.kpi.target,
        type: period,
        startDate: window.startDate,
        endDate: window.endDate,
        isKra: true,
        kra: args.kraStatement ?? null,
        kpiId: args.kpi.id,
        dataSource: 'MANUAL',
        assignedById: args.assignedById ?? null,
        initialCurrent: args.kpi.current,
    });
    return { goalId: result.id, created: result.created };
}
