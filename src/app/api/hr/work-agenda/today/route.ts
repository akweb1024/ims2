import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { decodeAgendaMetadata, getISTDayRange, isManagerialRole } from '@/lib/hr/work-agenda';
import { companyScopeWhere } from '@/lib/company-scope';

async function resolveEmployeeScope(user: any, employeeIdParam: string | null, scope: string) {
  if (employeeIdParam && employeeIdParam !== 'self') {
    const target = await prisma.employeeProfile.findFirst({
      where: { OR: [{ id: employeeIdParam }, { userId: employeeIdParam }] },
      select: { id: true, userId: true }
    });
    if (!target) throw new Error('Employee not found');
    if (!isManagerialRole(user.role) && target.userId !== user.id) throw new Error('Forbidden');
    if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
      const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
      if (!downline.includes(target.userId) && target.userId !== user.id) throw new Error('Forbidden');
    }
    return [target.id];
  }

  if (!isManagerialRole(user.role) || scope === 'self') {
    const selfProfile = await prisma.employeeProfile.findUnique({
      where: { userId: user.id },
      select: { id: true }
    });
    return selfProfile ? [selfProfile.id] : [];
  }

  if (scope === 'team' && ['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
    const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
    const team = await prisma.employeeProfile.findMany({
      where: { userId: { in: [user.id, ...downline] } },
      select: { id: true }
    });
    return team.map((t) => t.id);
  }

  const all = await prisma.employeeProfile.findMany({
    where: {
      user: {
        isActive: true,
        ...companyScopeWhere(user)
      }
    },
    select: { id: true }
  });
  return all.map((x) => x.id);
}

export const GET = authorizedRoute([], async (req: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(req.url);
    const employeeIdParam = searchParams.get('employeeId');
    const scope = String(searchParams.get('scope') || 'self').toLowerCase();
    const { start, end } = getISTDayRange();

    const employeeIds = await resolveEmployeeScope(user, employeeIdParam, scope);
    if (!employeeIds.length) {
      return NextResponse.json({ date: start, employees: [], summary: { totalTasks: 0, completed: 0, blocked: 0, plannedHours: 0, overloadEmployees: 0 } });
    }

    const plans = await prisma.workPlan.findMany({
      where: {
        employeeId: { in: employeeIds },
        date: { gte: start, lte: end },
        ...companyScopeWhere(user),
      },
      include: {
        employee: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        linkedGoal: { select: { id: true, title: true } }
      },
      orderBy: [{ employeeId: 'asc' }, { date: 'asc' }]
    });

    const latestKpiByEmployeeRows = await prisma.employeeKPI.groupBy({
      by: ['employeeId'],
      where: { employeeId: { in: employeeIds } },
      _max: { updatedAt: true }
    });
    const latestKpiByEmployee = new Map<string, Date>();
    for (const row of latestKpiByEmployeeRows) {
      if (row._max.updatedAt) latestKpiByEmployee.set(row.employeeId, row._max.updatedAt);
    }

    const byEmployee = new Map<string, any>();
    for (const p of plans) {
      if (!byEmployee.has(p.employeeId)) {
        byEmployee.set(p.employeeId, {
          employeeId: p.employeeId,
          name: p.employee.user.name || p.employee.user.email,
          email: p.employee.user.email,
          designation: p.employee.designation || 'N/A',
          tasks: [],
          guardRails: {
            plannedHours: 0,
            unresolvedBlockers: 0,
            overload: false,
          }
        });
      }

      const metadata = decodeAgendaMetadata(p.strategy);
      const isBlocked = p.completionStatus === 'BLOCKED' || Boolean(metadata?.blockerReason);
      const task = {
        id: p.id,
        agenda: p.agenda,
        date: p.date,
        priority: p.priority,
        completionStatus: p.completionStatus,
        estimatedHours: p.estimatedHours || 0,
        linkedGoalId: p.linkedGoalId,
        linkedGoalTitle: p.linkedGoal?.title || null,
        linkedKpiId: metadata?.linkedKpiId || null,
        sourceType: metadata?.sourceType || 'MANUAL',
        mandatory: Boolean(metadata?.mandatory),
        sequence: metadata?.sequence || 999,
        conflictFlag: Boolean(metadata?.conflictFlag),
        blockerReason: metadata?.blockerReason || null,
        blockerOwner: metadata?.blockerOwner || null,
      };

      const holder = byEmployee.get(p.employeeId);
      holder.tasks.push(task);
      holder.guardRails.plannedHours += Number(task.estimatedHours || 0);
      if (isBlocked && task.completionStatus !== 'COMPLETED') holder.guardRails.unresolvedBlockers += 1;
    }

    const employees = Array.from(byEmployee.values()).map((entry) => {
      const sortedTasks = entry.tasks.sort((a: any, b: any) => a.sequence - b.sequence || new Date(a.date).getTime() - new Date(b.date).getTime());
      const shiftHours = 8.5;
      entry.guardRails.overload = entry.guardRails.plannedHours > shiftHours;
      const completed = sortedTasks.filter((t: any) => t.completionStatus === 'COMPLETED').length;
      const blocked = sortedTasks.filter((t: any) => t.completionStatus === 'BLOCKED').length;
      const mandatoryPending = sortedTasks.filter((t: any) => t.mandatory && t.completionStatus !== 'COMPLETED').length;
      const generatedTimestamps = sortedTasks
        .map((t: any) => {
          const planMeta = plans.find((p) => p.id === t.id);
          const meta = decodeAgendaMetadata(planMeta?.strategy || null);
          return meta?.generatedAt ? new Date(meta.generatedAt) : null;
        })
        .filter((d: Date | null): d is Date => !!d && !Number.isNaN(d.getTime()));
      const latestAgendaGeneratedAt = generatedTimestamps.length
        ? new Date(Math.max(...generatedTimestamps.map((d: Date) => d.getTime())))
        : null;
      const latestKpiUpdatedAt = latestKpiByEmployee.get(entry.employeeId) || null;
      const syncStatus = !latestKpiUpdatedAt
        ? 'NO_KPI'
        : !latestAgendaGeneratedAt
          ? 'STALE'
          : latestKpiUpdatedAt.getTime() > latestAgendaGeneratedAt.getTime()
            ? 'STALE'
            : 'FRESH';
      return {
        ...entry,
        tasks: sortedTasks,
        sync: {
          status: syncStatus,
          latestKpiUpdatedAt,
          latestAgendaGeneratedAt,
        },
        progress: {
          total: sortedTasks.length,
          completed,
          blocked,
          mandatoryPending,
          completionRate: sortedTasks.length > 0 ? Number(((completed / sortedTasks.length) * 100).toFixed(2)) : 0,
        }
      };
    });

    const summary = {
      totalTasks: employees.reduce((sum, e) => sum + e.progress.total, 0),
      completed: employees.reduce((sum, e) => sum + e.progress.completed, 0),
      blocked: employees.reduce((sum, e) => sum + e.progress.blocked, 0),
      plannedHours: Number(employees.reduce((sum, e) => sum + e.guardRails.plannedHours, 0).toFixed(2)),
      overloadEmployees: employees.filter((e) => e.guardRails.overload).length,
    };

    return NextResponse.json({
      date: start,
      range: { start, end },
      scope,
      employees,
      summary,
    });
  } catch (error: any) {
    return createErrorResponse(error?.message || error);
  }
});
