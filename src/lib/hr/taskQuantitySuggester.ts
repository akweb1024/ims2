import { prisma } from '@/lib/prisma';

const ANOMALY_FACTOR = 3;
const HISTORY_LOOKBACK_DAYS = 60;
const MIN_HISTORY_POINTS = 3;

/**
 * Task suggester for manager validation: flags SCALED tasksSnapshot items whose claimed
 * quantity is wildly out of line with that employee's own history for the same task template,
 * so a manager scanning the Review Inbox can tell at a glance which tasks are worth a closer
 * look versus safe to approve at a glance. Mirrors the report-level anomaly check in
 * [[workReportAutoApproval]], applied per-task instead of per-report-total.
 *
 * Only worth the extra queries for reports actually awaiting validation — callers should only
 * invoke this for SUBMITTED reports (e.g. the Review Inbox), not every report-list view.
 */
export async function annotateTaskQuantitySuggestions<T extends { employeeId: string; id: string; tasksSnapshot: unknown }>(
    reports: T[]
): Promise<T[]> {
    const scaledTaskIdsByEmployee = new Map<string, Set<string>>();
    for (const report of reports) {
        const tasks = Array.isArray(report.tasksSnapshot) ? (report.tasksSnapshot as any[]) : [];
        for (const t of tasks) {
            if (t.calculationType !== 'SCALED' || !t.id) continue;
            if (!scaledTaskIdsByEmployee.has(report.employeeId)) scaledTaskIdsByEmployee.set(report.employeeId, new Set());
            scaledTaskIdsByEmployee.get(report.employeeId)!.add(t.id);
        }
    }
    if (scaledTaskIdsByEmployee.size === 0) return reports;

    const since = new Date(Date.now() - HISTORY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const history = await prisma.workReport.findMany({
        where: {
            employeeId: { in: [...scaledTaskIdsByEmployee.keys()] },
            status: 'APPROVED',
            date: { gte: since },
            tasksSnapshot: { not: (null as any) },
        },
        select: { employeeId: true, tasksSnapshot: true },
    });

    // employeeId -> taskId -> [past quantities]
    const quantitiesByEmployeeTask = new Map<string, Map<string, number[]>>();
    for (const past of history) {
        const tasks = Array.isArray(past.tasksSnapshot) ? (past.tasksSnapshot as any[]) : [];
        for (const t of tasks) {
            if (t.calculationType !== 'SCALED' || !t.id || !Number.isFinite(t.quantity)) continue;
            if (!quantitiesByEmployeeTask.has(past.employeeId)) quantitiesByEmployeeTask.set(past.employeeId, new Map());
            const byTask = quantitiesByEmployeeTask.get(past.employeeId)!;
            if (!byTask.has(t.id)) byTask.set(t.id, []);
            byTask.get(t.id)!.push(t.quantity);
        }
    }

    return reports.map((report) => {
        const tasks = Array.isArray(report.tasksSnapshot) ? (report.tasksSnapshot as any[]) : [];
        if (tasks.length === 0) return report;

        const byTask = quantitiesByEmployeeTask.get(report.employeeId);
        const annotated = tasks.map((t) => {
            if (t.calculationType !== 'SCALED' || !t.id) return t;
            const history = byTask?.get(t.id);
            if (!history || history.length < MIN_HISTORY_POINTS) return t;
            const avg = history.reduce((sum, v) => sum + v, 0) / history.length;
            if (avg <= 0) return t;
            return {
                ...t,
                historicalAvgQuantity: Number(avg.toFixed(1)),
                unusualQuantity: t.quantity > avg * ANOMALY_FACTOR,
            };
        });

        return { ...report, tasksSnapshot: annotated };
    });
}
