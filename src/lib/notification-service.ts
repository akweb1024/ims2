import { prisma } from './prisma';
import { sendEmail } from './email';

interface EmailNotificationParams {
    to: string;
    templateName: string;
    variables: Record<string, string>;
}

interface ManuscriptNotificationParams {
    articleId: string;
    recipientEmail: string;
    recipientName?: string;
}

/**
 * Send email using template from database
 */
export async function sendTemplatedEmail({ to, templateName, variables }: EmailNotificationParams) {
    try {
        const template = await prisma.emailTemplate.findFirst({
            where: {
                name: templateName,
                isActive: true
            }
        });

        if (!template) {
            console.error(`Email template "${templateName}" not found`);
            return false;
        }

        // Replace variables in subject and body
        let subject = template.subject;
        let body = template.body;

        Object.entries(variables).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            subject = subject.replace(new RegExp(placeholder, 'g'), value);
            body = body.replace(new RegExp(placeholder, 'g'), value);
        });

        await sendEmail({
            to,
            subject,
            html: body,
            text: body.replace(/<[^>]*>?/gm, '') // Strip HTML tags for plain text version
        });

        return true;
    } catch (error) {
        console.error('Error sending templated email:', error);
        return false;
    }
}

/**
 * Send submission acknowledgment email
 */
export async function sendSubmissionAcknowledgment({ articleId, recipientEmail, recipientName }: ManuscriptNotificationParams) {
    const article = await prisma.article.findUnique({
        where: { id: articleId },
        include: {
            journal: true
        }
    });

    if (!article) return false;

    return sendTemplatedEmail({
        to: recipientEmail,
        templateName: 'submission_acknowledgment',
        variables: {
            authorName: recipientName || 'Author',
            manuscriptTitle: article.title,
            manuscriptId: article.manuscriptId || article.id,
            journalName: article.journal.name,
            submissionDate: new Date(article.submissionDate).toLocaleDateString()
        }
    });
}

/**
 * Send status change notification
 */
export async function sendStatusChangeNotification({
    articleId,
    recipientEmail,
    recipientName,
    newStatus
}: ManuscriptNotificationParams & { newStatus: string }) {
    const article = await prisma.article.findUnique({
        where: { id: articleId },
        include: {
            journal: true
        }
    });

    if (!article) return false;

    const statusMessages: Record<string, string> = {
        'UNDER_REVIEW': 'Your manuscript is now under peer review.',
        'REVISION_REQUIRED': 'Revisions are required for your manuscript.',
        'ACCEPTED': 'Congratulations! Your manuscript has been accepted.',
        'REJECTED': 'We regret to inform you that your manuscript has been rejected.',
        'PUBLISHED': 'Your manuscript has been published!'
    };

    return sendTemplatedEmail({
        to: recipientEmail,
        templateName: 'status_change',
        variables: {
            authorName: recipientName || 'Author',
            manuscriptTitle: article.title,
            manuscriptId: article.manuscriptId || article.id,
            journalName: article.journal.name,
            newStatus: newStatus.replace(/_/g, ' '),
            statusMessage: statusMessages[newStatus] || 'Your manuscript status has been updated.'
        }
    });
}

/**
 * Send revision request notification
 */
export async function sendRevisionRequest({ articleId, recipientEmail, recipientName }: ManuscriptNotificationParams) {
    const article = await prisma.article.findUnique({
        where: { id: articleId },
        include: {
            journal: true,
            reviews: {
                where: { status: 'COMPLETED' },
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        }
    });

    if (!article) return false;

    return sendTemplatedEmail({
        to: recipientEmail,
        templateName: 'revision_request',
        variables: {
            authorName: recipientName || 'Author',
            manuscriptTitle: article.title,
            manuscriptId: article.manuscriptId || article.id,
            journalName: article.journal.name,
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString() // 30 days from now
        }
    });
}

/**
 * Send reviewer invitation
 */
export async function sendReviewerInvitation({
    articleId,
    reviewerEmail,
    reviewerName,
    dueDate
}: {
    articleId: string;
    reviewerEmail: string;
    reviewerName: string;
    dueDate: Date;
}) {
    const article = await prisma.article.findUnique({
        where: { id: articleId },
        include: {
            journal: true
        }
    });

    if (!article) return false;

    return sendTemplatedEmail({
        to: reviewerEmail,
        templateName: 'reviewer_invitation',
        variables: {
            reviewerName,
            manuscriptTitle: article.title,
            manuscriptId: article.manuscriptId || article.id,
            journalName: article.journal.name,
            abstract: article.abstract || 'No abstract available',
            dueDate: dueDate.toLocaleDateString()
        }
    });
}

/**
 * Send co-author invitation
 */
export async function sendCoAuthorInvitation({
    articleId,
    coAuthorEmail,
    coAuthorName,
    inviterName,
    token
}: {
    articleId: string;
    coAuthorEmail: string;
    coAuthorName: string;
    inviterName: string;
    token: string;
}) {
    const article = await prisma.article.findUnique({
        where: { id: articleId },
        include: {
            journal: true
        }
    });

    if (!article) return false;

    const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/author/coauthor/accept?token=${token}`;

    return sendTemplatedEmail({
        to: coAuthorEmail,
        templateName: 'coauthor_invitation',
        variables: {
            coAuthorName: coAuthorName || 'Colleague',
            inviterName,
            manuscriptTitle: article.title,
            journalName: article.journal.name,
            acceptUrl
        }
    });
}

/**
 * Send publication notification
 */
export async function sendPublicationNotification({ articleId, recipientEmail, recipientName }: ManuscriptNotificationParams) {
    const article = await prisma.article.findUnique({
        where: { id: articleId },
        include: {
            journal: true
        }
    });

    if (!article) return false;

    return sendTemplatedEmail({
        to: recipientEmail,
        templateName: 'publication_notification',
        variables: {
            authorName: recipientName || 'Author',
            manuscriptTitle: article.title,
            journalName: article.journal.name,
            doi: article.doi || 'To be assigned',
            publicationDate: article.publicationDate?.toLocaleDateString() || new Date().toLocaleDateString()
        }
    });
}

/**
 * Send reminder email
 */
export async function sendReminder({
    to,
    recipientName,
    subject,
    message,
    actionUrl
}: {
    to: string;
    recipientName: string;
    subject: string;
    message: string;
    actionUrl?: string;
}) {
    return sendTemplatedEmail({
        to,
        templateName: 'reminder',
        variables: {
            recipientName,
            subject,
            message,
            actionUrl: actionUrl || '#'
        }
    });
}
