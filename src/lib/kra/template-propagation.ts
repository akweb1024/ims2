/**
 * Console template-edit propagation (Phase 3 of KRA unification).
 *
 * Editing a KraTemplate in the HR console previously changed only future
 * assignments — already-assigned EmployeeGoals silently kept the old targets.
 * This module pushes an edited template's items into the CURRENT-period goals
 * that came from that template, with one guard:
 *
 *   Per-employee tweaks are respected. A goal whose baseTargetValue differs
 *   from the item's OLD defaultTarget was deliberately customized for that
 *   employee (the console's "template + per-employee tweak" model) — it is
 *   skipped, not clobbered.
 *
 * Carry-forward composition is preserved (targetValue = new base + carriedIn)
 * and each touched goal is recounted so its achievement reflects the new
 * target. Progress values are never modified. Items removed from a template
 * do NOT retract existing goals (they carry history); they simply stop being
 * assigned going forward.
 */
import type { Prisma } from '@prisma/client';
import type { prisma } from '@/lib/prisma';
import { computePeriodWindow, type KraPeriodType } from '@/lib/kra/period';
import { recountGoal } from '@/lib/kra/recount';

type Db = Prisma.TransactionClient | typeof prisma;

export interface TemplateItemLike {
    metricId: string;
    periodType: string;
    defaultTarget: number;
    weight: number;
    dimension: string;
    dailyTarget?: number | null;
    ratePerUnit?: number | null;
}

export interface GoalForPropagation {
    id: string;
    baseTargetValue: number | null;
    targetValue: number;
    carriedInValue: number;
}

export interface PropagationUpdate {
    goalId: string;
    targetValue: number;
    baseTargetValue: number;
    weight: number;
    dimension: string;
    dailyTarget: number | null;
    ratePerUnit: number | null;
}

export interface PropagationPlan { updates: PropagationUpdate[]; skippedTweaked: number }

export const itemKey = (metricId: string, periodType: string) => `${metricId}:${periodType}`;

/**
 * Pure: decide which goals to update for one item. `oldDefault` is the item's
 * defaultTarget before the edit (undefined = item is new to the template, so
 * there is no tweak baseline — propagate).
 */
export function planItemPropagation(
    item: TemplateItemLike,
    goals: GoalForPropagation[],
    oldDefault: number | undefined,
): PropagationPlan {
    const updates: PropagationUpdate[] = [];
    let skippedTweaked = 0;

    for (const goal of goals) {
        const base = goal.baseTargetValue ?? goal.targetValue - goal.carriedInValue;
        if (oldDefault !== undefined && base !== oldDefault) {
            skippedTweaked++; // per-employee tweak — leave it alone
            continue;
        }
        updates.push({
            goalId: goal.id,
            baseTargetValue: item.defaultTarget,
            targetValue: item.defaultTarget + (goal.carriedInValue || 0),
            weight: item.weight,
            dimension: item.dimension,
            dailyTarget: item.dailyTarget ?? null,
            ratePerUnit: item.ratePerUnit ?? null,
        });
    }
    return { updates, skippedTweaked };
}

export interface PropagateResult { updatedGoals: number; skippedTweaked: number }

/**
 * Push the template's (post-edit) items into current-period goals assigned
 * from it. `oldDefaults` maps itemKey(metricId, periodType) → the pre-edit
 * defaultTarget, captured by the caller before replacing the items.
 */
export async function propagateTemplateToGoals(
    db: Db,
    args: { templateId: string; oldDefaults: Map<string, number>; ref?: Date },
): Promise<PropagateResult> {
    const items = await db.kraTemplateItem.findMany({
        where: { templateId: args.templateId },
        select: { metricId: true, periodType: true, defaultTarget: true, weight: true, dimension: true, dailyTarget: true, ratePerUnit: true },
    });

    let updatedGoals = 0;
    let skippedTweaked = 0;
    const ref = args.ref ?? new Date();

    for (const item of items) {
        const window = computePeriodWindow(item.periodType as KraPeriodType, ref);
        const goals = await db.employeeGoal.findMany({
            where: {
                templateId: args.templateId,
                metricId: item.metricId,
                type: item.periodType as never,
                startDate: window.startDate,
            },
            select: { id: true, baseTargetValue: true, targetValue: true, carriedInValue: true },
        });
        if (goals.length === 0) continue;

        const plan = planItemPropagation(
            { ...item, periodType: item.periodType as string, dimension: item.dimension as string },
            goals,
            args.oldDefaults.get(itemKey(item.metricId, item.periodType as string)),
        );
        skippedTweaked += plan.skippedTweaked;

        for (const u of plan.updates) {
            await db.employeeGoal.update({
                where: { id: u.goalId },
                data: {
                    targetValue: u.targetValue,
                    baseTargetValue: u.baseTargetValue,
                    weight: u.weight,
                    dimension: u.dimension as never,
                    dailyTarget: u.dailyTarget,
                    ratePerUnit: u.ratePerUnit,
                },
            });
            await recountGoal(db, u.goalId); // achievement vs the new target
            updatedGoals++;
        }
    }

    return { updatedGoals, skippedTweaked };
}
