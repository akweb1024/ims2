import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateCronRequest } from '@/lib/cron-auth';
import { computePeriodWindow } from '@/lib/kra/period';
import { computeCarryForward } from '@/lib/kra/carry-forward';

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

    for (const g of priorGoals) {
      if (g.templateId && inactiveTemplateIds.has(g.templateId)) { skipped++; continue; }

      // Recurring base stays constant; only the carried shortfall changes month to month.
      const base = g.baseTargetValue ?? g.targetValue;
      const carry = await computeCarryForward(prisma, {
        employeeId: g.employeeId,
        metricId: g.metricId,
        periodType: 'MONTHLY',
        windowStart: currentWin.startDate,
        base,
        dimension: g.dimension,
      });

      const existing = await prisma.employeeGoal.findFirst({
        where: { employeeId: g.employeeId, metricId: g.metricId, type: 'MONTHLY', startDate: currentWin.startDate },
        select: { id: true },
      });

      const targetFields = {
        targetValue: carry.targetValue,
        baseTargetValue: carry.baseTargetValue,
        carriedInValue: carry.carriedInValue,
        sourceGoalId: carry.sourceGoalId,
      };

      if (existing) {
        // Only refresh the target math — never touch this month's logged progress.
        await prisma.employeeGoal.update({ where: { id: existing.id }, data: targetFields });
        rolledUpdated++;
      } else {
        await prisma.employeeGoal.create({
          data: {
            ...targetFields,
            employeeId: g.employeeId,
            companyId: g.companyId,
            title: g.title,
            kra: g.kra,
            unit: g.unit,
            type: 'MONTHLY',
            startDate: currentWin.startDate,
            endDate: currentWin.endDate,
            isKra: true,
            metricId: g.metricId,
            templateId: g.templateId,
            dataSource: g.dataSource,
            weight: g.weight,
            dailyTarget: g.dailyTarget,
            ratePerUnit: g.ratePerUnit,
            dimension: g.dimension,
            reviewerId: g.reviewerId,
            visibility: g.visibility,
            currentValue: 0,
            verifiedValue: 0,
            achievementPercentage: 0,
            status: 'IN_PROGRESS',
          },
        });
        rolledCreated++;
      }
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
