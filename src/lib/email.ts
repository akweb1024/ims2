import nodemailer from 'nodemailer';
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';

interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html: string;
}

const createTransporter = () => {
    // 1. Try AWS SES if keys are present
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        console.log('📧 configuring AWS SES transport...');
        const ses = new SESClient({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
        return nodemailer.createTransport({
            SES: { ses, aws: { SendRawEmailCommand } },
        } as any);
    }

    // 2. Fallback to Standard SMTP
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

const transporter = createTransporter();

export async function sendEmail({ to, subject, text, html }: EmailOptions) {
    const hasAws = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
    const hasSmtp = process.env.EMAIL_USER && process.env.EMAIL_PASS;

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
        const info = await transporter.sendMail({
            from: `"STM Journals" <${process.env.EMAIL_FROM || 'no-reply@stm.com'}>`,
            to,
            subject,
            text,
            html,
        });

        console.log('Message sent: %s', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email send error:', error);
        return { success: false, error };
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
    })
};
