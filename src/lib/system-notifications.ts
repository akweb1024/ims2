import { prisma } from './prisma';
import webpush from 'web-push';
import { sendEmail } from './email';
import { sendWhatsApp } from './whatsapp';

const vapidKeys = {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    privateKey: process.env.VAPID_PRIVATE_KEY!,
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
    webpush.setVapidDetails(
        'mailto:admin@stm.com',
        vapidKeys.publicKey,
        vapidKeys.privateKey
    );
}

type NotificationChannel = 'IN_APP' | 'PUSH' | 'EMAIL' | 'WHATSAPP';
type NotificationCategory = 'GENERAL' | 'ONBOARDING' | 'OFFER_LETTER' | 'EXIT' | 'HR_DOCS';

interface NotificationPayload {
    userId: string;
    title: string;
    message: string;
    type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER' | 'CHAT' | 'TICKET';
    link?: string | null;
    channels?: NotificationChannel[];
    category?: NotificationCategory;
    // Specific overrides
    emailHtml?: string;
    whatsappMessage?: string; // If different from main message
}

export async function createNotification({
    userId,
    title,
    message,
    type = 'INFO',
    link = null,
    channels = ['IN_APP', 'PUSH'], // Default channels
    category = 'GENERAL'
}: NotificationPayload) {
    try {
        // 1. IN_APP (Always create db record if IN_APP is requested or default)
        let notificationRecord;
        if (channels.includes('IN_APP')) {
            notificationRecord = await prisma.notification.create({
                data: {
                    userId,
                    title,
                    message,
                    type,
                    link
                }
            });
        }

        // Fetch User Contact Details if external channels are needed
        if (channels.includes('EMAIL') || channels.includes('WHATSAPP') || channels.includes('PUSH')) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { employeeProfile: true }
            });

            if (user) {
                // Determine Routing Logic
                const isPersonalDocs = ['ONBOARDING', 'OFFER_LETTER', 'EXIT', 'HR_DOCS'].includes(category);

                // Email Routing
                // Priority: Specific Email based on category -> User's Login Email (Fallback)
                let targetEmail = user.email; // Default to login email
                if (user.employeeProfile) {
                    if (isPersonalDocs && user.employeeProfile.personalEmail) {
                        targetEmail = user.employeeProfile.personalEmail;
                    } else if (!isPersonalDocs && user.employeeProfile.officialEmail) {
                        targetEmail = user.employeeProfile.officialEmail;
                    }
                }

                // Phone Routing
                let targetPhone = user.employeeProfile?.phoneNumber || null; // Default to personal Phone
                if (user.employeeProfile) {
                    if (!isPersonalDocs && user.employeeProfile.officePhone) {
                        targetPhone = user.employeeProfile.officePhone;
                    }
                }

                // 2. PUSH
                if (channels.includes('PUSH')) {
                    await sendPushNotification(userId, title, message, link);
                }

                // 3. EMAIL
                if (channels.includes('EMAIL') && targetEmail) {
                    await sendEmail({
                        to: targetEmail,
                        subject: title,
                        text: message,
                        html: `
                            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                                <h2 style="color: #2563eb;">${title}</h2>
                                <p>${message}</p>
                                ${link ? `<a href="${process.env.NEXT_PUBLIC_APP_URL}${link}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Details</a>` : ''}
                                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                                <p style="font-size: 12px; color: #666;">
                                    Sent to: ${targetEmail} (${isPersonalDocs ? 'Personal' : 'Official'})
                                </p>
                            </div>
                        `
                    });
                }

                // 4. WHATSAPP
                if (channels.includes('WHATSAPP') && targetPhone) {
                    // Only send personal WhatsApps for personal categories if strictly required, 
                    // but usually WhatsApp is personal. The prompt implies "personal number wahats".
                    // We use targetPhone which logic selects personal for personal docs.

                    await sendWhatsApp({
                        to: targetPhone,
                        message: `*${title}*\n${message}\n${link ? `Link: ${process.env.NEXT_PUBLIC_APP_URL}${link}` : ''}`
                    });
                }
            }
        }

        return notificationRecord;
    } catch (error) {
        console.error('Failed to dispatch notifications:', error);
    }
}

async function sendPushNotification(userId: string, title: string, body: string, link: string | null) {
    try {
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId }
        });

        if (subscriptions.length === 0) return;

        const payload = JSON.stringify({
            title,
            body,
            icon: '/icon-192x192.png',
            data: { url: link || '/dashboard' }
        });

        const results = await Promise.allSettled(
            subscriptions.map((sub: any) =>
                webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth
                        }
                    },
                    payload
                )
            )
        );

        // Remove failed subscriptions
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.status === 'rejected') {
                const sub = subscriptions[i];
                if ((result.reason as any).statusCode === 410 || (result.reason as any).statusCode === 404) {
                    await prisma.pushSubscription.delete({
                        where: { id: sub.id }
                    });
                }
            }
        }
    } catch (error) {
        console.error('Push notification error:', error);
    }
}

export async function notifySupportTeam(companyId: string | null, title: string, message: string, link: string) {
    if (!companyId) return;

    const staff = await prisma.user.findMany({
        where: {
            companyId,
            role: {
                in: ['ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE', 'SUPER_ADMIN']
            }
        } as any,
        select: { id: true }
    });

    for (const member of staff) {
        await createNotification({
            userId: member.id,
            title,
            message,
            type: 'TICKET',
            link
        });
    }
}
