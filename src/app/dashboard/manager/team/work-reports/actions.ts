'use server';

import { auth } from '@/lib/nextauth';
import { prisma } from '@/lib/prisma';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { revalidatePath } from 'next/cache';

const REVIEWER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'];

/**
 * Server actions are public endpoints — a caller reaches these with any reportId,
 * not just the ones the modal rendered. Mirrors the gate on
 * PATCH /api/hr/work-reports: reviewer role, then downline check for MANAGER/TEAM_LEADER.
 */
async function authorizeReviewer(reportId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const { id: userId, role, companyId } = session.user;
    if (!REVIEWER_ROLES.includes(role)) {
        return { error: 'Forbidden: You cannot review work reports' };
    }

    const report = await prisma.workReport.findUnique({
        where: { id: reportId },
        select: { id: true, employee: { select: { userId: true } } },
    });
    if (!report) return { error: 'Work report not found' };

    if (role === 'MANAGER' || role === 'TEAM_LEADER') {
        const subIds = await getDownlineUserIds(userId, companyId);
        if (!subIds.includes(report.employee.userId)) {
            return { error: 'Forbidden: This employee is not in your team' };
        }
    }

    return { userId };
}

export async function updateWorkReportStatus(
    reportId: string,
    status: string,
    comment?: string,
    managerRating?: number,
    evaluation?: any
) {
    const gate = await authorizeReviewer(reportId);
    if (gate.error) return { success: false, error: gate.error };

    try {
        await prisma.$transaction(async (tx) => {
            // Update report status
            await tx.workReport.update({
                where: { id: reportId },
                data: {
                    status,
                    managerComment: comment,
                    managerRating,
                    evaluation,
                    // If evaluation has attendance/discipline, update separate fields too if needed
                    // For now, relies on evaluation JSON or we can extract:
                    attendanceStatus: evaluation?.attendance ? (evaluation.attendance >= 3 ? 'PRESENT' : 'ABSENT') : undefined,
                    disciplineStatus: evaluation?.discipline ? (evaluation.discipline >= 3 ? 'GOOD' : 'VIOLATION') : undefined
                },
            });

            // Add comment if provided
            if (comment) {
                await tx.workReportComment.create({
                    data: {
                        workReportId: reportId,
                        authorId: gate.userId!,
                        content: comment,
                    },
                });
            }
        });

        revalidatePath('/dashboard/manager/team/work-reports');
        return { success: true };
    } catch (error) {
        console.error('Error updating work report:', error);
        return { success: false, error: 'Failed to update work report' };
    }
}

export async function addWorkReportComment(reportId: string, content: string) {
    const gate = await authorizeReviewer(reportId);
    if (gate.error) return { success: false, error: gate.error };

    try {
        await prisma.workReportComment.create({
            data: {
                workReportId: reportId,
                authorId: gate.userId!,
                content,
            },
        });

        revalidatePath('/dashboard/manager/team/work-reports');
        return { success: true };
    } catch (error) {
        console.error('Error adding comment:', error);
        return { success: false, error: 'Failed to add comment' };
    }
}
