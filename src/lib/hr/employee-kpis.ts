/**
 * The single KPI write path — goals-native (final step of KRA unification).
 *
 * Historically this wrote the legacy EmployeeKPI table and (later) mirrored
 * into EmployeeGoal via the LEGACY_SYNC bridge. The legacy table is now
 * dropped: KPI writes from the config panel, the workspace/kpis endpoint and
 * increment approval land directly in the canonical KRA engine as
 * EmployeeGoal rows (origin LEGACY_SYNC, isKra) for the current period
 * window of each KPI's period type.
 *
 * Preserved rules:
 *  - companyId is ALWAYS the employee's own company — never the actor's.
 *  - one normalization: trimmed title, finite target > 0, unit default COUNT,
 *    period whitelisted (else MONTHLY), category default GENERAL.
 *  - rows match by title within the period window (upsertGoal's dedupe) —
 *    repeated writes update instead of duplicating.
 *  - PROGRESS is owned by the KRA engine. `current` only seeds a goal that is
 *    newly created; a merge never resets progress.
 *  - deletion is opt-in (`replaceMissing`) and only ever removes
 *    origin=LEGACY_SYNC goals this write didn't touch — goals assigned from
 *    the console (TEMPLATE/MANUAL/…) are never deleted here.
 */
import type { Prisma } from '@prisma/client';
import type { prisma } from '@/lib/prisma';
import { upsertGoal } from '@/lib/kra/create-goals';
import { computePeriodWindow, normalizePeriod } from '@/lib/kra/period';

type Db = Prisma.TransactionClient | typeof prisma;

export const KPI_PERIODS = new Set(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']);

export interface KpiInput {
    id?: string;
    title?: unknown;
    target?: unknown;
    current?: unknown;
    unit?: unknown;
    period?: unknown;
    category?: unknown;
}

export interface NormalizedKpi {
    id?: string;
    title: string;
    target: number;
    current?: number; // only set when the caller explicitly provided it
    unit: string;
    period: string;
    category: string;
}

/** Config-panel normalization rules, shared by every writer. */
export function normalizeKpis(raw: KpiInput[]): NormalizedKpi[] {
    return (raw || [])
        .filter((k) => k && typeof k.title === 'string' && k.title.trim().length > 0)
        .map((k) => {
            const period = String(k.period || 'MONTHLY').toUpperCase();
            const normalized: NormalizedKpi = {
                id: k.id ? String(k.id) : undefined,
                title: (k.title as string).trim(),
                target: Number(k.target || 0),
                unit: String(k.unit || 'COUNT'),
                period: KPI_PERIODS.has(period) ? period : 'MONTHLY',
                category: String(k.category || 'GENERAL'),
            };
            if (k.current !== undefined && k.current !== null && k.current !== '') {
                normalized.current = Number(k.current) || 0;
            }
            return normalized;
        })
        .filter((k) => Number.isFinite(k.target) && k.target > 0);
}

export interface UpsertKpisResult {
    created: number;
    updated: number;
    deleted: number;
}

export async function upsertEmployeeKpis(
    db: Db,
    args: { employeeId: string; kpis: NormalizedKpi[]; replaceMissing?: boolean },
): Promise<UpsertKpisResult> {
    const profile = await db.employeeProfile.findUnique({
        where: { id: args.employeeId },
        select: { id: true, kra: true, user: { select: { companyId: true } } },
    });
    if (!profile) throw new Error('Employee profile not found');
    const companyId = profile.user?.companyId;
    if (!companyId) throw new Error('Employee has no company — cannot write KPIs');

    const now = new Date();
    const result: UpsertKpisResult = { created: 0, updated: 0, deleted: 0 };
    const touchedGoalIds = new Set<string>();

    for (const item of args.kpis) {
        const period = normalizePeriod(item.period);
        const window = computePeriodWindow(period, now);
        const upserted = await upsertGoal(db, {
            employeeId: args.employeeId,
            companyId,
            origin: 'LEGACY_SYNC',
            title: item.title,
            unit: item.unit || 'COUNT',
            targetValue: item.target,
            type: period,
            startDate: window.startDate,
            endDate: window.endDate,
            isKra: true,
            kra: profile.kra ?? null,
            dataSource: 'MANUAL',
            initialCurrent: item.current,
        });
        touchedGoalIds.add(upserted.id);
        if (upserted.created) result.created++;
        else result.updated++;
    }

    if (args.replaceMissing) {
        // Only LEGACY_SYNC goals in current windows are candidates — console-
        // assigned goals are never deleted by a KPI-panel replace.
        const candidates = await db.employeeGoal.findMany({
            where: { employeeId: args.employeeId, isKra: true, origin: 'LEGACY_SYNC', endDate: { gte: now } },
            select: { id: true },
        });
        const toDelete = candidates.filter((g) => !touchedGoalIds.has(g.id)).map((g) => g.id);
        if (toDelete.length > 0) {
            await db.employeeGoal.deleteMany({ where: { id: { in: toDelete } } });
            result.deleted = toDelete.length;
        }
    }

    return result;
}
