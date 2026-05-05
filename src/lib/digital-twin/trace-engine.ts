import { prisma } from "@/lib/prisma";
import { getEmployeeTwinStatus, getInventoryTwinStatus } from "@/lib/digital-twin/twin-engine";
import { computeHealthScore } from "@/lib/digital-twin/intelligence";
import type {
  TraceSeverity,
  TwinActivityEvent,
  TwinBehaviorTrace,
  TwinPerformanceTrace,
  TwinTracePayload,
} from "@/lib/digital-twin/trace-types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export async function buildTwinTrace(
  companyId: string,
  options?: { days?: number; limit?: number },
): Promise<TwinTracePayload> {
  const rangeDays = clamp(Number(options?.days || 14), 1, 90);
  const limit = clamp(Number(options?.limit || 120), 20, 500);
  const now = new Date();
  const since = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [employeeTwin, inventoryTwin] = await Promise.all([
    getEmployeeTwinStatus(companyId),
    getInventoryTwinStatus(companyId),
  ]);

  const [
    taskCreated,
    taskCompleted,
    dispatchUpdates,
    stockMovements,
    performanceSignals,
    auditEvents,
    attendanceSignals,
    workReportSignals,
    kpiSignals,
    projectSignals,
    thinkTankSignals,
    employeeProfiles,
    openDeals,
    activeTickets,
    workReportPerformance,
    tasksCompleted7d,
    dispatchDelivered7d,
    stockMovements7d,
  ] = await Promise.all([
    prisma.task.findMany({
      where: { companyId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        priority: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        assignedBy: { select: { name: true, email: true } },
      },
    }),
    prisma.task.findMany({
      where: { companyId, status: "COMPLETED", updatedAt: { gte: since } },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.dispatchOrder.findMany({
      where: { companyId, updatedAt: { gte: since } },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        status: true,
        trackingNumber: true,
        updatedAt: true,
        updatedBy: { select: { name: true, email: true } },
      },
    }),
    prisma.stockMovement.findMany({
      where: {
        createdAt: { gte: since },
        inventoryItem: { companyId },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        quantity: true,
        notes: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        inventoryItem: { select: { id: true, name: true, sku: true } },
      },
    }),
    prisma.performanceSignalEvent.findMany({
      where: { companyId, capturedAt: { gte: since } },
      orderBy: { capturedAt: "desc" },
      take: Math.min(limit, 150),
      select: {
        id: true,
        metricKey: true,
        metricScope: true,
        value: true,
        severity: true,
        sourceModule: true,
        sourceEntityType: true,
        sourceEntityId: true,
        capturedAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: {
        createdAt: { gte: since },
        entity: { in: ["task", "dispatch_order", "invoice", "inventory_item", "digital_twin"] },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 120),
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.attendance.findMany({
      where: {
        companyId,
        date: { gte: since },
        OR: [
          { isLate: true },
          { shortMinutes: { gt: 0 } },
          { status: { not: "PRESENT" } },
        ],
      },
      orderBy: { date: "desc" },
      take: limit,
      select: {
        id: true,
        employeeId: true,
        date: true,
        status: true,
        isLate: true,
        lateMinutes: true,
        shortMinutes: true,
        employee: {
          select: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    }),
    prisma.workReport.findMany({
      where: {
        companyId,
        date: { gte: since },
      },
      orderBy: { date: "desc" },
      take: limit,
      select: {
        id: true,
        employeeId: true,
        title: true,
        date: true,
        status: true,
        managerRating: true,
        kraMatchRatio: true,
        employee: {
          select: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    }),
    prisma.employeeKPI.findMany({
      where: {
        companyId,
        updatedAt: { gte: since },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        employeeId: true,
        title: true,
        target: true,
        current: true,
        period: true,
        updatedAt: true,
        employee: {
          select: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    }),
    prisma.projectMember.findMany({
      where: {
        joinedAt: { gte: since },
        project: { companyId },
      },
      orderBy: { joinedAt: "desc" },
      take: limit,
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: { select: { name: true, email: true } },
        project: { select: { id: true, title: true, status: true } },
      },
    }),
    prisma.thinkTankIdeaAuditEvent.findMany({
      where: {
        createdAt: { gte: since },
        idea: { companyId },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        action: true,
        outcome: true,
        createdAt: true,
        ideaId: true,
        actor: { select: { name: true, email: true } },
      },
    }),
    prisma.employeeProfile.findMany({
      where: { user: { companyId } },
      select: {
        id: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.deal.count({
      where: {
        companyId,
        stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
      },
    }),
    prisma.supportTicket.count({
      where: {
        companyId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
    }),
    prisma.workReport.groupBy({
      by: ["employeeId"],
      where: { companyId, date: { gte: since30d } },
      _sum: {
        tasksCompleted: true,
        revenueGenerated: true,
      },
      _avg: { managerRating: true },
    }),
    prisma.task.count({
      where: { companyId, status: "COMPLETED", updatedAt: { gte: since7d } },
    }),
    prisma.dispatchOrder.count({
      where: { companyId, status: "DELIVERED", updatedAt: { gte: since7d } },
    }),
    prisma.stockMovement.count({
      where: {
        createdAt: { gte: since7d },
        inventoryItem: { companyId },
      },
    }),
  ]);

  const activities: TwinActivityEvent[] = [
    ...taskCreated.map((t) => ({
      id: `task-created-${t.id}`,
      type: "TASK_CREATED" as const,
      title: `Task created: ${t.title}`,
      description: `Assigned to ${t.user?.name || t.user?.email || "Unknown"} by ${t.assignedBy?.name || t.assignedBy?.email || "System"}`,
      severity: (t.priority === "HIGH" ? "WARNING" : "INFO") as TraceSeverity,
      at: t.createdAt.toISOString(),
      entityType: "task",
      entityId: t.id,
      actorName: t.assignedBy?.name || t.assignedBy?.email || undefined,
    })),
    ...taskCompleted.map((t) => ({
      id: `task-completed-${t.id}`,
      type: "TASK_COMPLETED" as const,
      title: `Task completed: ${t.title}`,
      description: `Completed by ${t.user?.name || t.user?.email || "Unknown"}`,
      severity: "SUCCESS" as const,
      at: t.updatedAt.toISOString(),
      entityType: "task",
      entityId: t.id,
      actorName: t.user?.name || t.user?.email || undefined,
    })),
    ...dispatchUpdates.map((d) => ({
      id: `dispatch-updated-${d.id}`,
      type: "DISPATCH_UPDATED" as const,
      title: `Dispatch ${d.status.replaceAll("_", " ")}`,
      description: d.trackingNumber
        ? `Tracking ${d.trackingNumber}`
        : "Status update without tracking number",
      severity: (
        d.status === "DELIVERED"
          ? "SUCCESS"
          : d.status === "LOST" || d.status === "RETURNED"
            ? "CRITICAL"
            : "INFO"
      ) as TraceSeverity,
      at: d.updatedAt.toISOString(),
      entityType: "dispatch_order",
      entityId: d.id,
      actorName: d.updatedBy?.name || d.updatedBy?.email || undefined,
    })),
    ...stockMovements.map((m) => ({
      id: `stock-movement-${m.id}`,
      type: "STOCK_MOVEMENT" as const,
      title: `Stock ${m.type.toUpperCase()}: ${m.inventoryItem.name}`,
      description: `Qty ${m.quantity} (${m.inventoryItem.sku})${m.notes ? ` · ${m.notes}` : ""}`,
      severity: (m.type.toUpperCase() === "OUT" && m.quantity > 10 ? "WARNING" : "INFO") as TraceSeverity,
      at: m.createdAt.toISOString(),
      entityType: "inventory_item",
      entityId: m.inventoryItem.id,
      actorName: m.user?.name || m.user?.email || undefined,
    })),
    ...performanceSignals.map((signal) => ({
      id: `performance-signal-${signal.id}`,
      type: "PERFORMANCE_SIGNAL" as const,
      title: `Signal ${signal.metricKey}`,
      description: `${signal.metricScope} · ${signal.value} · ${signal.sourceModule}`,
      severity: (["INFO", "SUCCESS", "WARNING", "CRITICAL"].includes(signal.severity)
        ? signal.severity
        : "INFO") as TraceSeverity,
      at: signal.capturedAt.toISOString(),
      entityType: signal.sourceEntityType || "performance_signal_event",
      entityId: signal.sourceEntityId || signal.id,
      actorName: undefined,
    })),
    ...attendanceSignals.map((row) => ({
      id: `attendance-signal-${row.id}`,
      type: "ATTENDANCE_SIGNAL" as const,
      title: `Attendance signal: ${row.status}`,
      description: `${row.employee?.user?.name || row.employee?.user?.email || "Unknown"} · Late ${row.lateMinutes || 0}m · Short ${row.shortMinutes || 0}m`,
      severity: (
        row.status === "ABSENT"
          ? "CRITICAL"
          : row.isLate || (row.shortMinutes || 0) > 0
            ? "WARNING"
            : "INFO"
      ) as TraceSeverity,
      at: row.date.toISOString(),
      entityType: "attendance",
      entityId: row.id,
      actorName: row.employee?.user?.name || row.employee?.user?.email || undefined,
    })),
    ...workReportSignals.map((row) => ({
      id: `work-report-signal-${row.id}`,
      type: "WORK_REPORT_SIGNAL" as const,
      title: `Work report: ${row.title}`,
      description: `${row.employee?.user?.name || row.employee?.user?.email || "Unknown"} · KRA ${((row.kraMatchRatio || 0) * 100).toFixed(0)}% · Rating ${row.managerRating || "N/A"}`,
      severity: (
        row.status === "REJECTED"
          ? "CRITICAL"
          : (row.kraMatchRatio || 0) < 0.5
            ? "WARNING"
            : "SUCCESS"
      ) as TraceSeverity,
      at: row.date.toISOString(),
      entityType: "work_report",
      entityId: row.id,
      actorName: row.employee?.user?.name || row.employee?.user?.email || undefined,
    })),
    ...kpiSignals.map((kpi) => {
      const progress = kpi.target > 0 ? (kpi.current / kpi.target) * 100 : 0;
      return {
        id: `kpi-signal-${kpi.id}`,
        type: "KPI_SIGNAL" as const,
        title: `KPI updated: ${kpi.title}`,
        description: `${kpi.employee?.user?.name || kpi.employee?.user?.email || "Unknown"} · ${progress.toFixed(0)}% (${kpi.current}/${kpi.target}) · ${kpi.period}`,
        severity: (progress < 40 ? "WARNING" : "INFO") as TraceSeverity,
        at: kpi.updatedAt.toISOString(),
        entityType: "employee_kpi",
        entityId: kpi.id,
        actorName: kpi.employee?.user?.name || kpi.employee?.user?.email || undefined,
      };
    }),
    ...projectSignals.map((row) => ({
      id: `project-signal-${row.id}`,
      type: "PROJECT_SIGNAL" as const,
      title: `Project assignment: ${row.project.title}`,
      description: `${row.user?.name || row.user?.email || "Unknown"} joined as ${row.role || "MEMBER"} · ${row.project.status}`,
      severity: "INFO" as const,
      at: row.joinedAt.toISOString(),
      entityType: "project",
      entityId: row.project.id,
      actorName: row.user?.name || row.user?.email || undefined,
    })),
    ...thinkTankSignals.map((row) => ({
      id: `think-tank-signal-${row.id}`,
      type: "THINK_TANK_SIGNAL" as const,
      title: `Think Tank: ${row.action.replaceAll("_", " ")}`,
      description: row.outcome || "Idea workflow action recorded.",
      severity: (
        row.outcome === "REJECTED" || row.outcome === "VETOED"
          ? "WARNING"
          : "INFO"
      ) as TraceSeverity,
      at: row.createdAt.toISOString(),
      entityType: "think_tank_idea",
      entityId: row.ideaId || row.id,
      actorName: row.actor?.name || row.actor?.email || undefined,
    })),
    ...auditEvents.map((a) => ({
      id: `audit-${a.id}`,
      type: "AUDIT_EVENT" as const,
      title: `${a.entity.replaceAll("_", " ")}: ${a.action}`,
      description: `Entity ${a.entity} (${a.entityId})`,
      severity: "INFO" as const,
      at: a.createdAt.toISOString(),
      entityType: a.entity,
      entityId: a.entityId,
      actorName: a.user?.name || a.user?.email || undefined,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);

  const employeeById = new Map(employeeProfiles.map((p) => [p.id, p]));
  const employeeTwinByUserId = new Map(employeeTwin.map((t) => [t.userId, t]));

  const behaviors: TwinBehaviorTrace[] = employeeProfiles.map((profile) => {
    const user = profile.user;
    const userId = user?.id || "";
    const twin = employeeTwinByUserId.get(userId);

    const behaviorScore = clamp(
      35
      + (twin?.attendanceDays7d || 0) * 6
      + Math.min(twin?.completedTasks30d || 0, 12) * 2
      + Math.min(twin?.avgKpiProgress || 0, 100) * 0.15
      + Math.min((twin?.avgKraMatch30d || 0) * 100, 100) * 0.1
      - (twin?.overdueTasks || 0) * 8
      - Math.max((twin?.taskCount || 0) - 5, 0) * 2,
      0,
      100,
    );

    let risk: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    if (
      (twin?.overdueTasks || 0) >= 3 ||
      twin?.status === "OVERLOADED" ||
      twin?.status === "OFFLINE_ALERT" ||
      (twin?.avgKpiProgress || 0) < 40
    ) {
      risk = "HIGH";
    } else if (
      (twin?.overdueTasks || 0) > 0 ||
      (twin?.attendanceDays7d || 0) <= 2 ||
      (twin?.taskCount || 0) >= 4 ||
      (twin?.avgKpiProgress || 0) < 70
    ) {
      risk = "MEDIUM";
    }

    return {
      employeeId: profile.id,
      userId,
      name: user?.name || user?.email || "Unnamed Employee",
      currentStatus: twin?.status || "OFFLINE",
      attendanceDays7d: twin?.attendanceDays7d || 0,
      workReports7d: twin?.workReports7d || 0,
      openTasks: twin?.taskCount || 0,
      completedTasks30d: twin?.completedTasks30d || 0,
      overdueTasks: twin?.overdueTasks || 0,
      avgKraMatch30d: twin?.avgKraMatch30d || 0,
      avgKpiProgress: twin?.avgKpiProgress || 0,
      activeProjects: twin?.activeProjectsCount || 0,
      thinkTankContributions30d:
        (twin?.thinkTankIdeas30d || 0) +
        (twin?.thinkTankVotes30d || 0) +
        (twin?.thinkTankQuestions30d || 0) +
        (twin?.thinkTankComments30d || 0),
      disciplineScore: twin?.disciplineScore || 0,
      activeDeals: twin?.activeDealsCount || 0,
      activeTickets: twin?.activeTicketsCount || 0,
      activeReviews: twin?.activeReviewsCount || 0,
      behaviorScore,
      risk,
    };
  });

  const contributorRows = workReportPerformance
    .map((row) => {
      const profile = employeeById.get(row.employeeId);
      return {
        employeeId: row.employeeId,
        name: profile?.user?.name || profile?.user?.email || "Unknown",
        tasksCompleted30d: row._sum.tasksCompleted || 0,
        revenueGenerated30d: row._sum.revenueGenerated || 0,
        avgRating30d: Number((row._avg.managerRating || 0).toFixed(2)),
      };
    })
    .sort((a, b) => b.tasksCompleted30d - a.tasksCompleted30d)
    .slice(0, 8);

  const performance: TwinPerformanceTrace = {
    healthScore: computeHealthScore(employeeTwin, inventoryTwin),
    activeEmployees: employeeTwin.filter((e) => e.status === "ACTIVE").length,
    overloadedEmployees: employeeTwin.filter((e) => e.status === "OVERLOADED").length,
    offlineAlerts: employeeTwin.filter((e) => e.status === "OFFLINE_ALERT").length,
    criticalInventory: inventoryTwin.filter((i) => i.status === "CRITICAL").length,
    warningInventory: inventoryTwin.filter((i) => i.status === "WARNING").length,
    tasksCompleted7d,
    dispatchDelivered7d,
    stockMovements7d,
    openDeals,
    avgKpiProgress: employeeTwin.length > 0
      ? Number((employeeTwin.reduce((sum, row) => sum + (row.avgKpiProgress || 0), 0) / employeeTwin.length).toFixed(2))
      : 0,
    avgKraMatch30d: employeeTwin.length > 0
      ? Number((employeeTwin.reduce((sum, row) => sum + (row.avgKraMatch30d || 0), 0) / employeeTwin.length).toFixed(3))
      : 0,
    thinkTankContributors: employeeTwin.filter((row) =>
      row.thinkTankIdeas30d > 0 ||
      row.thinkTankVotes30d > 0 ||
      row.thinkTankQuestions30d > 0 ||
      row.thinkTankComments30d > 0,
    ).length,
    topContributors: contributorRows,
  };

  if (performance.topContributors.length === 0 && activeTickets > 0) {
    performance.topContributors = [];
  }

  return {
    generatedAt: new Date().toISOString(),
    rangeDays,
    activities,
    behaviors: behaviors.sort((a, b) => b.behaviorScore - a.behaviorScore),
    performance,
  };
}
