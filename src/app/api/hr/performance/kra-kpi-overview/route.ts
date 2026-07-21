import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { companyScopeWhere } from '@/lib/company-scope';

type PeriodKey = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

const MANAGERIAL_ROLES = new Set([
    'SUPER_ADMIN',
    'ADMIN',
    'HR',
    'HR_MANAGER',
    'MANAGER',
    'TEAM_LEADER',
]);

const PERIOD_TO_KPI = {
    daily: 'DAILY',
    weekly: 'WEEKLY',
    monthly: 'MONTHLY',
    quarterly: 'QUARTERLY',
    yearly: 'YEARLY',
} as const;

function parsePeriod(value: string | null): PeriodKey {
    const v = (value || 'monthly').toLowerCase();
    if (v === 'daily' || v === 'weekly' || v === 'monthly' || v === 'quarterly' || v === 'yearly') {
        return v;
    }
    return 'monthly';
}

function getPeriodRange(period: PeriodKey, now = new Date()) {
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDay();
    const start = new Date(now);
    const end = new Date(now);

    if (period === 'daily') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    if (period === 'weekly') {
        const diffToMonday = (day + 6) % 7;
        start.setDate(now.getDate() - diffToMonday);
        start.setHours(0, 0, 0, 0);
        end.setTime(start.getTime());
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    if (period === 'monthly') {
        const mStart = new Date(year, month, 1, 0, 0, 0, 0);
        const mEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return { start: mStart, end: mEnd };
    }

    if (period === 'quarterly') {
        const quarterStartMonth = Math.floor(month / 3) * 3;
        const qStart = new Date(year, quarterStartMonth, 1, 0, 0, 0, 0);
        const qEnd = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59, 999);
        return { start: qStart, end: qEnd };
    }

    const yStart = new Date(year, 0, 1, 0, 0, 0, 0);
    const yEnd = new Date(year, 11, 31, 23, 59, 59, 999);
    return { start: yStart, end: yEnd };
}

