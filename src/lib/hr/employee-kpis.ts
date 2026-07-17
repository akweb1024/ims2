/**
 * The single EmployeeKPI write path (unification plan U2, docs/kra-unification-plan.md).
 *
 * Three surfaces used to write KPIs with three different rule sets — the
 * performance-workspace POST (actor's companyId, unvalidated period), the
 * KRA/KPI config panel (its own normalization), and increment approval
 * (delete-everything-and-recreate, progress reset to zero). They all call
 * upsertEmployeeKpis() now:
 *
 *  - companyId is ALWAYS the employee's own company — never the actor's,
 *    never an empty-string fallback.
 *  - one normalization: trimmed title, finite target > 0, unit default COUNT,
 *    period whitelisted (else MONTHLY), category default GENERAL.
 *  - rows match by id when given, else by case-insensitive title — repeated
 *    writes update instead of duplicating.
 *  - `current` (progress) is only written when the caller explicitly provides
 *    it; a merge never silently resets progress.
 *  - deletion is opt-in (`replaceMissing`) and never the default.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

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

/** Config-panel normalization rules, now shared by every writer. */
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
        select: { id: true, user: { select: { companyId: true } } },
    });
    if (!profile) throw new Error('Employee profile not found');
    const companyId = profile.user?.companyId;
    if (!companyId) throw new Error('Employee has no company — cannot write KPIs');

    const existing = await db.employeeKPI.findMany({
        where: { employeeId: args.employeeId },
        select: { id: true, title: true },
    });
    const byId = new Map(existing.map((e) => [e.id, e]));
    const byTitle = new Map(existing.map((e) => [e.title.trim().toLowerCase(), e]));

    const result: UpsertKpisResult = { created: 0, updated: 0, deleted: 0 };
    const touchedIds = new Set<string>();

    for (const item of args.kpis) {
        const match =
            (item.id && byId.get(item.id)) || byTitle.get(item.title.toLowerCase()) || null;

        if (match) {
            await db.employeeKPI.update({
                where: { id: match.id },
                data: {
                    title: item.title,
                    target: item.target,
                    unit: item.unit,
                    period: item.period,
                    category: item.category,
                    ...(item.current !== undefined ? { current: item.current } : {}),
                    updatedAt: new Date(),
                },
            });
            touchedIds.add(match.id);
            result.updated++;
        } else {
            const created = await db.employeeKPI.create({
                data: {
                    employeeId: args.employeeId,
                    companyId,
                    title: item.title,
                    target: item.target,
                    current: item.current ?? 0,
                    unit: item.unit,
                    period: item.period,
                    category: item.category,
                },
            });
            touchedIds.add(created.id);
            result.created++;
        }
    }

    if (args.replaceMissing) {
        const toDelete = existing.filter((e) => !touchedIds.has(e.id)).map((e) => e.id);
        if (toDelete.length > 0) {
            await db.employeeKPI.deleteMany({ where: { id: { in: toDelete } } });
            result.deleted = toDelete.length;
        }
    }

    return result;
}
