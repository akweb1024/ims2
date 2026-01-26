import nodemailer from 'nodemailer';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html: string;
}

// Singleton transporter to avoid initialization issues during build
let transporterInstance: nodemailer.Transporter | null = null;

const getTransporter = () => {
    if (transporterInstance) return transporterInstance;

    // 1. Try AWS SES if keys are present (v3 with SESv2 client for Nodemailer 7+)
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        console.log('📧 configuring AWS SES transport (v2 client)...');
        const ses = new SESv2Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
        transporterInstance = nodemailer.createTransport({
            SES: { ses, aws: { SendEmailCommand } },
        } as any);
        return transporterInstance;
    }

    // 2. Fallback to Standard SMTP
    console.log('📧 configuring SMTP transport...');
    transporterInstance = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    return transporterInstance;
};

export async function sendEmail({ to, subject, text, html }: EmailOptions) {
    const hasAws = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
    const hasSmtp = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

    if (!hasAws && !hasSmtp) {
        console.log('-------------------------------------------');
        console.log('📧 MOCK EMAIL SENT (No credentials provided)');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log('Text content truncated...');
        console.log('-------------------------------------------');
        return { success: true, message: 'Mock email logged' };
    }

    try {
        const transporter = getTransporter();
        const info = await transporter.sendMail({
            from: `"STM Journals" <${process.env.EMAIL_FROM || 'no-reply@stm.com'}>`,
            to,
            subject,
            text,
            html,
        });

        console.log('📧 Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error: any) {
        console.error('❌ Email sending failed:', error);
        return { success: false, error: error.message };
    }
}

// Template Generators
export const EmailTemplates = {
    subscriptionRequest: (customerName: string, itemsCount: number, total: string) => ({
        subject: 'We have received your subscription request - STM Journals',
        text: `Dear ${customerName}, thank you for your request for ${itemsCount} journals. Total: ${total}. We will review and approve it shortly.`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h1 style="color: #2563eb;">Request Received</h1>
                <p>Dear <strong>${customerName}</strong>,</p>
                <p>Thank you for submitting a new subscription request to <strong>STM Journals</strong>.</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Journals:</strong> ${itemsCount}</p>
                    <p style="margin: 5px 0;"><strong>Estimated Total:</strong> ${total}</p>
                    <p style="margin: 5px 0;"><strong>Status:</strong> Pending Review</p>
                </div>
                <p>Our team is currently reviewing your request. You will receive an update once it is approved and ready for payment.</p>
                <p>Best regards,<br/>The STM Team</p>
            </div>
        `
    }),

    subscriptionApproved: (customerName: string, subId: string) => ({
        subject: 'Action Required: Your subscription has been approved! - STM Journals',
        text: `Dear ${customerName}, your subscription ${subId} has been approved. Please log in to complete payment.`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h1 style="color: #16a34a;">Subscription Approved</h1>
                <p>Dear <strong>${customerName}</strong>,</p>
                <p>Great news! Your subscription request has been approved.</p>
                <p>To activate your subscription, please log in to your dashboard and complete the payment for the generated invoice.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscriptions/${subId}" 
                       style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                       View Subscription & Pay
                    </a>
                </div>
                <p>Reference ID: ${subId}</p>
                <p>Best regards,<br/>The STM Team</p>
            </div>
        `
    }),

    paymentReceived: (customerName: string, amount: string, invoiceNum: string) => ({
        subject: `Payment Confirmation - ${invoiceNum} - STM Journals`,
        text: `Dear ${customerName}, we have received your payment of ${amount} for invoice ${invoiceNum}.`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h1 style="color: #16a34a;">Payment Confirmed</h1>
                <p>Dear <strong>${customerName}</strong>,</p>
                <p>This is to confirm that we have successfully received your payment.</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${invoiceNum}</p>
                    <p style="margin: 5px 0;"><strong>Amount Paid:</strong> ${amount}</p>
                    <p style="margin: 5px 0;"><strong>Status:</strong> Completed</p>
                </div>
                <p>Your subscription is now active. You can access your journals through the portal.</p>
                <p>Thank you for your business!</p>
                <p>Best regards,<br/>The STM Team</p>
            </div>
        `
    }),

    renewalReminder: (customerName: string, journalName: string, daysLeft: number, subId: string) => ({
        subject: `Attention: Your subscription to ${journalName} expires in ${daysLeft} days!`,
        text: `Dear ${customerName}, your subscription to ${journalName} will expire in ${daysLeft} days. Renew now to avoid interruption.`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h1 style="color: #ea580c;">Subscription Expiring Soon</h1>
                <p>Dear <strong>${customerName}</strong>,</p>
                <p>This is a reminder that your subscription for <strong>${journalName}</strong> is set to expire in <strong>${daysLeft} days</strong>.</p>
                <p>To ensure uninterrupted access to your research and journals, please renew your subscription today.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscriptions/${subId}" 
                       style="background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                       Renew Subscription Now
                    </a>
                </div>
                <p>Stay updated with the latest in ${journalName}!</p>
                <p>Best regards,<br/>The STM Team</p>
            </div>
        `
    }),

    reviewerAssignment: (reviewerName: string, articleTitle: string, journalName: string, dueDate: string, assignmentId: string) => ({
        subject: `New Review Assignment: ${articleTitle} - ${journalName}`,
        text: `Dear ${reviewerName}, you have been assigned a new manuscript titled "${articleTitle}" for review in ${journalName}. Due Date: ${dueDate}.`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h1 style="color: #2563eb;">New Review Assignment</h1>
                <p>Dear <strong>${reviewerName}</strong>,</p>
                <p>You have been selected to review a new manuscript for <strong>${journalName}</strong>.</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #2563eb;">
                    <p style="margin: 5px 0;"><strong>Manuscript:</strong> ${articleTitle}</p>
                    <p style="margin: 5px 0;"><strong>Journal:</strong> ${journalName}</p>
                    <p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDate}</p>
                </div>
                <p>Your expertise is vital to maintaining the high quality of our publications. Please log in to your dashboard to access the manuscript and submit your evaluation.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/reviewer/assignments/${assignmentId}" 
                       style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                       Review Manuscript
                    </a>
                </div>
                <p>Best regards,<br/>The Editorial Team</p>
            </div>
        `
    }),

    reviewSubmitted: (editorName: string, articleTitle: string, reviewerName: string, recommendation: string) => ({
        subject: `Review Submitted: ${articleTitle}`,
        text: `Dear Editor, ${reviewerName} has submitted their review for "${articleTitle}" with a recommendation of ${recommendation}.`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h1 style="color: #7c3aed;">New Review Report</h1>
                <p>Dear <strong>${editorName}</strong>,</p>
                <p>A review report has been submitted for a manuscript under your management.</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Manuscript:</strong> ${articleTitle}</p>
                    <p style="margin: 5px 0;"><strong>Reviewer:</strong> ${reviewerName}</p>
                    <p style="margin: 5px 0;"><strong>Recommendation:</strong> <span style="font-weight: bold; color: #7c3aed;">${recommendation}</span></p>
                </div>
                <p>Please log in to the editorial workflow to evaluate this report and make a decision.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/editorial" 
                       style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                       Go to Editorial Hub
                    </a>
                </div>
                <p>Best regards,<br/>The STM System</p>
            </div>
        `
    }),

    reportValidated: (reviewerName: string, articleTitle: string, journalName: string, certificateId: string) => ({
        subject: `Your Review Report has been Validated! - ${journalName}`,
        text: `Dear ${reviewerName}, your review for "${articleTitle}" has been validated. A certificate has been issued.`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h1 style="color: #16a34a;">Review Validated & Certified</h1>
                <p>Dear <strong>${reviewerName}</strong>,</p>
                <p>The editorial team has validated your review report for <strong>"${articleTitle}"</strong>.</p>
                <p>We sincerely appreciate your contribution to the scientific community. A digital certificate of excellence has been issued and added to your profile.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/reviewer/certificates" 
                       style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                       View My Certificate
                    </a>
                </div>
                <p>Certificate Reference: ${certificateId}</p>
                <p>Best regards,<br/>The Editorial Team</p>
            </div>
        `
    }),

    reportRejected: (reviewerName: string, articleTitle: string, reason: string) => ({
        subject: `Action Required: Your Review Report needs Revision - ${articleTitle}`,
        text: `Dear ${reviewerName}, your review for "${articleTitle}" requires some clarifications or revisions. Reason: ${reason}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h1 style="color: #dc2626;">Review Revision Requested</h1>
                <p>Dear <strong>${reviewerName}</strong>,</p>
                <p>The editorial team has reviewed your report for <strong>"${articleTitle}"</strong> and requires some additional details or clarifications.</p>
                <div style="background: #fef2f2; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #dc2626;">
                    <p style="margin: 5px 0;"><strong>Feedback:</strong> ${reason}</p>
                </div>
                <p>Please log in and update your report accordingly so we can proceed with the validation.</p>
                <p>Best regards,<br/>The Editorial Team</p>
            </div>
        `
    }),

    incrementManagerApproved: (employeeName: string, amount: string, percentage: string) => ({
        subject: `Salary Increment Approved by Manager - STM`,
        text: `Dear ${employeeName}, your salary increment of ${amount} (${percentage}) has been approved by your manager and is now pending admin approval.`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h1 style="color: #2563eb;">Increment Approved by Manager</h1>
                <p>Dear <strong>${employeeName}</strong>,</p>
                <p>Great news! Your salary increment request has been approved by your manager.</p>
                <div style="background: #eff6ff; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #2563eb;">
                    <p style="margin: 5px 0;"><strong>Increment Amount:</strong> ${amount}</p>
                    <p style="margin: 5px 0;"><strong>Percentage:</strong> ${percentage}</p>
                    <p style="margin: 5px 0;"><strong>Status:</strong> Pending Admin Approval</p>
                </div>
                <p>Your increment is now awaiting final approval from the admin team. You will be notified once the process is complete.</p>
                <p>Best regards,<br/>The HR Team</p>
            </div>
        `
    }),

    incrementApproved: (employeeName: string, amount: string, percentage: string, effectiveDate: string) => ({
        subject: `🎉 Salary Increment Approved! - STM`,
        text: `Dear ${employeeName}, congratulations! Your salary increment of ${amount} (${percentage}) has been fully approved and will be effective from ${effectiveDate}.`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h1 style="color: #16a34a;">🎉 Salary Increment Approved!</h1>
                <p>Dear <strong>${employeeName}</strong>,</p>
                <p>Congratulations! We are pleased to inform you that your salary increment has been fully approved.</p>
                <div style="background: #f0fdf4; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #16a34a;">
                    <p style="margin: 5px 0;"><strong>Increment Amount:</strong> ${amount}</p>
                    <p style="margin: 5px 0;"><strong>Percentage:</strong> ${percentage}</p>
                    <p style="margin: 5px 0;"><strong>Effective Date:</strong> ${effectiveDate}</p>
                    <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">APPROVED</span></p>
                </div>
                <p>Your new salary will be reflected in your payroll starting from the effective date mentioned above.</p>
                <p>Thank you for your continued dedication and hard work!</p>
                <p>Best regards,<br/>The HR Team</p>
            </div>
        `
    }),

    incrementRejected: (employeeName: string, rejectedBy: string, reason: string) => ({
        subject: `Salary Increment Update - STM`,
        text: `Dear ${employeeName}, your salary increment request has been rejected by ${rejectedBy}. Reason: ${reason}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h1 style="color: #dc2626;">Increment Request Update</h1>
                <p>Dear <strong>${employeeName}</strong>,</p>
                <p>We regret to inform you that your salary increment request has not been approved at this time.</p>
                <div style="background: #fef2f2; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #dc2626;">
                    <p style="margin: 5px 0;"><strong>Rejected By:</strong> ${rejectedBy}</p>
                    <p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>
                </div>
                <p>If you have any questions or would like to discuss this decision, please feel free to reach out to your manager or the HR department.</p>
                <p>Best regards,<br/>The HR Team</p>
            </div>
        `
    })
};
