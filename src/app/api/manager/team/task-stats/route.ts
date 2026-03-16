import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { getManagerTeamUserIds } from '@/lib/team-auth';
import { getISTDateRangeForPeriod, normalizePeriod } from '@/lib/date-utils';
import { createErrorResponse } from '@/lib/api-utils';

const matchesAssignment = (task: any, employeeProfileId: string, designationId?: string | null, departmentId?: string | null) => {
    if (Array.isArray(task.employeeIds) && task.employeeIds.includes(employeeProfileId)) return true;
    if (task.employeeId && task.employeeId === employeeProfileId) return true;

    const hasDesignation = !!task.designationId || (Array.isArray(task.designationIds) && task.designationIds.length > 0);
    const hasDepartment = !!task.departmentId || (Array.isArray(task.departmentIds) && task.departmentIds.length > 0);

    if (!task.employeeId && hasDesignation) {
        if (task.designationId && designationId && task.designationId === designationId) return true;
        if (Array.isArray(task.designationIds) && designationId && task.designationIds.includes(designationId)) return true;
        return false;
    }

    if (!task.employeeId && !hasDesignation && hasDepartment) {
        if (task.departmentId && departmentId && task.departmentId === departmentId) return true;
        if (Array.isArray(task.departmentIds) && departmentId && task.departmentIds.includes(departmentId)) return true;
        return false;
    }

    return !task.employeeId && (!Array.isArray(task.employeeIds) || task.employeeIds.length === 0) && !hasDesignation && !hasDepartment;
};

const computeValue = (task: any, quantity?: number | null) => {
    if (task.targetUnit === 'POINTS') {
        if (task.calculationType === 'SCALED') {
            const qty = quantity || 0;
            const effectiveQty = task.maxThreshold && qty > task.maxThreshold ? task.maxThreshold : qty;
            return Math.floor(effectiveQty * (task.pointsPerUnit || 0));
        }
        return task.points || 0;
    }

    // COUNT
    if (task.calculationType === 'SCALED') {
        return quantity || 0;
    }
    return 1;
};

