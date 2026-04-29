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
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [employeeTwin, inventoryTwin] = await Promise.all([
    getEmployeeTwinStatus(companyId),
    getInventoryTwinStatus(companyId),
  ]);

  const [
    taskCreated,
    taskCompleted,
    dispatchUpdates,
    stockMovements,
    auditEvents,
    employeeProfiles,
    attendance7d,
    allTasksForProfiles,
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
    prisma.employeeProfile.findMany({
      where: { user: { companyId } },
      select: {
        id: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.attendance.findMany({
      where: { companyId, date: { gte: since7d } },
      select: { employeeId: true, date: true },
    }),
    prisma.task.findMany({
      where: { companyId },
      select: {
        userId: true,
        status: true,
        dueDate: true,
        updatedAt: true,
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
  const userIdToEmployee = new Map(
    employeeProfiles
      .filter((p) => p.user?.id)
      .map((p) => [p.user!.id, p]),
  );

  const attendanceDaysByEmployee = new Map<string, Set<string>>();
  for (const row of attendance7d) {
    if (!attendanceDaysByEmployee.has(row.employeeId)) {
      attendanceDaysByEmployee.set(row.employeeId, new Set<string>());
    }
    const day = row.date.toISOString().slice(0, 10);
    attendanceDaysByEmployee.get(row.employeeId)!.add(day);
  }

  const taskMetricsByUser = new Map<
    string,
    { openTasks: number; completedTasks30d: number; overdueTasks: number }
  >();

  for (const task of allTasksForProfiles) {
    if (!task.userId) continue;
    const prev = taskMetricsByUser.get(task.userId) || {
      openTasks: 0,
      completedTasks30d: 0,
      overdueTasks: 0,
    };

    if (task.status !== "COMPLETED") {
      prev.openTasks += 1;
      if (task.dueDate && task.dueDate < startOfToday) {
        prev.overdueTasks += 1;
      }
    } else if (task.updatedAt >= since30d) {
      prev.completedTasks30d += 1;
    }

    taskMetricsByUser.set(task.userId, prev);
  }

  const employeeTwinByUserId = new Map(employeeTwin.map((t) => [t.userId, t]));

  const behaviors: TwinBehaviorTrace[] = employeeProfiles.map((profile) => {
    const user = profile.user;
    const userId = user?.id || "";
    const twin = employeeTwinByUserId.get(userId);
    const taskMetrics = taskMetricsByUser.get(userId) || {
      openTasks: 0,
      completedTasks30d: 0,
      overdueTasks: 0,
    };
    const attendanceDays7d = attendanceDaysByEmployee.get(profile.id)?.size || 0;

    const behaviorScore = clamp(
      40 +
        attendanceDays7d * 6 +
        Math.min(taskMetrics.completedTasks30d, 10) * 3 -
        taskMetrics.overdueTasks * 6 -
        Math.max(taskMetrics.openTasks - 5, 0) * 2,
      0,
      100,
    );

    let risk: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    if (taskMetrics.overdueTasks >= 3 || twin?.status === "OVERLOADED" || twin?.status === "OFFLINE_ALERT") {
      risk = "HIGH";
    } else if (taskMetrics.overdueTasks > 0 || attendanceDays7d <= 2 || taskMetrics.openTasks >= 4) {
      risk = "MEDIUM";
    }

    return {
      employeeId: profile.id,
      userId,
      name: user?.name || user?.email || "Unnamed Employee",
      currentStatus: twin?.status || "OFFLINE",
      attendanceDays7d,
      openTasks: taskMetrics.openTasks,
      completedTasks30d: taskMetrics.completedTasks30d,
      overdueTasks: taskMetrics.overdueTasks,
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
    topContributors: contributorRows,
  };

  // If there are no open support tickets in twin stream, still keep real operational number.
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
