import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const emailTemplates = [
    {
        name: 'submission_acknowledgment',
        subject: 'Manuscript Submission Acknowledgment - {{manuscriptId}}',
        body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Submission Acknowledgment</h2>
                <p>Dear {{authorName}},</p>
                <p>Thank you for submitting your manuscript to <strong>{{journalName}}</strong>.</p>
                
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Manuscript ID:</strong> {{manuscriptId}}</p>
                    <p style="margin: 5px 0;"><strong>Title:</strong> {{manuscriptTitle}}</p>
                    <p style="margin: 5px 0;"><strong>Submission Date:</strong> {{submissionDate}}</p>
                </div>
                
                <p>Your manuscript is now undergoing initial review. We will notify you of any updates.</p>
                <p>You can track your submission status in your author dashboard.</p>
                
                <p>Best regards,<br>{{journalName}} Editorial Team</p>
            </div>
        `,
        variables: ['authorName', 'manuscriptTitle', 'manuscriptId', 'journalName', 'submissionDate'],
        category: 'SUBMISSION'
    },
    {
        name: 'status_change',
        subject: 'Manuscript Status Update - {{manuscriptId}}',
        body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Manuscript Status Update</h2>
                <p>Dear {{authorName}},</p>
                <p>The status of your manuscript has been updated.</p>
                
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Manuscript ID:</strong> {{manuscriptId}}</p>
                    <p style="margin: 5px 0;"><strong>Title:</strong> {{manuscriptTitle}}</p>
                    <p style="margin: 5px 0;"><strong>New Status:</strong> <span style="color: #2563eb;">{{newStatus}}</span></p>
                </div>
                
                <p>{{statusMessage}}</p>
                <p>Please log in to your dashboard for more details.</p>
                
                <p>Best regards,<br>{{journalName}} Editorial Team</p>
            </div>
        `,
        variables: ['authorName', 'manuscriptTitle', 'manuscriptId', 'journalName', 'newStatus', 'statusMessage'],
        category: 'SUBMISSION'
    },
    {
        name: 'revision_request',
        subject: 'Revision Required - {{manuscriptId}}',
        body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f59e0b;">Revision Required</h2>
                <p>Dear {{authorName}},</p>
                <p>The reviewers have completed their assessment of your manuscript and have requested revisions.</p>
                
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Manuscript ID:</strong> {{manuscriptId}}</p>
                    <p style="margin: 5px 0;"><strong>Title:</strong> {{manuscriptTitle}}</p>
                    <p style="margin: 5px 0;"><strong>Revision Deadline:</strong> {{deadline}}</p>
                </div>
                
                <p>Please log in to your dashboard to view the reviewer comments and submit your revised manuscript.</p>
                <p>We look forward to receiving your revised submission.</p>
                
                <p>Best regards,<br>{{journalName}} Editorial Team</p>
            </div>
        `,
        variables: ['authorName', 'manuscriptTitle', 'manuscriptId', 'journalName', 'deadline'],
        category: 'REVIEW'
    },
    {
        name: 'reviewer_invitation',
        subject: 'Invitation to Review - {{journalName}}',
        body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Invitation to Review</h2>
                <p>Dear {{reviewerName}},</p>
                <p>We would like to invite you to review a manuscript for <strong>{{journalName}}</strong>.</p>
                
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Manuscript ID:</strong> {{manuscriptId}}</p>
                    <p style="margin: 5px 0;"><strong>Title:</strong> {{manuscriptTitle}}</p>
                    <p style="margin: 5px 0;"><strong>Review Deadline:</strong> {{dueDate}}</p>
                </div>
                
                <p><strong>Abstract:</strong></p>
                <p style="background: #f9fafb; padding: 10px; border-left: 3px solid #2563eb;">{{abstract}}</p>
                
                <p>Please log in to accept or decline this invitation.</p>
                
                <p>Best regards,<br>{{journalName}} Editorial Team</p>
            </div>
        `,
        variables: ['reviewerName', 'manuscriptTitle', 'manuscriptId', 'journalName', 'abstract', 'dueDate'],
        category: 'REVIEW'
    },
    {
        name: 'coauthor_invitation',
        subject: 'Co-Author Invitation - {{manuscriptTitle}}',
        body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Co-Author Invitation</h2>
                <p>Dear {{coAuthorName}},</p>
                <p><strong>{{inviterName}}</strong> has invited you to be a co-author on a manuscript submission to <strong>{{journalName}}</strong>.</p>
                
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Manuscript Title:</strong> {{manuscriptTitle}}</p>
                    <p style="margin: 5px 0;"><strong>Journal:</strong> {{journalName}}</p>
                </div>
                
                <p>Please click the button below to accept or decline this invitation:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{acceptUrl}}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Review Invitation</a>
                </div>
                
                <p>This invitation will expire in 7 days.</p>
                
                <p>Best regards,<br>{{journalName}} Editorial Team</p>
            </div>
        `,
        variables: ['coAuthorName', 'inviterName', 'manuscriptTitle', 'journalName', 'acceptUrl'],
        category: 'SUBMISSION'
    },
    {
        name: 'publication_notification',
        subject: 'Your Manuscript Has Been Published!',
        body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #10b981;">Congratulations! Your Manuscript is Published</h2>
                <p>Dear {{authorName}},</p>
                <p>We are pleased to inform you that your manuscript has been published in <strong>{{journalName}}</strong>.</p>
                
                <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Title:</strong> {{manuscriptTitle}}</p>
                    <p style="margin: 5px 0;"><strong>Journal:</strong> {{journalName}}</p>
                    <p style="margin: 5px 0;"><strong>DOI:</strong> {{doi}}</p>
                    <p style="margin: 5px 0;"><strong>Publication Date:</strong> {{publicationDate}}</p>
                </div>
                
                <p>Your article is now available online and will be indexed in major databases.</p>
                <p>Thank you for choosing {{journalName}} for your research publication.</p>
                
                <p>Best regards,<br>{{journalName}} Editorial Team</p>
            </div>
        `,
        variables: ['authorName', 'manuscriptTitle', 'journalName', 'doi', 'publicationDate'],
        category: 'PUBLICATION'
    },
    {
        name: 'reminder',
        subject: 'Reminder: {{subject}}',
        body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f59e0b;">Reminder</h2>
                <p>Dear {{recipientName}},</p>
                <p>This is a friendly reminder regarding:</p>
                
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>{{subject}}</strong></p>
                    <p>{{message}}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{actionUrl}}" style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Take Action</a>
                </div>
                
                <p>Thank you for your attention to this matter.</p>
            </div>
        `,
        variables: ['recipientName', 'subject', 'message', 'actionUrl'],
        category: 'SUBMISSION'
    }
];

async function seedEmailTemplates() {
    console.log('🌱 Seeding email templates...');

    for (const template of emailTemplates) {
        await prisma.emailTemplate.upsert({
            where: { name: template.name },
            update: template,
            create: template
        });
        console.log(`✅ Created/Updated template: ${template.name}`);
    }

    console.log('✨ Email templates seeded successfully!');
}

seedEmailTemplates()
    .catch((e) => {
        console.error('Error seeding email templates:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