function countWorkingDays(start: Date, end: Date): number {
    let count = 0;
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const limit = new Date(end);
    limit.setHours(0, 0, 0, 0);

    while (cursor <= limit) {
        const d = cursor.getDay();
        if (d !== 0 && d !== 6) count += 1;
        cursor.setDate(cursor.getDate() + 1);
    }
    return count;
}

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const period = parsePeriod(searchParams.get('period'));
            const scope = (searchParams.get('scope') || 'self').toLowerCase();
            const employeeIdParam = searchParams.get('employeeId');
            const { start, end } = getPeriodRange(period, new Date());
            const expectedWorkingDays = countWorkingDays(start, end);

            const canSeeTeam = MANAGERIAL_ROLES.has(user.role);
            const wantsTeamScope = scope === 'team';
            if (wantsTeamScope && !canSeeTeam) {
                return createErrorResponse('Forbidden: Team scope requires manager-level access', 403);
            }

            let targetUserIds: string[] = [];

            if (employeeIdParam && employeeIdParam !== 'self') {
                const targetProfile = await prisma.employeeProfile.findFirst({
                    where: {
                        OR: [
                            { id: employeeIdParam },
                            { userId: employeeIdParam },
                        ],
                    },
                    select: { id: true, userId: true },
                });

                if (!targetProfile) {
                    return createErrorResponse('Employee not found', 404);
                }

                if (canSeeTeam) {
                    if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                        const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
                        if (!downline.includes(targetProfile.userId) && targetProfile.userId !== user.id) {
                            return createErrorResponse('Forbidden: Employee is outside your hierarchy', 403);
                        }
                    } else if (user.companyId) {
                        const targetUser = await prisma.user.findUnique({
                            where: { id: targetProfile.userId },
                            select: { companyId: true },
                        });
                        if (targetUser?.companyId !== user.companyId && user.role !== 'SUPER_ADMIN') {
                            return createErrorResponse('Forbidden: Cross-company access denied', 403);
                        }
                    }
                    targetUserIds = [targetProfile.userId];
                } else {
                    if (targetProfile.userId !== user.id) {
                        return createErrorResponse('Forbidden: You can only access your own metrics', 403);
                    }
                    targetUserIds = [user.id];
                }
            } else if (wantsTeamScope && canSeeTeam) {
                if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                    const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
                    targetUserIds = Array.from(new Set(downline.filter((id) => id !== user.id)));
                } else {
                    const userWhere: Prisma.UserWhereInput = {
                        isActive: true,
                        ...companyScopeWhere(user),
                    };
                    const users = await prisma.user.findMany({
                        where: userWhere,
                        select: { id: true },
                    });
                    targetUserIds = users.map((u) => u.id);
                }
            } else {
                targetUserIds = [user.id];
            }

            if (targetUserIds.length === 0) {
                return NextResponse.json({
                    period,
                    range: { start, end, expectedWorkingDays },
                    summary: {
                        employeeCount: 0,
                        reportsSubmitted: 0,
                        reportsExpected: 0,
                        submissionRate: 0,
                        avgKraMatch: 0,
                        avgManagerRating: 0,
                        avgSelfRating: 0,
                        totalTasksCompleted: 0,
                        totalHoursSpent: 0,
                        totalRevenueGenerated: 0,
                    },
                    employees: [],
                });
            }

            const profiles = await prisma.employeeProfile.findMany({
                where: { userId: { in: targetUserIds } },
                select: {
                    id: true,
                    userId: true,
                    designation: true,
                    user: { select: { name: true, email: true } },
                },
            });

            if (profiles.length === 0) {
                return NextResponse.json({
                    period,
                    range: { start, end, expectedWorkingDays },
                    summary: {
                        employeeCount: 0,
                        reportsSubmitted: 0,
                        reportsExpected: 0,
                        submissionRate: 0,
                        avgKraMatch: 0,
                        avgManagerRating: 0,
                        avgSelfRating: 0,
                        totalTasksCompleted: 0,
                        totalHoursSpent: 0,
                        totalRevenueGenerated: 0,
                    },
                    employees: [],
                });
            }

            const profileIds = profiles.map((p) => p.id);

            const [workReports, attendance, kpis] = await Promise.all([
                prisma.workReport.findMany({
                    where: {
                        employeeId: { in: profileIds },
                        date: { gte: start, lte: end },
                    },
                    select: {
                        id: true,
                        employeeId: true,
                        date: true,
                        hoursSpent: true,
                        tasksCompleted: true,
                        revenueGenerated: true,
                        status: true,
                        kraMatchRatio: true,
                        managerRating: true,
                        selfRating: true,
                    },
                    orderBy: { date: 'desc' },
                }),
                prisma.attendance.findMany({
                    where: {
                        employeeId: { in: profileIds },
                        date: { gte: start, lte: end },
                    },
                    select: {
                        employeeId: true,
                        status: true,
                        lateMinutes: true,
                        checkIn: true,
                        checkOut: true,
                    },
                }),
                // KRA targets come from the canonical engine (EmployeeGoal),
                // not the legacy EmployeeKPI table — mapped to the same shape
                // so the overview panel is unchanged. `type` is the goal's
                // period; only the current window's goals are shown.
                prisma.employeeGoal.findMany({
                    where: {
                        employeeId: { in: profileIds },
                        isKra: true,
                        type: PERIOD_TO_KPI[period] as never,
                        startDate: { lte: end },
                        endDate: { gte: start },
                    },
                    select: {
                        id: true,
                        employeeId: true,
                        title: true,
                        targetValue: true,
                        currentValue: true,
                        unit: true,
                        type: true,
                        dimension: true,
                        updatedAt: true,
                    },
                    orderBy: { updatedAt: 'desc' },
                }).then((goals) => goals.map((g) => ({
                    id: g.id,
                    employeeId: g.employeeId,
                    title: g.title,
                    target: g.targetValue,
                    current: g.currentValue,
                    unit: g.unit,
                    period: g.type as string,
                    category: (g.dimension as string | null) ?? 'GENERAL',
                    updatedAt: g.updatedAt,
                }))),
            ]);

            const reportMap = new Map<string, typeof workReports>();
            const attendanceMap = new Map<string, typeof attendance>();
            const kpiMap = new Map<string, typeof kpis>();

            for (const id of profileIds) {
                reportMap.set(id, []);
                attendanceMap.set(id, []);
                kpiMap.set(id, []);
            }

            for (const r of workReports) {
                reportMap.get(r.employeeId)?.push(r);
            }
            for (const a of attendance) {
                attendanceMap.get(a.employeeId)?.push(a);
            }
            for (const k of kpis) {
                kpiMap.get(k.employeeId)?.push(k);
            }

            const employees = profiles.map((profile) => {
                const myReports = reportMap.get(profile.id) || [];
                const myAttendance = attendanceMap.get(profile.id) || [];
                const myKpis = (kpiMap.get(profile.id) || []).map((k) => {
                    const progress = k.target > 0 ? Math.min(100, (k.current / k.target) * 100) : 0;
                    return {
                        ...k,
                        progressPercent: Number(progress.toFixed(2)),
                    };
                });

                const reportCount = myReports.length;
                const submissionRate = expectedWorkingDays > 0
                    ? (reportCount / expectedWorkingDays) * 100
                    : 0;
                const avgKraMatch = myReports.length > 0
                    ? myReports.reduce((sum, r) => sum + (r.kraMatchRatio || 0), 0) / myReports.length
                    : 0;
                const ratedByManager = myReports.filter((r) => typeof r.managerRating === 'number');
                const ratedBySelf = myReports.filter((r) => typeof r.selfRating === 'number');
                const avgManagerRating = ratedByManager.length > 0
                    ? ratedByManager.reduce((sum, r) => sum + (r.managerRating || 0), 0) / ratedByManager.length
                    : 0;
                const avgSelfRating = ratedBySelf.length > 0
                    ? ratedBySelf.reduce((sum, r) => sum + (r.selfRating || 0), 0) / ratedBySelf.length
                    : 0;
                const totalTasksCompleted = myReports.reduce((sum, r) => sum + (r.tasksCompleted || 0), 0);
                const totalHoursSpent = myReports.reduce((sum, r) => sum + (r.hoursSpent || 0), 0);
                const totalRevenueGenerated = myReports.reduce((sum, r) => sum + (r.revenueGenerated || 0), 0);

                const presentDays = myAttendance.filter((a) => a.status === 'PRESENT').length;
                const lateDays = myAttendance.filter((a) => (a.lateMinutes || 0) > 0).length;
                const attendanceRate = expectedWorkingDays > 0
                    ? (presentDays / expectedWorkingDays) * 100
                    : 0;

                const kpiProgressAvg = myKpis.length > 0
                    ? myKpis.reduce((sum, k) => sum + k.progressPercent, 0) / myKpis.length
                    : 0;

                const qualityScore = (avgManagerRating > 0 ? (avgManagerRating / 10) * 60 : 0) + (avgKraMatch * 40);
                const consistencyScore = (submissionRate * 0.6) + (attendanceRate * 0.4);
                const effectiveScore = (kpiProgressAvg * 0.5) + (qualityScore * 0.25) + (consistencyScore * 0.25);

                return {
                    employeeId: profile.id,
                    userId: profile.userId,
                    name: profile.user?.name || 'Unknown',
                    email: profile.user?.email || '',
                    designation: profile.designation || 'N/A',
                    period,
                    kpis: myKpis,
                    workReport: {
                        submitted: reportCount,
                        expected: expectedWorkingDays,
                        submissionRate: Number(submissionRate.toFixed(2)),
                        avgKraMatch: Number(avgKraMatch.toFixed(4)),
                        avgManagerRating: Number(avgManagerRating.toFixed(2)),
                        avgSelfRating: Number(avgSelfRating.toFixed(2)),
                        totalTasksCompleted,
                        totalHoursSpent: Number(totalHoursSpent.toFixed(2)),
                        totalRevenueGenerated: Number(totalRevenueGenerated.toFixed(2)),
                        lastSubmittedAt: myReports[0]?.date || null,
                    },
                    attendance: {
                        presentDays,
                        expectedWorkingDays,
                        attendanceRate: Number(attendanceRate.toFixed(2)),
                        lateDays,
                    },
                    score: {
                        kpiProgress: Number(kpiProgressAvg.toFixed(2)),
                        quality: Number(qualityScore.toFixed(2)),
                        consistency: Number(consistencyScore.toFixed(2)),
                        effectiveness: Number(effectiveScore.toFixed(2)),
                    },
                };
            });

            const summary = {
                employeeCount: employees.length,
                reportsSubmitted: employees.reduce((sum, e) => sum + e.workReport.submitted, 0),
                reportsExpected: employees.reduce((sum, e) => sum + e.workReport.expected, 0),
                submissionRate: 0,
                avgKraMatch: 0,
                avgManagerRating: 0,
                avgSelfRating: 0,
                totalTasksCompleted: employees.reduce((sum, e) => sum + e.workReport.totalTasksCompleted, 0),
                totalHoursSpent: Number(
                    employees.reduce((sum, e) => sum + e.workReport.totalHoursSpent, 0).toFixed(2)
                ),
                totalRevenueGenerated: Number(
                    employees.reduce((sum, e) => sum + e.workReport.totalRevenueGenerated, 0).toFixed(2)
                ),
            };

            summary.submissionRate = summary.reportsExpected > 0
                ? Number(((summary.reportsSubmitted / summary.reportsExpected) * 100).toFixed(2))
                : 0;
            summary.avgKraMatch = employees.length > 0
                ? Number((employees.reduce((sum, e) => sum + e.workReport.avgKraMatch, 0) / employees.length).toFixed(4))
                : 0;
            summary.avgManagerRating = employees.length > 0
                ? Number((employees.reduce((sum, e) => sum + e.workReport.avgManagerRating, 0) / employees.length).toFixed(2))
                : 0;
            summary.avgSelfRating = employees.length > 0
                ? Number((employees.reduce((sum, e) => sum + e.workReport.avgSelfRating, 0) / employees.length).toFixed(2))
                : 0;

            return NextResponse.json({
                period,
                scope: wantsTeamScope ? 'team' : 'self',
                range: {
                    start,
                    end,
                    expectedWorkingDays,
                },
                summary,
                employees,
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
