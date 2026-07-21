import { prisma } from '@/lib/prisma';
import { AgendaSourceType, decodeAgendaMetadata, encodeAgendaMetadata, getISTDayRange } from '@/lib/hr/work-agenda';
import { rollUnfinishedPlans } from '@/lib/hr/daily-carry';

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

  // S3 daily carry: roll yesterday's unfinished plans (with auto-penalty and
  // clean-day reward) before generating, so carried rows suppress duplicate
  // generation of the same task titles. Non-fatal — generation must proceed.
  try {
    await rollUnfinishedPlans({ employeeIds, companyId });
  } catch (carryErr) {
    console.error('Daily carry failed (non-fatal):', carryErr);
  }

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
      if (meta?.carriedFromId) return false; // carried work survives regeneration
      return Boolean(meta && ['EMPLOYEE_TEMPLATE', 'ROLE_TEMPLATE', 'GENERIC_TEMPLATE', 'ASSIGNMENT'].includes(meta.sourceType));
    };

    const hasGeneratedItems = existingToday.some((row) => isRegeneratableGenerated(row.strategy));
    if (hasGeneratedItems && !forceRegenerate) {
      totalSkipped += 1;
      details.push({ employeeId: employeeProfileId, generated: 0, skipped: 1 });
      continue;
    }

    const [templates, goals] = await Promise.all([
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
        // kpiId is the mirrored legacy row (LEGACY_SYNC bridge) — kept on the
        // WorkPlan so linkedKpiId consumers stay stable during the migration.
        select: { id: true, title: true, metricId: true, kpiId: true }
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
    // KRA truth is EmployeeGoal (unification): the goal carries the title, the
    // metric link, and — via kpiId — the mirrored legacy row. The old separate
    // EmployeeKPI title map is redundant now that goals mirror every KPI.
    const exactGoalByTitle = new Map(goals.map((g) => [normalizeTitle(g.title), g]));
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
      const linkedKpiId = linkedGoal?.kpiId ?? null;
      const sourceType = getSourceType(t, employeeProfileId);
      const isConflict = retainedAgendaKeys.has(agendaKey);

      const meta = encodeAgendaMetadata({
        version: 1,
        sourceType,
        templateId: t.id,
        linkedKpiId,
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
          linkedKpiId,
          visibility: 'MANAGER',
          status: 'AUTO_GENERATED',
          companyId: companyId || null,
        } as any
      });
      retainedAgendaKeys.add(agendaKey);
      generatedForEmployee += 1;
    }

    // Assignment-derived items: an IT task or ad-hoc assignment that is active
    // for this employee lands on today's agenda automatically — IN_PROGRESS,
    // or started and due today / overdue. Linked by id (itTaskId / taskId),
    // deduped by title against templates and carried rows, and refreshed from
    // live assignment state on regeneration.
    const activeWindow = {
      status: { in: ['PENDING', 'IN_PROGRESS'] as never },
      AND: [
        { OR: [{ status: 'IN_PROGRESS' as never }, { dueDate: { lte: end } }] },
        { OR: [{ startDate: null }, { startDate: { lte: end } }] },
      ],
    };
    const [itTasks, adhocTasks] = await Promise.all([
      prisma.iTTask.findMany({
        where: { assignedToId: profile.userId, ...(companyId ? { companyId } : {}), ...activeWindow },
        select: { id: true, title: true, priority: true, estimatedHours: true, projectId: true, linkedMetricId: true },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        take: 20,
      }),
      prisma.task.findMany({
        where: { userId: profile.userId, ...(companyId ? { companyId } : {}), ...activeWindow },
        select: { id: true, title: true, priority: true, estimatedEffort: true, projectId: true },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        take: 20,
      }),
    ]);

    const assignmentItems = [
      ...itTasks.map((task) => ({
        title: task.title,
        priority: task.priority === 'URGENT' ? 'HIGH' : String(task.priority),
        estimatedHours: task.estimatedHours ?? 1,
        linkedMetricId: (task.linkedMetricId ?? null) as string | null,
        link: { itTaskId: task.id, itProjectId: task.projectId ?? null },
      })),
      ...adhocTasks.map((task) => ({
        title: task.title,
        priority: task.priority === 'URGENT' ? 'HIGH' : String(task.priority),
        estimatedHours: task.estimatedEffort ?? 1,
        linkedMetricId: null as string | null,
        link: { taskId: task.id, projectId: task.projectId ?? null },
      })),
    ];

    for (let aIdx = 0; aIdx < assignmentItems.length; aIdx++) {
      const item = assignmentItems[aIdx];
      const agendaKey = normalizeTitle(item.title);
      if (retainedAgendaKeys.has(agendaKey)) continue;

      const seq = chosen.length + aIdx + 1;
      const meta = encodeAgendaMetadata({
        version: 1,
        sourceType: 'ASSIGNMENT',
        sequence: seq,
        generatedAt: new Date().toISOString(),
        generatedBy,
      });
      await prisma.workPlan.create({
        data: {
          employeeId: employeeProfileId,
          date: new Date(start.getTime() + ((chosen.length + aIdx) * 60 * 1000)),
          agenda: item.title,
          strategy: meta,
          priority: item.priority,
          estimatedHours: item.estimatedHours,
          completionStatus: 'PLANNED',
          visibility: 'MANAGER',
          status: 'AUTO_GENERATED',
          companyId: companyId || null,
          linkedKpiId: item.linkedMetricId ?? null,
          ...item.link,
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