export const GET = authorizedRoute(
    ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const period = normalizePeriod(searchParams.get('period'));
            const employeeIdParam = searchParams.get('employeeId');
            const { start, end } = getISTDateRangeForPeriod(period);

            let userIds: string[] = [];
            if (['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user.role)) {
                if (!user.companyId) return NextResponse.json({ error: 'Company required' }, { status: 400 });
                const users = await prisma.user.findMany({
                    where: { companyId: user.companyId, role: { notIn: ['CUSTOMER', 'AGENCY'] }, isActive: true },
                    select: { id: true }
                });
                userIds = users.map(u => u.id);
            } else {
                userIds = await getManagerTeamUserIds(user.id, user.companyId || undefined);
            }

            if (employeeIdParam) {
                userIds = userIds.filter(id => id === employeeIdParam);
            }

            const employees = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    companyId: true,
                    departmentId: true,
                    department: { select: { name: true } },
                    employeeProfile: { select: { id: true, designationId: true } }
                }
            });

            const employeeProfiles = employees
                .map(e => e.employeeProfile?.id)
                .filter((id): id is string => !!id);

            const companyIds = Array.from(new Set(employees.map(e => e.companyId).filter((id): id is string => !!id)));

            const tasks = await prisma.employeeTaskTemplate.findMany({
                where: {
                    ...(companyIds.length > 0 ? { companyId: { in: companyIds } } : {}),
                    isActive: true,
                    ...(period !== 'YEARLY' ? { frequency: period } : {}),
                    OR: [
                        { startDate: null },
                        { startDate: { lte: end } }
                    ],
                    AND: [
                        {
                            OR: [
                                { endDate: null },
                                { endDate: { gte: start } }
                            ]
                        }
                    ]
                },
                orderBy: { title: 'asc' }
            });

            const completions = await prisma.dailyTaskCompletion.findMany({
                where: {
                    employeeId: { in: employeeProfiles },
                    completedAt: { gte: start, lte: end }
                },
                include: { task: true }
            });

            const attendance = await prisma.attendance.findMany({
                where: {
                    employeeId: { in: employeeProfiles },
                    date: { gte: start, lte: end }
                }
            });

            const attendanceByEmployee = new Map<string, { present: number; total: number }>();
            for (const a of attendance) {
                const key = a.employeeId;
                const entry = attendanceByEmployee.get(key) || { present: 0, total: 0 };
                entry.total += 1;
                if (a.status === 'PRESENT' || a.checkIn) entry.present += 1;
                attendanceByEmployee.set(key, entry);
            }

            const completionMap = new Map<string, Map<string, number>>();
            for (const c of completions) {
                const empMap = completionMap.get(c.employeeId) || new Map<string, number>();
                const current = empMap.get(c.taskId) || 0;
                empMap.set(c.taskId, current + computeValue(c.task, c.quantity));
                completionMap.set(c.employeeId, empMap);
            }

            const employeeStats = employees.map(emp => {
                const profileId = emp.employeeProfile?.id;
                const designationId = emp.employeeProfile?.designationId;
                const departmentId = emp.departmentId;

                const applicableTasks = profileId
                    ? tasks.filter(t => matchesAssignment(t, profileId, designationId, departmentId))
                    : [];

                const perTask = applicableTasks.map(t => {
                    const achieved = profileId ? (completionMap.get(profileId)?.get(t.id) || 0) : 0;
                    const target = t.targetValue ?? 1;
                    const rate = target > 0 ? achieved / target : 0;
                    return {
                        taskId: t.id,
                        title: t.title,
                        frequency: t.frequency,
                        targetValue: target,
                        targetUnit: t.targetUnit,
                        achieved,
                        achievementRate: rate
                    };
                });

                const totals = perTask.reduce(
                    (acc, t) => {
                        acc.target += t.targetValue || 0;
                        acc.achieved += t.achieved || 0;
                        return acc;
                    },
                    { target: 0, achieved: 0 }
                );

                const attendanceStats = profileId ? (attendanceByEmployee.get(profileId) || { present: 0, total: 0 }) : { present: 0, total: 0 };
                const attendanceRate = attendanceStats.total > 0 ? (attendanceStats.present / attendanceStats.total) * 100 : 0;

                const strongPoints = perTask.filter(t => t.achievementRate >= 1).sort((a, b) => b.achievementRate - a.achievementRate).slice(0, 3);
                const weakPoints = perTask.filter(t => t.achievementRate < 1).sort((a, b) => a.achievementRate - b.achievementRate).slice(0, 3);

                return {
                    userId: emp.id,
                    name: emp.name || emp.email,
                    department: emp.department?.name || 'Unassigned',
                    tasks: perTask,
                    totals: {
                        target: totals.target,
                        achieved: totals.achieved,
                        achievementRate: totals.target > 0 ? (totals.achieved / totals.target) * 100 : 0
                    },
                    attendance: {
                        present: attendanceStats.present,
                        total: attendanceStats.total,
                        rate: attendanceRate
                    },
                    strongPoints,
                    weakPoints
                };
            });

            const teamTotals = employeeStats.reduce(
                (acc, e) => {
                    acc.target += e.totals.target;
                    acc.achieved += e.totals.achieved;
                    acc.attendancePresent += e.attendance.present;
                    acc.attendanceTotal += e.attendance.total;
                    return acc;
                },
                { target: 0, achieved: 0, attendancePresent: 0, attendanceTotal: 0 }
            );

            return NextResponse.json({
                period,
                range: { start, end },
                team: {
                    target: teamTotals.target,
                    achieved: teamTotals.achieved,
                    achievementRate: teamTotals.target > 0 ? (teamTotals.achieved / teamTotals.target) * 100 : 0,
                    attendanceRate: teamTotals.attendanceTotal > 0 ? (teamTotals.attendancePresent / teamTotals.attendanceTotal) * 100 : 0
                },
                employees: employeeStats
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
