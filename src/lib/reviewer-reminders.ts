import { prisma } from './prisma';
import { sendEmail, EmailTemplates } from './email';
import { logger } from './logger';

/**
 * Service to handle automated reminders for reviewers
 */
export async function sendReviewerReminders() {
    try {
        const fortyEightHoursFromNow = new Date(Date.now() + 48 * 60 * 60 * 1000);
        const now = new Date();

        // Find assignments due in the next 48 hours that haven't been submitted
        const upcomingAssignments = await prisma.reviewAssignment.findMany({
            where: {
                status: { in: ['PENDING', 'IN_PROGRESS'] },
                dueDate: {
                    gt: now,
                    lte: fortyEightHoursFromNow
                },
                reminderSent: false // Assuming we add this field to track reminders
            },
            include: {
                reviewer: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    }
                },
                article: {
                    select: {
                        title: true
                    }
                }
            }
        });

        logger.info(`Found ${upcomingAssignments.length} reviewer assignments requiring reminders`);

        const results = await Promise.allSettled(upcomingAssignments.map(async (assignment) => {
            const reviewerName = assignment.reviewer.user.name || assignment.reviewer.user.email;
            const articleTitle = assignment.article.title;
            const dueDate = assignment.dueDate.toLocaleDateString();

            const template = EmailTemplates.reviewerReminder(
                reviewerName,
                articleTitle,
                dueDate,
                assignment.id
            );

            await sendEmail({
                to: assignment.reviewer.user.email,
                subject: template.subject,
                text: template.text,
                html: template.html
            });

            // Update assignment to prevent duplicate reminders
            // Note: This requires a migration to add 'reminderSent' field or we can use metadata
            await prisma.reviewAssignment.update({
                where: { id: assignment.id },
                data: { 
                    reminderSent: true 
                }
            });

            return assignment.id;
        }));

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        logger.info(`Successfully sent ${successCount} reviewer reminders`);
        
        return { total: upcomingAssignments.length, sent: successCount };

    } catch (error) {
        logger.error('Error in Reviewer Reminder Service:', error);
        throw error;
    }
}
