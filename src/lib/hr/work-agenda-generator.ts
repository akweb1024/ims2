import { prisma } from '@/lib/prisma';
import { AgendaSourceType, decodeAgendaMetadata, encodeAgendaMetadata, getISTDayRange } from '@/lib/hr/work-agenda';

type TemplateCandidate = {
  id: string;
  title: string;
  description: string | null;
  targetValue: number | null;
  employeeId: string | null;
  departmentId: string | null;
  designationId: string | null;
  employeeIds: any;
  departmentIds: any;
  designationIds: any;
  metricId?: string | null;
};

const inJsonList = (list: any, value?: string | null) => {
  if (!value || !Array.isArray(list)) return false;
  return list.map((x) => String(x)).includes(String(value));
};

const normalizeTitle = (value?: string | null) => String(value || '').trim().toLowerCase();

const getSourceType = (t: TemplateCandidate, employeeProfileId: string): AgendaSourceType => {
  if (t.employeeId === employeeProfileId || inJsonList(t.employeeIds, employeeProfileId)) return 'EMPLOYEE_TEMPLATE';
  if (t.departmentId || t.designationId || Array.isArray(t.departmentIds) || Array.isArray(t.designationIds)) return 'ROLE_TEMPLATE';
  return 'GENERIC_TEMPLATE';
};

const getSourceRank = (t: TemplateCandidate, employeeProfileId: string, departmentId?: string | null, designationId?: string | null) => {
  if (t.employeeId === employeeProfileId || inJsonList(t.employeeIds, employeeProfileId)) return 1;
  if ((departmentId && (t.departmentId === departmentId || inJsonList(t.departmentIds, departmentId))) ||
      (designationId && (t.designationId === designationId || inJsonList(t.designationIds, designationId)))) return 2;
  return 3;
};

