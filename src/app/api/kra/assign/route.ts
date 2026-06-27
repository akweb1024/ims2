import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { kraAssignSchema } from '@/lib/validators/kra';
import { computePeriodWindow, KraPeriodType } from '@/lib/kra/period';

const MANAGERIAL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER'];

// POST /api/kra/assign — apply a template's metrics to employees for a period.
// Generates one EmployeeGoal per (employee, metric), idempotent for the same period window.
export const POST = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const parsed = kraAssignSchema.safeParse(await req.json());
    if (!parsed.success) return createErrorResponse(parsed.error);
    const input = parsed.data;

    // 1) Load template + items (company-scoped).
    const template = await prisma.kraTemplate.findFirst({
      where: { id: input.templateId, companyId: user.companyId },
      include: { items: { include: { metric: true } } },
    });
    if (!template) return createErrorResponse('Template not found', 404);
    if (template.items.length === 0) return createErrorResponse('Template has no metrics', 400);

    // 2) Resolve target employees → list of EmployeeProfile {id, userId}.
    let profiles = await prisma.employeeProfile.findMany({
      where: {
        ...(input.employeeIds && input.employeeIds.length ? { id: { in: input.employeeIds } } : {}),
        ...(input.designationId ? { designationId: input.designationId } : {}),
        user: {
          companyId: user.companyId,
          isActive: true,
          ...(input.departmentId ? { departmentId: input.departmentId } : {}),
        },
      },
      select: { id: true, userId: true },
    });

    // 3) Managers can only assign within their downline.
    if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
      const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
      const allowed = new Set([...downline, user.id]);
      profiles = profiles.filter((p) => allowed.has(p.userId));
    }

    if (profiles.length === 0) return createErrorResponse('No eligible employees matched', 400);

    // 4) Compute the period window once.
    const ref = input.periodRef ? new Date(input.periodRef) : new Date();
    const periodType = input.periodType as KraPeriodType;
    const win = computePeriodWindow(periodType, ref);

    // Build override lookup: `${employeeId}:${metricId}` -> { target?, ratePerUnit? }
    const overrideMap = new Map<string, { target?: number; ratePerUnit?: number }>();
    for (const o of input.overrides ?? []) overrideMap.set(`${o.employeeId}:${o.metricId}`, { target: o.target, ratePerUnit: o.ratePerUnit });

    // 5) Upsert one EmployeeGoal per (employee, metric) for this window.
    let created = 0;
    let updated = 0;

    await prisma.$transaction(async (tx) => {
      for (const profile of profiles) {
        for (const item of template.items) {
          const ov = overrideMap.get(`${profile.id}:${item.metricId}`);
          const target = ov?.target ?? item.defaultTarget;
          const ratePerUnit = ov?.ratePerUnit ?? item.ratePerUnit ?? null;

          const existing = await tx.employeeGoal.findFirst({
            where: {
              employeeId: profile.id,
              metricId: item.metricId,
              type: periodType,
              startDate: win.startDate,
            },
            select: { id: true },
          });

          const data = {
            title: item.metric.name,
            kra: item.metric.name,
            unit: item.metric.unit,
            targetValue: target,
            type: periodType,
            startDate: win.startDate,
            endDate: win.endDate,
            isKra: true,
            metricId: item.metricId,
            templateId: template.id,
            dataSource: item.metric.dataSource ?? 'MANUAL',
            weight: item.weight,
            ratePerUnit,
            visibility: 'MANAGER',
            ...(input.reviewerId ? { reviewerId: input.reviewerId } : {}),
          };

          if (existing) {
            await tx.employeeGoal.update({ where: { id: existing.id }, data });
            updated++;
          } else {
            await tx.employeeGoal.create({
              data: {
                ...data,
                employeeId: profile.id,
                companyId: user.companyId!,
                currentValue: 0,
                achievementPercentage: 0,
                status: 'IN_PROGRESS',
              },
            });
            created++;
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      period: win.label,
      employees: profiles.length,
      metrics: template.items.length,
      created,
      updated,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
});
