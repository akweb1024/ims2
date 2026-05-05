import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getDigitalTwinScoringConfig, type DepartmentScoringWeights } from "@/lib/digital-twin/scoring-config";

/**
 * Valid states for Digital Twin nodes
 */
export type TwinStatus = 'ACTIVE' | 'OFFLINE' | 'OVERLOADED' | 'OFFLINE_ALERT' | 'CRITICAL' | 'WARNING' | 'HEALTHY' | 'ON_LEAVE';

export interface EmployeeTwin {
  id: string;
  userId: string;
  departmentId?: string | null;
  name: string;
  status: TwinStatus;
  taskCount: number;
  overdueTasks: number;
  completedTasks30d: number;
  lastActive: Date;
  bandwidth: number;
  linkedInventoryIds: string[];
  weeklyAttendance: string[]; // ISO date strings for days attended in the past 7 days
  attendanceDays7d: number;
  workReports7d: number;
  workReports30d: number;
  avgManagerRating30d: number;
  avgKraMatch30d: number;
  avgKpiProgress: number;
  activeProjectsCount: number;
  thinkTankIdeas30d: number;
  thinkTankVotes30d: number;
  thinkTankQuestions30d: number;
  thinkTankComments30d: number;
  disciplineScore: number;
  scoringWeights: DepartmentScoringWeights;
  riskThresholdHigh: number;
  riskThresholdMedium: number;
  isOnLeave?: boolean;
  engagementScore?: number;
  activeDealsCount?: number;
  activeTicketsCount?: number;
  activeReviewsCount?: number;
}

export interface InventoryTwin {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  minLevel: number;
  status: TwinStatus;
  warehouse: string;
  velocity: number;
}

export interface TwinSummary {
  activeEmployees: number;
  offlineAlerts: number;
  overloadedStaff: number;
  criticalItems: number;
  warningItems: number;
  activeThreads: number;
  avgEngagementScore: number;
  avgKpiProgress: number;
  highRiskEmployees: number;
  activeProjectContributors: number;
  thinkTankContributors: number;
}

/** Computes the top-level summary from aggregated twin data */
export function computeTwinSummary(employees: EmployeeTwin[], inventory: InventoryTwin[]): TwinSummary {
  const avgEngagementScore = employees.length > 0
    ? Math.round(
      employees.reduce((acc, e) => acc + (e.engagementScore || 0), 0) / employees.length,
    )
    : 0;

  const avgKpiProgress = employees.length > 0
    ? Number(
      (
        employees.reduce((acc, e) => acc + (e.avgKpiProgress || 0), 0) / employees.length
      ).toFixed(1),
    )
    : 0;

  const highRiskEmployees = employees.filter((e) =>
    e.status === 'OVERLOADED' ||
    e.status === 'OFFLINE_ALERT' ||
    e.overdueTasks >= 3 ||
    e.avgKpiProgress < 40 ||
    e.avgKraMatch30d < 0.35,
  ).length;

  return {
    activeEmployees: employees.filter(e => e.status === 'ACTIVE').length,
    offlineAlerts: employees.filter(e => e.status === 'OFFLINE_ALERT').length,
    overloadedStaff: employees.filter(e => e.status === 'OVERLOADED').length,
    criticalItems: inventory.filter(i => i.status === 'CRITICAL').length,
    warningItems: inventory.filter(i => i.status === 'WARNING').length,
    activeThreads: employees.reduce((acc, e) => acc + e.linkedInventoryIds.length, 0),
    avgEngagementScore,
    avgKpiProgress,
    highRiskEmployees,
    activeProjectContributors: employees.filter((e) => e.activeProjectsCount > 0).length,
    thinkTankContributors: employees.filter((e) =>
      e.thinkTankIdeas30d > 0 ||
      e.thinkTankVotes30d > 0 ||
      e.thinkTankQuestions30d > 0 ||
      e.thinkTankComments30d > 0,
    ).length,
  };
}

/**
 * Aggregates real-time status for all employees associated with a company.
 * Uses high-performance selective fetching to minimize database overhead.
 */
