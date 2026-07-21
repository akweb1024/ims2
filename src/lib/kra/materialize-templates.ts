/**
 * Materialize the static role catalog (src/lib/performance/kra-kpi-templates.ts)
 * into the KRA admin console's real objects: PerformanceMetricDefinition rows
 * (the metric catalog) and KraTemplate + KraTemplateItem matrices (the weighted
 * template grid HR assigns from).
 *
 * This is the bridge that retires the catalog as a separate define surface —
 * after materializing, HR manages these templates in the console (matrix →
 * assign flow) like any other, and role KPIs flow to employees as EmployeeGoal
 * rows through /api/kra/assign.
 *
 * Idempotent: metrics upsert on the (companyId, scope:'KRA', key) unique;
 * templates match by (companyId, name); items are replaced from the catalog
 * definition on each run (weights/targets refresh, custom console edits to a
 * materialized template are overwritten by a re-run — run once, then own it in
 * the console).
 */
import type { Prisma } from '@prisma/client';
import type { prisma } from '@/lib/prisma';
import { KRA_KPI_TEMPLATES } from '@/lib/performance/kra-kpi-templates';

type Db = Prisma.TransactionClient | typeof prisma;

/** Stable snake_case metric key from a KPI title. */
export function metricKey(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
}

/** Lower-is-better for *_MAX capped units, else higher-is-better. */
export function metricDirection(unit: string): 'HIGHER_BETTER' | 'LOWER_BETTER' {
    return unit.toUpperCase().includes('MAX') ? 'LOWER_BETTER' : 'HIGHER_BETTER';
}

/** Equal weights that sum to exactly 100 (first rows absorb the remainder). */
export function distributeWeights(count: number): number[] {
    if (count <= 0) return [];
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;
    return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

export interface MaterializeResult {
    metricsCreated: number;
    metricsUpdated: number;
    templatesCreated: number;
    templatesUpdated: number;
    items: number;
}

/** Materialize every catalog template for one company. */
export async function materializeCatalogTemplates(db: Db, companyId: string): Promise<MaterializeResult> {
    const result: MaterializeResult = {
        metricsCreated: 0, metricsUpdated: 0, templatesCreated: 0, templatesUpdated: 0, items: 0,
    };

    for (const tpl of KRA_KPI_TEMPLATES) {
        // Skip the documentation placeholder entry.
        if (tpl.id === 'new_team_individual') continue;

        // 1) Metrics — one per KPI row, shared across templates by key.
        const metricIds: string[] = [];
        for (const kpi of tpl.kpis) {
            const key = metricKey(kpi.title);
            const existing = await db.performanceMetricDefinition.findFirst({
                where: { companyId, scope: 'KRA', key },
                select: { id: true },
            });
            if (existing) {
                // Refresh descriptive fields only. dataSource/aggregation are
                // console-owned operational settings (HR may have wired the
                // metric to a SYSTEM source) — never clobber them on re-run.
                await db.performanceMetricDefinition.update({
                    where: { id: existing.id },
                    data: {
                        name: kpi.title,
                        unit: kpi.unit,
                        direction: metricDirection(kpi.unit),
                        department: tpl.family,
                        isActive: true,
                    },
                });
                metricIds.push(existing.id);
                result.metricsUpdated++;
            } else {
                const created = await db.performanceMetricDefinition.create({
                    data: {
                        companyId,
                        scope: 'KRA',
                        key,
                        name: kpi.title,
                        unit: kpi.unit,
                        direction: metricDirection(kpi.unit),
                        sourceModule: 'KRA_TEMPLATE',
                        dataSource: 'MANUAL',
                        aggregation: 'SUM',
                        department: tpl.family,
                        isActive: true,
                    },
                    select: { id: true },
                });
                metricIds.push(created.id);
                result.metricsCreated++;
            }
        }

        // 2) Template matrix — weighted grid over those metrics.
        const templateName = tpl.name;
        const weights = distributeWeights(tpl.kpis.length);
        const existingTpl = await db.kraTemplate.findFirst({
            where: { companyId, name: templateName },
            select: { id: true },
        });
        let templateId: string;
        if (existingTpl) {
            await db.kraTemplate.update({
                where: { id: existingTpl.id },
                data: { description: tpl.kra, isActive: true },
            });
            templateId = existingTpl.id;
            result.templatesUpdated++;
        } else {
            const created = await db.kraTemplate.create({
                data: { companyId, name: templateName, description: tpl.kra, isActive: true },
                select: { id: true },
            });
            templateId = created.id;
            result.templatesCreated++;
        }

        // Replace items from the catalog definition (deterministic matrix).
        await db.kraTemplateItem.deleteMany({ where: { templateId } });
        for (let i = 0; i < tpl.kpis.length; i++) {
            const kpi = tpl.kpis[i];
            await db.kraTemplateItem.create({
                data: {
                    templateId,
                    metricId: metricIds[i],
                    defaultTarget: kpi.target,
                    weight: weights[i],
                    periodType: kpi.period as never,
                    dimension: 'OUTPUT' as never,
                    ...(kpi.period === 'DAILY' ? { dailyTarget: kpi.target } : {}),
                },
            });
            result.items++;
        }
    }

    return result;
}
