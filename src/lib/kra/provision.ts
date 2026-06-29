/**
 * New-hire auto-provisioning (Plan B, Phase 3 — spec §9). Idempotent.
 *
 * - KRAs: if the employee has no KRA framework goals, seed the default weighted 6-set
 *   (OUTPUT 30 / QUALITY 20 / TAT 15 / COLLABORATION 15 / IMPROVEMENT 10 / BEHAVIOR 10),
 *   modelled as YEARLY isKra EmployeeGoals (achievement %, no metric).
 * - Goals: if the employee has no concrete goals and has a department, expand that
 *   department's active KraTemplate items into goals (deduped per period window).
 * Only fills what's missing; safe to call repeatedly.
 */
import { prisma } from '@/lib/prisma';
import { computePeriodWindow } from '@/lib/kra/period';
import { KraScopeError } from '@/lib/kra/scope';

const DEFAULT_KRAS: Array<{ dimension: 'OUTPUT' | 'QUALITY' | 'TAT' | 'COLLABORATION' | 'IMPROVEMENT' | 'BEHAVIOR'; weight: number; title: string }> = [
  { dimension: 'OUTPUT', weight: 30, title: 'Achieve role deliverables target' },
  { dimension: 'QUALITY', weight: 20, title: 'Maintain quality standards' },
  { dimension: 'TAT', weight: 15, title: 'Meet turnaround-time targets' },
  { dimension: 'COLLABORATION', weight: 15, title: 'Collaborate effectively' },
  { dimension: 'IMPROVEMENT', weight: 10, title: 'Drive continuous improvement' },
  { dimension: 'BEHAVIOR', weight: 10, title: 'Demonstrate professional behavior' },
];

// Department-name -> OUTPUT KRA title override.
const OUTPUT_TITLE_BY_DEPT: Record<string, string> = {
  Editorial: 'Publish target articles',
  Sales: 'Achieve sales revenue target',
  Marketing: 'Deliver marketing campaign targets',
};

export async function provisionEmployee(userId: string, assignerId: string) {
  const profile = await prisma.employeeProfile.findUnique({
    where: { userId },
    select: { id: true, user: { select: { companyId: true, departmentId: true } } },
  });
  if (!profile) throw new KraScopeError('Employee profile not found', 404);
  const companyId = profile.user?.companyId;
  const departmentId = profile.user?.departmentId ?? null;
  if (!companyId) throw new KraScopeError('Employee has no company', 400);

  const result = { krasCreated: 0, goalsCreated: 0 };

  // --- 1) Default KRA framework ---
  const existingKra = await prisma.employeeGoal.count({ where: { employeeId: profile.id, isKra: true } });
  if (existingKra === 0) {
    const win = computePeriodWindow('YEARLY', new Date());
    let outputTitle = DEFAULT_KRAS[0].title;
    if (departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: departmentId }, select: { name: true } });
      if (dept?.name && OUTPUT_TITLE_BY_DEPT[dept.name]) outputTitle = OUTPUT_TITLE_BY_DEPT[dept.name];
    }

    await prisma.employeeGoal.createMany({
      data: DEFAULT_KRAS.map((k) => ({
        employeeId: profile.id,
        companyId,
        title: k.dimension === 'OUTPUT' ? outputTitle : k.title,
        unit: '%',
        targetValue: 100,
        currentValue: 0,
        achievementPercentage: 0,
        type: 'YEARLY' as const,
        startDate: win.startDate,
        endDate: win.endDate,
        dueDate: win.endDate,
        status: 'PENDING',
        isKra: true,
        weight: k.weight,
        dimension: k.dimension,
        assignedById: assignerId,
        visibility: 'MANAGER',
      })),
    });
    result.krasCreated = DEFAULT_KRAS.length;
  }

  // --- 2) Department template goals ---
  const existingGoals = await prisma.employeeGoal.count({ where: { employeeId: profile.id, isKra: false } });
  if (existingGoals === 0 && departmentId) {
    const template = await prisma.kraTemplate.findFirst({
      where: { companyId, departmentId, isActive: true },
      include: { items: { include: { metric: true } } },
    });
    if (template && template.items.length > 0) {
      for (const item of template.items) {
        const win = computePeriodWindow(item.periodType as never, new Date());
        const dup = await prisma.employeeGoal.findFirst({
          where: { employeeId: profile.id, metricId: item.metricId, type: item.periodType, startDate: win.startDate },
          select: { id: true },
        });
        if (dup) continue;
        await prisma.employeeGoal.create({
          data: {
            employeeId: profile.id,
            companyId,
            title: item.metric.name,
            kra: item.metric.name,
            unit: item.metric.unit,
            targetValue: item.defaultTarget,
            currentValue: 0,
            achievementPercentage: 0,
            type: item.periodType,
            startDate: win.startDate,
            endDate: win.endDate,
            dueDate: win.endDate,
            status: 'PENDING',
            isKra: false,
            metricId: item.metricId,
            templateId: template.id,
            dataSource: item.metric.dataSource ?? 'MANUAL',
            weight: item.weight,
            dimension: item.dimension,
            ratePerUnit: item.ratePerUnit ?? null,
            assignedById: assignerId,
            visibility: 'MANAGER',
          },
        });
        result.goalsCreated++;
      }
    }
  }

  return result;
}
