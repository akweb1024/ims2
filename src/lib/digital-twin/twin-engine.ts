import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Valid states for Digital Twin nodes
 */
export type TwinStatus = 'ACTIVE' | 'OFFLINE' | 'OVERLOADED' | 'OFFLINE_ALERT' | 'CRITICAL' | 'WARNING' | 'HEALTHY';

export interface EmployeeTwin {
  id: string;
  name: string;
  status: TwinStatus;
  taskCount: number;
  lastActive: Date;
  bandwidth: number;
  linkedInventoryIds: string[];
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

/**
 * Aggregates real-time status for all employees associated with a company.
 * Uses high-performance selective fetching to minimize database overhead.
 */
export async function getEmployeeTwinStatus(companyId: string): Promise<EmployeeTwin[]> {
  const startTime = Date.now();
  try {
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
        attendance: {
          where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
          select: { id: true, date: true },
          take: 1,
          orderBy: { date: 'desc' }
        },
        user: {
          select: {
            name: true,
            tasks: {
              where: { status: { not: 'COMPLETED' } },
              select: { inventoryItemId: true }
            }
          }
        }
      }
    });

    const result = employees.map(emp => {
      const isClockedIn = emp.attendance.length > 0;
      const tasks = emp.user?.tasks || [];
      const taskCount = tasks.length;
      const linkedInventoryIds = Array.from(new Set(
        tasks.map(t => t.inventoryItemId).filter(id => !!id) as string[]
      ));
      
      let status: TwinStatus = isClockedIn ? 'ACTIVE' : 'OFFLINE';
      if (isClockedIn && taskCount > 5) status = 'OVERLOADED';
      if (!isClockedIn && taskCount > 0) status = 'OFFLINE_ALERT';

      return {
        id: emp.id,
        name: emp.user?.name || emp.officialEmail || emp.employeeId || 'Unnamed Employee',
        status,
        taskCount,
        lastActive: emp.updatedAt,
        bandwidth: Math.max(0, 100 - (taskCount * 15)),
        linkedInventoryIds
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
