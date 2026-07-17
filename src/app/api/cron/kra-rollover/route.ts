import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateCronRequest } from '@/lib/cron-auth';
import { computePeriodWindow } from '@/lib/kra/period';
import { upsertGoal, notifyGoalsAssigned } from '@/lib/kra/create-goals';

export const dynamic = 'force-dynamic';

// GET /api/cron/kra-rollover[?asOf=YYYY-MM-DD]
// Monthly rollover: auto-recreates this month's MONTHLY OUTPUT KRA goals from
// the prior month's, rolling any unmet target forward (carry-forward, no cap).
// Idempotent — recomputes carry from the prior goal each run, never increments.
// Guards: active employees only; goals from archived templates are skipped.
export async function GET(req: NextRequest) {
  try {
    const cronAuthError = validateCronRequest(req);
    if (cronAuthError) return cronAuthError;

    const asOf = new URL(req.url).searchParams.get('asOf');
    const now = asOf ? new Date(asOf) : new Date();
    const currentWin = computePeriodWindow('MONTHLY', now);
    // A date safely inside the previous month (day 15 dodges month-length edges).
    const priorRef = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    const priorWin = computePeriodWindow('MONTHLY', priorRef);

    // Prior-month OUTPUT KRA goals for active employees.
    const priorGoals = await prisma.employeeGoal.findMany({
      where: {
        type: 'MONTHLY',
        dimension: 'OUTPUT',
        isKra: true,
        startDate: priorWin.startDate,
        employee: { user: { isActive: true } },
      },
      select: {
        id: true, employeeId: true, companyId: true, metricId: true, templateId: true,
        title: true, kra: true, unit: true, weight: true, ratePerUnit: true,
        dailyTarget: true, dimension: true, reviewerId: true, dataSource: true,
        visibility: true, targetValue: true, baseTargetValue: true,
      },
    });

    // Set of archived template ids → skip perpetuating goals from them.
    const templateIds = Array.from(new Set(priorGoals.map((g) => g.templateId).filter(Boolean))) as string[];
    const inactiveTemplateIds = new Set(
      templateIds.length
        ? (await prisma.kraTemplate.findMany({ where: { id: { in: templateIds }, isActive: false }, select: { id: true } })).map((t) => t.id)
        : []
    );

    let rolledCreated = 0;
    let rolledUpdated = 0;
    let skipped = 0;

    const createdByEmployee = new Map<string, number>();

    for (const g of priorGoals) {
      if (g.templateId && inactiveTemplateIds.has(g.templateId)) { skipped++; continue; }

      // Recurring base stays constant; the service recomputes the carried
      // shortfall from the prior period on every run (idempotent).
      const base = g.baseTargetValue ?? g.targetValue;
      const res = await upsertGoal(prisma, {
        employeeId: g.employeeId,
        companyId: g.companyId,
        origin: 'ROLLOVER',
        title: g.title,
        kra: g.kra,
        unit: g.unit,
        targetValue: base,
        type: 'MONTHLY',
        startDate: currentWin.startDate,
        endDate: currentWin.endDate,
        isKra: true,
        weight: g.weight ?? 1,
        dimension: g.dimension,
        metricId: g.metricId,
        templateId: g.templateId,
        dataSource: g.dataSource,
        dailyTarget: g.dailyTarget,
        ratePerUnit: g.ratePerUnit,
        reviewerId: g.reviewerId,
        visibility: g.visibility,
      });
      if (res.created) {
        rolledCreated++;
        createdByEmployee.set(g.employeeId, (createdByEmployee.get(g.employeeId) || 0) + 1);
      } else {
        rolledUpdated++;
      }
    }

    for (const [employeeId, count] of createdByEmployee) {
      await notifyGoalsAssigned({ employeeId, origin: 'ROLLOVER', count });
    }

    return NextResponse.json({
      ok: true,
      from: priorWin.label,
      to: currentWin.label,
      eligible: priorGoals.length,
      created: rolledCreated,
      updated: rolledUpdated,
      skipped,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
