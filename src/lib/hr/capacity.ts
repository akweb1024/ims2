import { prisma } from '@/lib/prisma';

/**
 * Daily capacity, defined once for every consumer (agenda guardrails, the
 * assign screens, the capacity API). The overload ceiling comes from the
 * employee's real shift, resolved with the same priority chain attendance
 * uses: day-specific ShiftRoster override → standing EmployeeProfile.shift →
 * company default Shift (isDefault) → 8.5h last-resort fallback.
 */

export const FALLBACK_SHIFT_HOURS = 8.5;

export interface EmployeeCapacity {
    employeeId: string;
    shiftHours: number;
    plannedHours: number;
    remainingHours: number;
    overload: boolean;
}

/** Duration in hours between "HH:MM" strings; night shifts wrap past midnight. */
export function shiftDurationHours(
    shift: { startTime?: string | null; endTime?: string | null } | null | undefined,
): number | null {
    const parse = (s: string | null | undefined) => {
        const m = /^(\d{1,2}):(\d{2})/.exec((s || '').trim());
        if (!m) return null;
        const minutes = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
        return minutes < 24 * 60 ? minutes : null;
    };
    const start = parse(shift?.startTime);
    const end = parse(shift?.endTime);
    if (start === null || end === null) return null;
    let minutes = end - start;
    if (minutes <= 0) minutes += 24 * 60;
    return Math.round((minutes / 60) * 100) / 100;
}

/** Resolve each employee's shift-hours ceiling for a given day. */
export async function resolveShiftHoursMap(
    employeeIds: string[],
    dayStart: Date,
    dayEnd: Date,
): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (!employeeIds.length) return result;

    const [rosters, profiles] = await Promise.all([
        prisma.shiftRoster.findMany({
            where: { employeeId: { in: employeeIds }, date: { gte: dayStart, lte: dayEnd } },
            include: { shift: { select: { startTime: true, endTime: true } } },
        }),
        prisma.employeeProfile.findMany({
            where: { id: { in: employeeIds } },
            select: {
                id: true,
                shift: { select: { startTime: true, endTime: true } },
                user: { select: { companyId: true } },
            },
        }),
    ]);

    const companyIds = Array.from(
        new Set(profiles.map((p) => p.user?.companyId).filter((c): c is string => !!c)),
    );
    const defaults = companyIds.length
        ? await prisma.shift.findMany({
            where: { companyId: { in: companyIds }, isDefault: true },
            select: { companyId: true, startTime: true, endTime: true },
        })
        : [];
    const defaultByCompany = new Map(defaults.map((d) => [d.companyId, d]));
    const rosterByEmployee = new Map(rosters.map((r) => [r.employeeId, r]));

    for (const profile of profiles) {
        const rosterShift = rosterByEmployee.get(profile.id)?.shift;
        const companyDefault = profile.user?.companyId
            ? defaultByCompany.get(profile.user.companyId)
            : null;
        const hours =
            shiftDurationHours(rosterShift) ??
            shiftDurationHours(profile.shift) ??
            shiftDurationHours(companyDefault) ??
            FALLBACK_SHIFT_HOURS;
        result.set(profile.id, hours);
    }
    // Unknown employee ids still get the fallback so callers never divide by undefined.
    for (const id of employeeIds) {
        if (!result.has(id)) result.set(id, FALLBACK_SHIFT_HOURS);
    }
    return result;
}

/**
 * Per-employee capacity for one day. `extraPlanWhere` lets callers apply the
 * same company scoping they use on their own WorkPlan queries so the sums
 * can't diverge from what those screens display.
 */
export async function computeCapacityMap(
    employeeIds: string[],
    dayStart: Date,
    dayEnd: Date,
    extraPlanWhere: Record<string, unknown> = {},
): Promise<Map<string, EmployeeCapacity>> {
    const result = new Map<string, EmployeeCapacity>();
    if (!employeeIds.length) return result;

    const [shiftHoursMap, plannedRows] = await Promise.all([
        resolveShiftHoursMap(employeeIds, dayStart, dayEnd),
        prisma.workPlan.groupBy({
            by: ['employeeId'],
            where: {
                employeeId: { in: employeeIds },
                date: { gte: dayStart, lte: dayEnd },
                ...extraPlanWhere,
            },
            _sum: { estimatedHours: true },
        }),
    ]);
    const plannedByEmployee = new Map(
        plannedRows.map((r) => [r.employeeId, Number(r._sum.estimatedHours || 0)]),
    );

    for (const id of employeeIds) {
        const shiftHours = shiftHoursMap.get(id) ?? FALLBACK_SHIFT_HOURS;
        const plannedHours = Math.round((plannedByEmployee.get(id) || 0) * 100) / 100;
        result.set(id, {
            employeeId: id,
            shiftHours,
            plannedHours,
            remainingHours: Math.round((shiftHours - plannedHours) * 100) / 100,
            overload: plannedHours > shiftHours,
        });
    }
    return result;
}
