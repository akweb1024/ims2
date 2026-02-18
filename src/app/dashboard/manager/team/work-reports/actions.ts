'use server';

import { auth } from '@/lib/nextauth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateWorkReportStatus(
    reportId: string,
    status: string,
    comment?: string,
    managerRating?: number,
    evaluation?: any
) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Unauthorized' };
    }

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
                        authorId: session.user.id,
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
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.workReportComment.create({
            data: {
                workReportId: reportId,
                authorId: session.user.id,
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
