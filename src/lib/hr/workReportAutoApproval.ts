import { prisma } from '@/lib/prisma';
import { getISTDateRange, getISTDateString } from '@/lib/hr/work-agenda';

/** Anomaly threshold: reported beyond this multiple of the employee's own trailing average gets escalated. */
const ANOMALY_FACTOR = 3;
const ANOMALY_LOOKBACK_DAYS = 30;
const HOURS_TOLERANCE_ABS_HOURS = 0.5;
const HOURS_TOLERANCE_REL = 0.1;
const LOW_KRA_MATCH_THRESHOLD = 0.2;

export interface WorkReportForAutoApproval {
    id: string;
    employeeId: string;
    companyId: string | null;
    date: Date;
    hoursSpent: number | null;
    revenueGenerated: number;
    pointsEarned: number;
    kraMatchRatio: number | null;
}

export interface AutoApprovalDecision {
    approve: boolean;
    reason: string;
    evaluation?: Record<string, any>;
    managerComment?: string;
    managerRating?: number;
}

function neutralAttendanceFromHours(hours: number): number {
    if (hours >= 8.5) return 3;
    if (hours >= 8.0) return 2;
    if (hours >= 7.0) return 1;
    if (hours >= 6.0) return 0;
    if (hours >= 4.0) return -1;
    if (hours >= 2.0) return -2;
    return -3;
}

// Same -3..+3 x 5-metric -> 1..10 mapping as WorkReportValidator's calculatedRating, so an
// auto-approved report's rating reads consistently next to manager-reviewed ones.
function calculateRating(scores: { attendance: number; discipline: number; workQuality: number; efficiency: number; instructionCompliance: number }): number {
    const totalScore = scores.attendance + scores.discipline + scores.workQuality + scores.efficiency + scores.instructionCompliance;
    return Math.max(1, Math.min(10, Math.round((((totalScore + 15) / 30) * 9) + 1)));
}

/** Is any of today's key numbers wildly out of line with this employee's own recent history? */
async function findAnomaly(
    employeeId: string,
    reportDate: Date,
    values: { pointsEarned: number; hoursSpent: number; revenueGenerated: number }
): Promise<string | null> {
    const since = new Date(reportDate.getTime() - ANOMALY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const history = await prisma.workReport.aggregate({
        _avg: { pointsEarned: true, hoursSpent: true, revenueGenerated: true },
        _count: true,
        where: { employeeId, date: { gte: since, lt: reportDate } },
    });
    if (history._count < 3) return null; // not enough history to judge

    const checks: Array<[string, number, number | null | undefined]> = [
        ['points earned', values.pointsEarned, history._avg.pointsEarned],
        ['hours spent', values.hoursSpent, history._avg.hoursSpent],
        ['revenue generated', values.revenueGenerated, history._avg.revenueGenerated],
    ];
    for (const [label, value, avg] of checks) {
        if (avg && avg > 0 && value > avg * ANOMALY_FACTOR) {
            return `${label} (${value}) is more than ${ANOMALY_FACTOR}x the employee's recent average (${avg.toFixed(1)})`;
        }
    }
    return null;
}

/**
 * Decides whether a just-submitted WorkReport can be auto-approved, mirroring the KRA
 * contribution auto-verify pattern in [[../kra/validation.ts]]: resolve the routine case
 * automatically, escalate anomalies/mismatches/missing-data to the manager's queue.
 *
 * Deliberately conservative: the four subjective evaluation metrics (discipline, workQuality,
 * efficiency, instructionCompliance) are never inferred — they're left neutral — because there
 * is no system data to check them against. Auto-approval only ever certifies the objectively
 * checkable parts (hours vs. attendance, revenue vs. verified transactions, tasks already
 * threshold-gated at submission, no anomaly vs. the employee's own history); it never claims a
 * quality judgment was made.
 */
export async function evaluateWorkReportForAutoApproval(report: WorkReportForAutoApproval): Promise<AutoApprovalDecision> {
    const { employeeId, companyId, date } = report;
    const hoursSpent = report.hoursSpent ?? 0;

    if (report.kraMatchRatio !== null && report.kraMatchRatio !== undefined && report.kraMatchRatio < LOW_KRA_MATCH_THRESHOLD) {
        return { approve: false, reason: 'Low KRA keyword alignment — content may not match assigned duties' };
    }

    // Hours must be independently verifiable against the day's attendance record — self-reported
    // hours with nothing to check them against always go to a human, same as a HYBRID metric with
    // no system row.
    const { start, end } = getISTDateRange(getISTDateString(date));
    const attendance = await prisma.attendance.findFirst({
        where: { employeeId, date: { gte: start, lte: end } },
        select: { checkIn: true, checkOut: true },
    });
    if (!attendance?.checkIn || !attendance?.checkOut) {
        return { approve: false, reason: 'No attendance check-in/check-out to verify reported hours against' };
    }
    const attendanceHours = (new Date(attendance.checkOut).getTime() - new Date(attendance.checkIn).getTime()) / 3_600_000;
    const hoursTolerance = Math.max(HOURS_TOLERANCE_ABS_HOURS, attendanceHours * HOURS_TOLERANCE_REL);
    if (Math.abs(hoursSpent - attendanceHours) > hoursTolerance) {
        return { approve: false, reason: `Reported hours (${hoursSpent}) don't match the attendance record (${attendanceHours.toFixed(2)})` };
    }

    // Self-reported revenue must match verified revenue transactions for the day, if any was claimed.
    if (report.revenueGenerated > 0 && companyId) {
        const agg = await prisma.revenueTransaction.aggregate({
            _sum: { amount: true },
            where: { companyId, claimedByEmployeeId: employeeId, verificationStatus: 'VERIFIED', paymentDate: { gte: start, lte: end } },
        });
        const systemRevenue = agg._sum.amount ?? 0;
        const tolerance = Math.max(0.01 * systemRevenue, 1);
        if (Math.abs(report.revenueGenerated - systemRevenue) > tolerance) {
            return { approve: false, reason: `Reported revenue (${report.revenueGenerated}) doesn't match verified transactions (${systemRevenue})` };
        }
    }

    const anomaly = await findAnomaly(employeeId, date, {
        pointsEarned: report.pointsEarned,
        hoursSpent,
        revenueGenerated: report.revenueGenerated,
    });
    if (anomaly) {
        return { approve: false, reason: `Anomaly vs. recent history: ${anomaly}` };
    }

    const scores = {
        attendance: neutralAttendanceFromHours(attendanceHours),
        discipline: 0,
        workQuality: 0,
        efficiency: 0,
        instructionCompliance: 0,
    };

    return {
        approve: true,
        reason: 'Hours matched attendance, tasks were within their configured thresholds, and revenue (if any) matched verified transactions.',
        evaluation: { ...scores, autoApproved: true },
        managerComment: '🤖 Auto-approved — hours, tasks, and revenue all matched system records. No manager review was required.',
        managerRating: calculateRating(scores),
    };
}
