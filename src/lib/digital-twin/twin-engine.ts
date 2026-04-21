import { prisma } from "@/lib/prisma";

export type TwinStatus = 'ACTIVE' | 'OFFLINE' | 'OVERLOADED' | 'OFFLINE_ALERT' | 'CRITICAL' | 'WARNING' | 'HEALTHY';

export interface EmployeeTwin {
  id: string;
  name: string;
  status: TwinStatus;
  taskCount: number;
  lastActive: Date;
  bandwidth: number;
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

export async function getEmployeeTwinStatus(companyId: string): Promise<EmployeeTwin[]> {
  const employees = await prisma.employeeProfile.findMany({
    where: { 
        user: { 
            companyId: companyId
        } 
    },
    include: {
      attendance: {
        where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        take: 1,
        orderBy: { date: 'desc' }
      },
      user: {
        include: {
          tasks: {
            where: { status: { not: 'COMPLETED' } }
          }
        }
      }
    }
  });

  return employees.map(emp => {
    const isClockedIn = emp.attendance.length > 0;
    const taskCount = emp.user?.tasks?.length || 0;
    
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
    };
  });
}

export async function getInventoryTwinStatus(companyId: string): Promise<InventoryTwin[]> {
  const items = await prisma.inventoryItem.findMany({
    where: { companyId },
    include: {
      warehouse: true,
      stockMovements: {
        take: 10,
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  return items.map(item => {
    const stockStatus: TwinStatus = item.quantity <= item.minStockLevel ? 'CRITICAL' : 
                        item.quantity <= item.minStockLevel * 1.5 ? 'WARNING' : 'HEALTHY';
    
    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      minLevel: item.minStockLevel,
      status: stockStatus,
      warehouse: item.warehouse?.name || 'In Transit / General',
      velocity: item.stockMovements.length
    };
  });
}
