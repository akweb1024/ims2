/**
 * Team / company KRA analytics aggregation for the manager / TL / heads dashboard.
 *
 * Scope mirrors the rest of the KRA module (src/lib/kra/scope.ts):
 *  - MANAGER / TEAM_LEADER  → their downline (+ self)
 *  - ADMIN / SUPER_ADMIN / HR / HR_MANAGER → company-wide (optional department filter)
 *
 * All numbers derive from EmployeeGoal rows (isKra) whose window overlaps the selected
 * period. The trend series buckets the last 6 periods from a single goals query.
 */
import { prisma } from '@/lib/prisma';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { GROUP_WIDE_ROLES } from '@/lib/kra/scope';
import { computePeriodWindow, type KraPeriodType } from '@/lib/kra/period';

const TREND_PERIODS = 6;

export interface KraAnalyticsActor {
    id: string;
    role: string;
    companyId?: string | null;
}

export interface KraAnalytics {
    period: string;
    periodType: KraPeriodType;
    scope: 'TEAM' | 'COMPANY';
    window: { startDate: string; endDate: string };
    summary: {
        employees: number;
        totalGoals: number;
        achievedGoals: number;
        avgAchievement: number;
        pendingVerification: number;
        atRisk: number; // unlocked goals below 50% achievement
    };
    byMember: { employeeId: string; name: string; goalCount: number; achievedCount: number; avgAchievement: number }[];
    byStatus: { status: string; count: number }[];
    byDimension: { dimension: string; count: number; avgAchievement: number }[];
    byDepartment: { departmentId: string; name: string; companyName?: string | null; employees: number; goalCount: number; avgAchievement: number }[];
    trend: { label: string; avgAchievement: number; goalCount: number }[];
}

const LOCKED_STATUSES = new Set(['SUBMITTED', 'TL_VERIFIED', 'MANAGER_VERIFIED', 'ACHIEVED']);
const PENDING_STATUSES = new Set(['SUBMITTED', 'TL_VERIFIED']);

const round = (n: number) => Math.round(n * 100) / 100;
const mean = (xs: number[]) => (xs.length ? round(xs.reduce((s, x) => s + x, 0) / xs.length) : 0);

/** Shift a reference date back by `back` periods of the given type. */
function shiftRef(type: KraPeriodType, ref: Date, back: number): Date {
    const d = new Date(ref);
    switch (type) {
        case 'DAILY': d.setDate(d.getDate() - back); break;
        case 'WEEKLY': d.setDate(d.getDate() - back * 7); break;
        case 'MONTHLY': d.setMonth(d.getMonth() - back); break;
        case 'QUARTERLY': d.setMonth(d.getMonth() - back * 3); break;
        case 'HALF_YEARLY': d.setMonth(d.getMonth() - back * 6); break;
        case 'YEARLY': d.setFullYear(d.getFullYear() - back); break;
    }
    return d;
}

interface ScopedProfile {
    id: string;
    userId: string;
    name: string;
    departmentId: string | null;
    departmentName: string | null;
    companyName: string | null;
}

async function resolveScopeProfiles(actor: KraAnalyticsActor, departmentId?: string | null): Promise<{ profiles: ScopedProfile[]; scope: 'TEAM' | 'COMPANY' }> {
    const select = {
        id: true,
        userId: true,
        user: { select: { name: true, email: true, departmentId: true, department: { select: { name: true } }, company: { select: { name: true } } } },
    } as const;

    let rows;
    let scope: 'TEAM' | 'COMPANY';
    if (GROUP_WIDE_ROLES.has(actor.role)) {
        scope = 'COMPANY';
        // Group-wide, matching the rest of the KRA module (scope.ts gives these
        // roles unrestricted reach): the 4-company group operates as one, and
        // the department dropdown deliberately lists every company's
        // departments — restricting the data to the actor's own company made
        // 3 of 4 same-named departments silently return zeros.
        rows = await prisma.employeeProfile.findMany({
            where: {
                user: { isActive: true, ...(departmentId ? { departmentId } : {}) },
            },
            select,
            take: 500,
        });
    } else {
        scope = 'TEAM';
        const downline = await getDownlineUserIds(actor.id, actor.companyId ?? undefined);
        rows = await prisma.employeeProfile.findMany({
            where: {
                userId: { in: [...downline, actor.id] },
                ...(departmentId ? { user: { departmentId } } : {}),
            },
            select,
        });
    }

    const profiles: ScopedProfile[] = rows.map((p) => ({
        id: p.id,
        userId: p.userId,
        name: p.user?.name || p.user?.email || 'Unknown',
        departmentId: p.user?.departmentId ?? null,
        departmentName: p.user?.department?.name ?? null,
        companyName: (p.user as any)?.company?.name ?? null,
    }));
    return { profiles, scope };
}

