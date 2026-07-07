import { prisma } from '@/lib/prisma';
import { ValidationError } from '@/lib/error-handler';
import { decodeAgendaMetadata, getISTDateString, getISTDateRange } from '@/lib/hr/work-agenda';

export interface ApproveWorkReportInput {
    existing: {
        id: string;
        employeeId: string;
        date: Date;
        title: string;
        status: string;
        pointsEarned: number;
        tasksSnapshot: any;
    };
    status: string;
    managerComment?: string | null;
    managerRating?: number | string | null;
    approvedTaskIds?: string[];
    rejectedTaskIds?: string[];
    evaluation?: Record<string, any> | null;
    allowMandatoryOverride?: boolean;
    /** For the EmployeePointLog entry — the acting manager's company (or the report's own). */
    companyId?: string | null;
}

/**
 * Applies a manager's (or the auto-approval engine's) validation decision to a WorkReport:
 * recomputes points from per-task approval, enforces the mandatory-agenda gate, and persists
 * status/evaluation. Shared by the manual PATCH route and the automatic-approval path in POST
 * so both go through identical business rules — see [[workReportAutoApproval]].
 */
export async function approveWorkReport(input: ApproveWorkReportInput) {
    const { existing, status, managerComment, managerRating, approvedTaskIds, rejectedTaskIds, evaluation, allowMandatoryOverride, companyId } = input;

    // Calculate approved points based on task-level approval
    let finalPointsEarned = existing.pointsEarned || 0;
    let updatedTasksSnapshot = existing.tasksSnapshot;

    if (approvedTaskIds && Array.isArray(approvedTaskIds) && existing.tasksSnapshot) {
        // Update task snapshot with approval status
        updatedTasksSnapshot = (existing.tasksSnapshot as any[]).map((task: any) => ({
            ...task,
            isApproved: approvedTaskIds.includes(task.id),
            isRejected: rejectedTaskIds?.includes(task.id) || false
        }));

        // Recalculate points based on approved tasks only
        finalPointsEarned = updatedTasksSnapshot
            .filter((task: any) => approvedTaskIds.includes(task.id))
            .reduce((sum: number, task: any) => sum + (task.points || 0), 0);
    }

    if (status === 'APPROVED' && existing.status !== 'APPROVED') {
        // Award Points for approved tasks only
        if (finalPointsEarned && finalPointsEarned > 0 && companyId) {
            await prisma.employeePointLog.create({
                data: {
                    employeeId: existing.employeeId,
                    companyId,
                    type: 'WORK_REPORT',
                    points: finalPointsEarned,
                    date: new Date(),
                    reason: `Work Report Approved: ${existing.title} (${approvedTaskIds?.length || 0} tasks approved)`
                }
            });
        }
    }

    let reconciledManagerComment = managerComment;
    if (status === 'APPROVED') {
        const reportIstDate = getISTDateString(new Date(existing.date));
        const { start: reportDayStart, end: reportDayEnd } = getISTDateRange(reportIstDate);
        const dayAgenda = await prisma.workPlan.findMany({
            where: {
                employeeId: existing.employeeId,
                date: { gte: reportDayStart, lte: reportDayEnd }
            },
            select: { agenda: true, completionStatus: true, strategy: true }
        });
        const pendingMandatory = dayAgenda.filter((a) => {
            const meta = decodeAgendaMetadata(a.strategy);
            return Boolean(meta?.mandatory) && a.completionStatus !== 'COMPLETED';
        });
        if (pendingMandatory.length > 0) {
            const baseComment = String(managerComment || '').trim();
            if (!allowMandatoryOverride || baseComment.length < 12) {
                throw new ValidationError(
                    `Approval blocked: mandatory agenda pending (${pendingMandatory.map((x) => x.agenda).join(', ')}). Provide manager comment with override reason and set allowMandatoryOverride=true.`
                );
            }
            const warning = `Mandatory agenda pending: ${pendingMandatory.map((x) => x.agenda).join(', ')}`;
            reconciledManagerComment = [managerComment, warning].filter(Boolean).join(' | ');
        }
    }

    return prisma.workReport.update({
        where: { id: existing.id },
        data: {
            status,
            managerComment: reconciledManagerComment,
            pointsEarned: finalPointsEarned,
            tasksSnapshot: updatedTasksSnapshot as any,
            ...(managerRating && { managerRating: parseInt(String(managerRating)) }),
            evaluation: evaluation ? {
                ...evaluation,
                // Automate attendance score based on working hours (8.5h = 5/5)
                attendance: evaluation.workingHours ?
                    Math.min(5, Math.max(1, Math.round((parseFloat(evaluation.workingHours) / 8.5) * 5))) :
                    evaluation.attendance
            } : undefined,
            attendanceStatus: evaluation?.attendance ? (Number(evaluation.attendance) >= 3 ? 'PRESENT' : 'ABSENT') : undefined,
            disciplineStatus: evaluation?.discipline ? (Number(evaluation.discipline) >= 3 ? 'GOOD' : 'WARNING') : undefined
        }
    });
}