export async function getEmployeeTwinStatus(companyId: string): Promise<EmployeeTwin[]> {
  const startTime = Date.now();
  try {
    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [scoringConfig, employees] = await Promise.all([
      getDigitalTwinScoringConfig(companyId),
      prisma.employeeProfile.findMany({
      where: { 
          user: { 
              companyId: companyId
          } 
      },
      select: {
        id: true,
        updatedAt: true,
        officialEmail: true,
        employeeId: true,
        leaveRequests: {
          where: {
            status: 'APPROVED',
            startDate: { lte: now },
            endDate: { gte: startOfToday }
          },
          select: { id: true }
        },
        workReports: {
          where: { date: { gte: thirtyDaysAgo } },
          select: {
            id: true,
            date: true,
            managerRating: true,
            kraMatchRatio: true,
            tasksCompleted: true,
          }
        },
        attendance: {
          where: { date: { gte: sevenDaysAgo } },
          select: {
            date: true,
            status: true,
            checkOut: true,
            isLate: true,
            lateMinutes: true,
          },
          orderBy: { date: 'desc' }
        },
        kpis: {
          where: {
            companyId,
            updatedAt: { gte: thirtyDaysAgo },
          },
          select: {
            target: true,
            current: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            departmentId: true,
            tasks: {
              select: {
                inventoryItemId: true,
                projectId: true,
                status: true,
                dueDate: true,
                updatedAt: true,
              }
            },
            deals: {
              where: { stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } },
              select: { id: true }
            },
            assignedTickets: {
              where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
              select: { id: true }
            },
            paperReviews: {
              where: { decision: 'PENDING' },
              select: { id: true }
            },
            manuscriptDrafts: {
              where: { isSubmitted: false },
              select: { id: true }
            },
            projectMemberships: {
              where: {
                project: {
                  companyId,
                  status: { notIn: ['COMPLETED', 'CANCELLED', 'ARCHIVED'] },
                },
              },
              select: { projectId: true },
            },
            businessProjects: {
              where: {
                companyId,
                status: { notIn: ['COMPLETED', 'CANCELLED', 'ARCHIVED'] },
              },
              select: { id: true },
            },
            businessLedProjects: {
              where: {
                companyId,
                status: { notIn: ['COMPLETED', 'CANCELLED', 'ARCHIVED'] },
              },
              select: { id: true },
            },
            thinkTankVisibleIdeas: {
              where: {
                companyId,
                createdAt: { gte: thirtyDaysAgo },
              },
              select: { id: true },
            },
            thinkTankReviewerScores: {
              where: {
                createdAt: { gte: thirtyDaysAgo },
                idea: { companyId },
              },
              select: { id: true },
            },
            thinkTankAskedQuestions: {
              where: {
                createdAt: { gte: thirtyDaysAgo },
                idea: { companyId },
              },
              select: { id: true },
            },
            thinkTankComments: {
              where: {
                createdAt: { gte: thirtyDaysAgo },
                idea: { companyId },
              },
              select: { id: true },
            },
          }
        }
      }
    }),
    ]);

    const getLocalDateStr = (d: Date) => 
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
    const todayStr = getLocalDateStr(now);
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    const result = employees.map(emp => {
      const weekAttendanceDates = emp.attendance
        .filter((a) => a.status !== 'ABSENT')
        .map((a) => getLocalDateStr(new Date(a.date)));

      const attendanceDays7d = new Set(weekAttendanceDates).size;

      const todayAttendance = emp.attendance.find(
        (a) => getLocalDateStr(new Date(a.date)) === todayStr,
      );

      const isClockedIn = !!todayAttendance && todayAttendance.status !== 'ABSENT' && !todayAttendance.checkOut;
      const isOnLeave = emp.leaveRequests && emp.leaveRequests.length > 0;

      const tasks = emp.user?.tasks || [];
      const deptConfig = emp.user?.departmentId
        ? scoringConfig.byDepartment.get(emp.user.departmentId) || scoringConfig.defaultConfig
        : scoringConfig.defaultConfig;
      const weights = deptConfig.weights;
      const openTasks = tasks.filter((t) => t.status !== 'COMPLETED');
      const taskCount = openTasks.length;
      const overdueTasks = openTasks.filter((t) => t.dueDate && t.dueDate < startOfToday).length;
      const completedTasks30d = tasks.filter((t) => t.status === 'COMPLETED' && t.updatedAt >= thirtyDaysAgo).length;

      const reports30d = emp.workReports || [];
      const workReports30d = reports30d.length;
      const workReports7d = reports30d.filter((r) => r.date >= sevenDaysAgo).length;

      const ratedReports = reports30d.filter((r) => typeof r.managerRating === 'number');
      const avgManagerRating30d = ratedReports.length > 0
        ? Number(
          (
            ratedReports.reduce((sum, report) => sum + (report.managerRating || 0), 0) /
            ratedReports.length
          ).toFixed(2),
        )
        : 0;

      const avgKraMatch30d = reports30d.length > 0
        ? Number(
          (
            reports30d.reduce((sum, report) => sum + (report.kraMatchRatio || 0), 0) /
            reports30d.length
          ).toFixed(3),
        )
        : 0;

      const kpiProgressValues = (emp.kpis || [])
        .filter((kpi) => kpi.target > 0)
        .map((kpi) => (kpi.current / kpi.target) * 100);
      const avgKpiProgress = kpiProgressValues.length > 0
        ? Number(
          (
            kpiProgressValues.reduce((sum, value) => sum + value, 0) /
            kpiProgressValues.length
          ).toFixed(2),
        )
        : 0;

      const lateRecords = emp.attendance.filter((a) => a.isLate || (a.lateMinutes || 0) > 0);
      const lateMinutes = lateRecords.reduce((sum, row) => sum + (row.lateMinutes || 0), 0);

      const disciplineRaw = clamp(
        100
        - overdueTasks * 18
        - lateRecords.length * 4
        - Math.floor(lateMinutes / 30) * 2
        + Math.min(completedTasks30d, 20) * 1.5
        + attendanceDays7d * 1.5,
        0,
        100,
      );
      const disciplineScore = clamp(disciplineRaw * (0.65 + weights.discipline * 0.35), 0, 100);

      const attendanceScore = clamp((attendanceDays7d / 7) * 100, 0, 100);
      const reportScore = clamp((Math.min(workReports7d, 5) / 5) * 100, 0, 100);
      const kpiScore = clamp(avgKpiProgress, 0, 100);
      const kraScore = clamp(avgKraMatch30d * 100, 0, 100);

      const activeDealsCount = emp.user?.deals?.length || 0;
      const activeTicketsCount = emp.user?.assignedTickets?.length || 0;
      const activeReviewsCount = (emp.user?.paperReviews?.length || 0) + (emp.user?.manuscriptDrafts?.length || 0);

      const linkedInventoryIds = Array.from(new Set(
        openTasks.map(t => t.inventoryItemId).filter(id => !!id) as string[]
      ));

      const projectIds = new Set<string>();
      for (const task of openTasks) {
        if (task.projectId) projectIds.add(task.projectId);
      }
      for (const member of emp.user?.projectMemberships || []) {
        if (member.projectId) projectIds.add(member.projectId);
      }
      for (const project of emp.user?.businessProjects || []) {
        if (project.id) projectIds.add(project.id);
      }
      for (const project of emp.user?.businessLedProjects || []) {
        if (project.id) projectIds.add(project.id);
      }
      const activeProjectsCount = projectIds.size;

      const thinkTankIdeas30d = emp.user?.thinkTankVisibleIdeas?.length || 0;
      const thinkTankVotes30d = emp.user?.thinkTankReviewerScores?.length || 0;
      const thinkTankQuestions30d = emp.user?.thinkTankAskedQuestions?.length || 0;
      const thinkTankComments30d = emp.user?.thinkTankComments?.length || 0;

      const projectLoadPenalty = clamp(Math.max(0, (activeProjectsCount - 3) * 8), 0, 40);
      const thinkTankScore = clamp(
        (thinkTankIdeas30d * 20) + (thinkTankVotes30d * 10) + (thinkTankQuestions30d * 8) + (thinkTankComments30d * 6),
        0,
        100,
      );

      const weightTotal =
        weights.attendance +
        weights.workReport +
        weights.kpi +
        weights.kra +
        weights.discipline +
        weights.thinkTank;

      const weightedEngagement =
        (attendanceScore * weights.attendance) +
        (reportScore * weights.workReport) +
        (kpiScore * weights.kpi) +
        (kraScore * weights.kra) +
        (disciplineScore * weights.discipline) +
        (thinkTankScore * weights.thinkTank);

      const engagementScore = Math.round(clamp(weightedEngagement / Math.max(0.1, weightTotal), 0, 100));
      
      let status: TwinStatus = isClockedIn ? 'ACTIVE' : 'OFFLINE';
      if (isOnLeave) status = 'ON_LEAVE';
      else if (
        isClockedIn &&
        (
          taskCount >= Math.max(5, Math.round(7 - weights.projectLoad)) ||
          overdueTasks >= Math.max(2, Math.round(4 - weights.discipline)) ||
          disciplineScore < (50 - weights.discipline * 4) ||
          avgKpiProgress < (45 - weights.kpi * 3)
        )
      ) {
        status = 'OVERLOADED';
      }
      else if (!isClockedIn && taskCount > 0) status = 'OFFLINE_ALERT';

      return {
        id: emp.id,
        userId: emp.user?.id || '',
        departmentId: emp.user?.departmentId || null,
        name: emp.user?.name || emp.officialEmail || emp.employeeId || 'Unnamed Employee',
        status,
        taskCount,
        overdueTasks,
        completedTasks30d,
        lastActive: emp.updatedAt,
        bandwidth: clamp(
          100
          - (taskCount * (8 + weights.projectLoad * 1.5))
          - (overdueTasks * (8 + weights.discipline * 2))
          - projectLoadPenalty
          + Math.round(disciplineScore * 0.18),
          0,
          100,
        ),
        linkedInventoryIds,
        weeklyAttendance: weekAttendanceDates,
        attendanceDays7d,
        workReports7d,
        workReports30d,
        avgManagerRating30d,
        avgKraMatch30d,
        avgKpiProgress,
        activeProjectsCount,
        thinkTankIdeas30d,
        thinkTankVotes30d,
        thinkTankQuestions30d,
        thinkTankComments30d,
        disciplineScore,
        scoringWeights: weights,
        riskThresholdHigh: deptConfig.riskThresholdHigh,
        riskThresholdMedium: deptConfig.riskThresholdMedium,
        isOnLeave,
        engagementScore,
        activeDealsCount,
        activeTicketsCount,
        activeReviewsCount,
      };
    });

    logger.debug('Employee twin aggregation complete', { 
        count: result.length, 
        duration: Date.now() - startTime 
    });

    return result;
  } catch (error) {
    logger.error('Failed to aggregate employee twin status', error, { companyId });
    throw error;
  }
}

/**
 * Aggregates real-time status for all inventory items in a company.
 * Optimized for real-time dashboard polling.
 */
export async function getInventoryTwinStatus(companyId: string): Promise<InventoryTwin[]> {
  const startTime = Date.now();
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { companyId },
      select: {
        id: true,
        sku: true,
        name: true,
        quantity: true,
        minStockLevel: true,
        warehouse: {
          select: { name: true }
        },
        stockMovements: {
          select: { id: true },
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    const result = items.map(item => {
      const minLevel = item.minStockLevel || 0;
      const stockStatus: TwinStatus = item.quantity <= minLevel ? 'CRITICAL' : 
                          item.quantity <= minLevel * 1.5 ? 'WARNING' : 'HEALTHY';
      
      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        minLevel: minLevel,
        status: stockStatus,
        warehouse: item.warehouse?.name || 'In Transit / General',
        velocity: item.stockMovements.length
      };
    });

    logger.debug('Inventory twin aggregation complete', { 
        count: result.length, 
        duration: Date.now() - startTime 
    });

    return result;
  } catch (error) {
    logger.error('Failed to aggregate inventory twin status', error, { companyId });
    throw error;
  }
}