export async function getKraTeamAnalytics(opts: {
    actor: KraAnalyticsActor;
    periodType: KraPeriodType;
    ref: Date;
    departmentId?: string | null;
}): Promise<KraAnalytics> {
    const { actor, periodType, ref, departmentId } = opts;
    const win = computePeriodWindow(periodType, ref);
    const earliest = computePeriodWindow(periodType, shiftRef(periodType, ref, TREND_PERIODS - 1));

    const { profiles, scope } = await resolveScopeProfiles(actor, departmentId);
    const profileById = new Map(profiles.map((p) => [p.id, p]));
    const profileIds = profiles.map((p) => p.id);

    // One query across the whole trend range; the selected period is the latest bucket.
    const goals = profileIds.length
        ? await prisma.employeeGoal.findMany({
              where: {
                  isKra: true,
                  type: periodType,
                  employeeId: { in: profileIds },
                  startDate: { lte: win.endDate },
                  endDate: { gte: earliest.startDate },
              },
              select: {
                  id: true,
                  employeeId: true,
                  achievementPercentage: true,
                  status: true,
                  dimension: true,
                  startDate: true,
              },
          })
        : [];

    // Selected-period goals (window overlap).
    const inWindow = goals.filter((g) => g.startDate <= win.endDate && g.startDate >= win.startDate);

    // ---- Summary ----
    const achievedGoals = inWindow.filter((g) => g.achievementPercentage >= 100 || g.status === 'ACHIEVED').length;
    const pendingVerification = inWindow.filter((g) => PENDING_STATUSES.has(g.status)).length;
    const atRisk = inWindow.filter((g) => !LOCKED_STATUSES.has(g.status) && g.achievementPercentage < 50).length;
    const summary = {
        employees: profiles.length,
        totalGoals: inWindow.length,
        achievedGoals,
        avgAchievement: mean(inWindow.map((g) => Math.min(100, g.achievementPercentage))),
        pendingVerification,
        atRisk,
    };

    // ---- By member ----
    const memberMap = new Map<string, number[]>();
    const memberAchieved = new Map<string, number>();
    for (const g of inWindow) {
        if (!memberMap.has(g.employeeId)) memberMap.set(g.employeeId, []);
        memberMap.get(g.employeeId)!.push(Math.min(100, g.achievementPercentage));
        if (g.achievementPercentage >= 100 || g.status === 'ACHIEVED') {
            memberAchieved.set(g.employeeId, (memberAchieved.get(g.employeeId) || 0) + 1);
        }
    }
    const byMember = [...memberMap.entries()]
        .map(([employeeId, achs]) => ({
            employeeId,
            name: profileById.get(employeeId)?.name || 'Unknown',
            goalCount: achs.length,
            achievedCount: memberAchieved.get(employeeId) || 0,
            avgAchievement: mean(achs),
        }))
        .sort((a, b) => b.avgAchievement - a.avgAchievement);

    // ---- By status ----
    const statusMap = new Map<string, number>();
    for (const g of inWindow) statusMap.set(g.status, (statusMap.get(g.status) || 0) + 1);
    const byStatus = [...statusMap.entries()].map(([status, count]) => ({ status, count }));

    // ---- By dimension ----
    const dimMap = new Map<string, number[]>();
    for (const g of inWindow) {
        const dim = g.dimension || 'UNSPECIFIED';
        if (!dimMap.has(dim)) dimMap.set(dim, []);
        dimMap.get(dim)!.push(Math.min(100, g.achievementPercentage));
    }
    const byDimension = [...dimMap.entries()].map(([dimension, achs]) => ({
        dimension,
        count: achs.length,
        avgAchievement: mean(achs),
    }));

    // ---- By department ----
    const deptAch = new Map<string, number[]>();
    const deptEmployees = new Map<string, Set<string>>();
    const deptName = new Map<string, string>();
    const deptCompany = new Map<string, string | null>();
    for (const g of inWindow) {
        const p = profileById.get(g.employeeId);
        const did = p?.departmentId || 'none';
        deptName.set(did, p?.departmentName || 'Unassigned');
        deptCompany.set(did, p?.companyName ?? null);
        if (!deptAch.has(did)) deptAch.set(did, []);
        deptAch.get(did)!.push(Math.min(100, g.achievementPercentage));
        if (!deptEmployees.has(did)) deptEmployees.set(did, new Set());
        deptEmployees.get(did)!.add(g.employeeId);
    }
    const byDepartment = [...deptAch.entries()]
        .map(([departmentId, achs]) => ({
            departmentId,
            name: deptName.get(departmentId) || 'Unassigned',
            companyName: deptCompany.get(departmentId) ?? null,
            employees: deptEmployees.get(departmentId)?.size || 0,
            goalCount: achs.length,
            avgAchievement: mean(achs),
        }))
        .sort((a, b) => b.avgAchievement - a.avgAchievement);

    // ---- Trend (bucket all goals by their period label) ----
    const labelOrder: string[] = [];
    for (let i = TREND_PERIODS - 1; i >= 0; i--) {
        labelOrder.push(computePeriodWindow(periodType, shiftRef(periodType, ref, i)).label);
    }
    const trendBuckets = new Map<string, number[]>();
    for (const g of goals) {
        const label = computePeriodWindow(periodType, g.startDate).label;
        if (!trendBuckets.has(label)) trendBuckets.set(label, []);
        trendBuckets.get(label)!.push(Math.min(100, g.achievementPercentage));
    }
    const trend = labelOrder.map((label) => ({
        label,
        avgAchievement: mean(trendBuckets.get(label) || []),
        goalCount: (trendBuckets.get(label) || []).length,
    }));

    return {
        period: win.label,
        periodType,
        scope,
        window: { startDate: win.startDate.toISOString(), endDate: win.endDate.toISOString() },
        summary,
        byMember,
        byStatus,
        byDimension,
        byDepartment,
        trend,
    };
}