export async function generateTodayAgendaForEmployees(args: {
  companyId?: string | null;
  employeeIds: string[];
  generatedBy?: string | null;
  forceRegenerate?: boolean;
}) {
  const { companyId, employeeIds, generatedBy = null, forceRegenerate = false } = args;
  const { start, end } = getISTDayRange();

  let totalGenerated = 0;
  let totalSkipped = 0;
  const details: Array<{ employeeId: string; generated: number; skipped: number }> = [];

  for (const employeeProfileId of employeeIds) {
    const profile = await prisma.employeeProfile.findUnique({
      where: { id: employeeProfileId },
      include: { user: { select: { departmentId: true } } }
    });
    if (!profile) continue;

    const existingToday = await prisma.workPlan.findMany({
      where: {
        employeeId: employeeProfileId,
        date: { gte: start, lte: end },
        ...(companyId ? { companyId } : {})
      },
      select: { id: true, agenda: true, strategy: true }
    });

    const isRegeneratableGenerated = (strategy?: string | null) => {
      const meta = decodeAgendaMetadata(strategy);
      return Boolean(meta && ['EMPLOYEE_TEMPLATE', 'ROLE_TEMPLATE', 'GENERIC_TEMPLATE'].includes(meta.sourceType));
    };

    const hasGeneratedItems = existingToday.some((row) => isRegeneratableGenerated(row.strategy));
    if (hasGeneratedItems && !forceRegenerate) {
      totalSkipped += 1;
      details.push({ employeeId: employeeProfileId, generated: 0, skipped: 1 });
      continue;
    }

    const [templates, goals, kpis] = await Promise.all([
      prisma.employeeTaskTemplate.findMany({
        where: {
          ...(companyId ? { companyId } : {}),
          isActive: true,
        },
        select: {
          id: true,
          title: true,
          description: true,
          targetValue: true,
          employeeId: true,
          departmentId: true,
          designationId: true,
          employeeIds: true,
          departmentIds: true,
          designationIds: true,
          metricId: true,
        }
      }),
      prisma.employeeGoal.findMany({
        where: {
          employeeId: employeeProfileId,
          // PENDING/IN_PROGRESS are the only pre-completion statuses writers produce.
          status: { in: ['IN_PROGRESS', 'PENDING'] },
          startDate: { lte: end },
          endDate: { gte: start }
        },
        select: { id: true, title: true, metricId: true }
      }),
      prisma.employeeKPI.findMany({
        where: { employeeId: employeeProfileId },
        select: { id: true, title: true, target: true, current: true }
      })
    ]);

    const eligibleTemplates = (templates as TemplateCandidate[]).filter((t) => {
      const employeeMatch = t.employeeId === employeeProfileId || inJsonList(t.employeeIds, employeeProfileId);
      const roleMatch = (profile.user.departmentId && (t.departmentId === profile.user.departmentId || inJsonList(t.departmentIds, profile.user.departmentId))) ||
        (profile.designationId && (t.designationId === profile.designationId || inJsonList(t.designationIds, profile.designationId)));
      const generic = !t.employeeId
        && !t.departmentId
        && !t.designationId
        && (!Array.isArray(t.employeeIds) || t.employeeIds.length === 0)
        && (!Array.isArray(t.departmentIds) || t.departmentIds.length === 0)
        && (!Array.isArray(t.designationIds) || t.designationIds.length === 0);
      return employeeMatch || roleMatch || generic;
    });

    const dedupeMap = new Map<string, { template: TemplateCandidate; rank: number }>();
    for (const t of eligibleTemplates) {
      const rank = getSourceRank(t, employeeProfileId, profile.user.departmentId, profile.designationId);
      const key = t.title.trim().toLowerCase();
      const existing = dedupeMap.get(key);
      if (!existing || rank < existing.rank) dedupeMap.set(key, { template: t, rank });
    }

    const chosen = Array.from(dedupeMap.values())
      .sort((a, b) => a.rank - b.rank || a.template.title.localeCompare(b.template.title))
      .map((x) => x.template);

    let retainedExisting = existingToday;
    if (forceRegenerate && hasGeneratedItems) {
      const generatedIds = existingToday.filter((row) => isRegeneratableGenerated(row.strategy)).map((x) => x.id);
      if (generatedIds.length) {
        await prisma.workPlan.deleteMany({ where: { id: { in: generatedIds } } });
        retainedExisting = existingToday.filter((x) => !generatedIds.includes(x.id));
      }
    }

    const retainedAgendaKeys = new Set(retainedExisting.map((row) => normalizeTitle(row.agenda)));
    const exactGoalByTitle = new Map(goals.map((g) => [normalizeTitle(g.title), g]));
    const exactKpiByTitle = new Map(kpis.map((k) => [normalizeTitle(k.title), k]));
    const goalByMetricId = new Map(goals.filter((g) => g.metricId).map((g) => [g.metricId as string, g]));

    let generatedForEmployee = 0;
    for (let idx = 0; idx < chosen.length; idx++) {
      const t = chosen[idx];
      const agendaKey = normalizeTitle(t.title);
      const alreadyExists = retainedAgendaKeys.has(agendaKey);
      if (alreadyExists) continue;

      // Stable reference first: a template that names a metric links to the
      // employee's current goal for that metric regardless of titles. Title
      // matching remains only for legacy templates without a metric.
      const linkedGoal = (t.metricId && goalByMetricId.get(t.metricId)) || exactGoalByTitle.get(agendaKey) || null;
      const linkedKpi = exactKpiByTitle.get(agendaKey) || null;
      const sourceType = getSourceType(t, employeeProfileId);
      const isConflict = retainedAgendaKeys.has(agendaKey);

      const meta = encodeAgendaMetadata({
        version: 1,
        sourceType,
        templateId: t.id,
        linkedKpiId: linkedKpi?.id || null,
        mandatory: sourceType === 'EMPLOYEE_TEMPLATE' || sourceType === 'ROLE_TEMPLATE',
        sequence: idx + 1,
        conflictFlag: isConflict,
        generatedAt: new Date().toISOString(),
        generatedBy,
      });

      const dateWithSequence = new Date(start.getTime() + (idx * 60 * 1000));
      await prisma.workPlan.create({
        data: {
          employeeId: employeeProfileId,
          date: dateWithSequence,
          agenda: t.title,
          strategy: meta,
          priority: sourceType === 'EMPLOYEE_TEMPLATE' ? 'HIGH' : sourceType === 'ROLE_TEMPLATE' ? 'MEDIUM' : 'LOW',
          estimatedHours: t.targetValue ? Number(t.targetValue) : 1,
          completionStatus: 'PLANNED',
          linkedGoalId: linkedGoal?.id || null,
          linkedKpiId: linkedKpi?.id || null,
          visibility: 'MANAGER',
          status: 'AUTO_GENERATED',
          companyId: companyId || null,
        } as any
      });
      retainedAgendaKeys.add(agendaKey);
      generatedForEmployee += 1;
    }

    totalGenerated += generatedForEmployee;
    if (!generatedForEmployee) totalSkipped += 1;
    details.push({ employeeId: employeeProfileId, generated: generatedForEmployee, skipped: generatedForEmployee ? 0 : 1 });
  }

  return { generated: totalGenerated, skipped: totalSkipped, details, range: { start, end } };
}
