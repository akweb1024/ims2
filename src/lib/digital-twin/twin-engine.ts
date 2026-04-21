import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Valid states for Digital Twin nodes
 */
export type TwinStatus = 'ACTIVE' | 'OFFLINE' | 'OVERLOADED' | 'OFFLINE_ALERT' | 'CRITICAL' | 'WARNING' | 'HEALTHY' | 'ON_LEAVE';

export interface EmployeeTwin {
  id: string;
  userId: string;
  name: string;
  status: TwinStatus;
  taskCount: number;
  lastActive: Date;
  bandwidth: number;
  linkedInventoryIds: string[];
  weeklyAttendance: string[]; // ISO date strings for days attended in the past 7 days
  isOnLeave?: boolean;
  engagementScore?: number;
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
}

/** Computes the top-level summary from aggregated twin data */
export function computeTwinSummary(employees: EmployeeTwin[], inventory: InventoryTwin[]): TwinSummary {
  return {
    activeEmployees: employees.filter(e => e.status === 'ACTIVE').length,
    offlineAlerts: employees.filter(e => e.status === 'OFFLINE_ALERT').length,
    overloadedStaff: employees.filter(e => e.status === 'OVERLOADED').length,
    criticalItems: inventory.filter(i => i.status === 'CRITICAL').length,
    warningItems: inventory.filter(i => i.status === 'WARNING').length,
    activeThreads: employees.reduce((acc, e) => acc + e.linkedInventoryIds.length, 0),
  };
}

/**
 * Aggregates real-time status for all employees associated with a company.
 * Uses high-performance selective fetching to minimize database overhead.
 */
export async function getEmployeeTwinStatus(companyId: string): Promise<EmployeeTwin[]> {
  const startTime = Date.now();
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const employees = await prisma.employeeProfile.findMany({
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
            startDate: { lte: new Date() },
            endDate: { gte: startOfToday }
          },
          select: { id: true }
        },
        workReports: {
          where: { date: { gte: sevenDaysAgo } },
          select: { id: true }
        },
        attendance: {
          // Fetch last 7 days — today's presence is derived in the map below
          where: { date: { gte: sevenDaysAgo } },
          select: { date: true },
          orderBy: { date: 'desc' }
        },
        user: {
          select: {
            id: true,
            name: true,
            thinkTankIdeas: {
              where: { createdAt: { gte: thirtyDaysAgo } },
              select: { id: true }
            },
            thinkTankVotes: {
              where: { createdAt: { gte: thirtyDaysAgo } },
              select: { id: true }
            },
            tasks: {
              where: { status: { not: 'COMPLETED' } },
              select: { inventoryItemId: true }
            }
          }
        }
      }
    });

    const getLocalDateStr = (d: Date) => 
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
    const todayStr = getLocalDateStr(new Date());

    const result = employees.map(emp => {
      const weekAttendanceDates = emp.attendance.map(
        (a: { date: Date }) => getLocalDateStr(new Date(a.date))
      );
      
      // An employee is actively clocked in if they have any attendance record today (local time)
      // This replicates the old prism query filter: gte: new Date(new Date().setHours(0,0,0,0))
      const isClockedIn = emp.attendance.some(
        (a: { date: Date }) => new Date(a.date).getTime() >= startOfToday.getTime()
      );
      
      const isOnLeave = emp.leaveRequests && emp.leaveRequests.length > 0;
      
      // Calculate Engagement Score
      const reportsWeight = (emp.workReports?.length || 0) * 10; // 10 pts per report this week
      const ideasWeight = (emp.user?.thinkTankIdeas?.length || 0) * 5; // 5 pts per idea last 30d
      const votesWeight = (emp.user?.thinkTankVotes?.length || 0) * 2; // 2 pts per vote last 30d
      const rawScore = reportsWeight + ideasWeight + votesWeight;
      const engagementScore = Math.min(100, Math.max(0, rawScore));

      const tasks = emp.user?.tasks || [];
      const taskCount = tasks.length;
      const linkedInventoryIds = Array.from(new Set(
        tasks.map(t => t.inventoryItemId).filter(id => !!id) as string[]
      ));
      
      let status: TwinStatus = isClockedIn ? 'ACTIVE' : 'OFFLINE';
      if (isOnLeave) status = 'ON_LEAVE';
      else if (isClockedIn && taskCount > 5) status = 'OVERLOADED';
      else if (!isClockedIn && taskCount > 0) status = 'OFFLINE_ALERT';

      return {
        id: emp.id,
        userId: emp.user?.id || '',
        name: emp.user?.name || emp.officialEmail || emp.employeeId || 'Unnamed Employee',
        status,
        taskCount,
        lastActive: emp.updatedAt,
        bandwidth: Math.max(0, 100 - (taskCount * 15)),
        linkedInventoryIds,
        weeklyAttendance: weekAttendanceDates,
        isOnLeave,
        engagementScore
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
