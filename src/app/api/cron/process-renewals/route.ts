import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail, EmailTemplates } from '@/lib/email';
import { createNotification } from '@/lib/system-notifications';

/**
 * API to process subscription renewals
 * Triggers: 90, 60, 30 days before expiry
 * This should ideally be called by a CRON job (e.g. daily at 00:00)
 */
export async function POST(req: NextRequest) {
    try {
        // Basic Security: Check for a Cron Key if in production
        const authHeader = req.headers.get('authorization');
        if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const intervals = [90, 60, 30];
        const results: any[] = [];

        for (const days of intervals) {
            const targetDate = new Date();
            targetDate.setDate(now.getDate() + days);

            // Start of day and end of day for the target date
            const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

            // Find subscriptions expiring on exactly this day
            const expiringSubs = await prisma.subscription.findMany({
                where: {
                    endDate: {
                        gte: startOfDay,
                        lte: endOfDay
                    },
                    status: 'ACTIVE',
                    autoRenew: false // Don't remind if auto-renew is on? Or maybe remind anyway?
                },
                include: {
                    customerProfile: true,
                    items: { include: { journal: true } }
                }
            });

            for (const sub of expiringSubs) {
                const journalName = sub.items[0]?.journal?.name || 'Journal';
                const template = EmailTemplates.renewalReminder(
                    sub.customerProfile.name,
                    journalName,
                    days,
                    sub.id
                );

                // 1. Send Email
                await sendEmail({
                    to: sub.customerProfile.primaryEmail,
                    ...template
                });

                // 2. Create In-App Notification
                await createNotification({
                    userId: sub.customerProfile.userId,
                    title: 'Subscription Expiring Soon',
                    message: `Your subscription for ${journalName} expires in ${days} days. Renew now!`,
                    type: 'WARNING',
                    link: `/dashboard/crm/subscriptions/${sub.id}`
                });

                // 3. Log Communication
                await prisma.communicationLog.create({
                    data: {
                        customerProfileId: sub.customerProfile.id,
                        channel: 'EMAIL',
                        subject: `Automatic Renewal Reminder (${days} days)`,
                        notes: `System generated reminder for ${journalName} subscription expiring on ${sub.endDate.toLocaleDateString()}.`,
                        type: 'EMAIL',
                        outcome: 'sent'
                    }
                });

                results.push({ subId: sub.id, days });
            }
        }

        return NextResponse.json({
            success: true,
            remindersSent: results.length,
            details: results
        });

    } catch (error: any) {
        console.error('Renewal reminder processing error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
