export type TraceSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

export interface TwinActivityEvent {
  id: string;
  type:
    | "TASK_CREATED"
    | "TASK_COMPLETED"
    | "DISPATCH_UPDATED"
    | "STOCK_MOVEMENT"
    | "AUDIT_EVENT"
    | "PERFORMANCE_SIGNAL"
    | "ATTENDANCE_SIGNAL"
    | "WORK_REPORT_SIGNAL"
    | "KPI_SIGNAL"
    | "PROJECT_SIGNAL"
    | "THINK_TANK_SIGNAL";
  title: string;
  description: string;
  severity: TraceSeverity;
  at: string;
  entityType: string;
  entityId: string;
  actorName?: string;
}

export interface TwinBehaviorTrace {
  employeeId: string;
  userId: string;
  name: string;
  currentStatus: string;
  attendanceDays7d: number;
  workReports7d: number;
  openTasks: number;
  completedTasks30d: number;
  overdueTasks: number;
  avgKraMatch30d: number;
  avgKpiProgress: number;
  activeProjects: number;
  thinkTankContributions30d: number;
  disciplineScore: number;
  activeDeals: number;
  activeTickets: number;
  activeReviews: number;
  behaviorScore: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
}

export interface TwinPerformanceTrace {
  healthScore: number;
  activeEmployees: number;
  overloadedEmployees: number;
  offlineAlerts: number;
  criticalInventory: number;
  warningInventory: number;
  tasksCompleted7d: number;
  dispatchDelivered7d: number;
  stockMovements7d: number;
  openDeals: number;
  avgKpiProgress: number;
  avgKraMatch30d: number;
  thinkTankContributors: number;
  topContributors: Array<{
    employeeId: string;
    name: string;
    tasksCompleted30d: number;
    revenueGenerated30d: number;
    avgRating30d: number;
  }>;
}

export interface TwinTracePayload {
  generatedAt: string;
  rangeDays: number;
  activities: TwinActivityEvent[];
  behaviors: TwinBehaviorTrace[];
  performance: TwinPerformanceTrace;
}
