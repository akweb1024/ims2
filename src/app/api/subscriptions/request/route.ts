import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate
        const decoded = await getAuthenticatedUser();
        if (!decoded || decoded.role !== 'CUSTOMER') {
            return NextResponse.json({ error: 'Unauthorized. Only customers can request subscriptions.' }, { status: 403 });
        }

        // 2. Get Customer Profile
        const customerProfile = await prisma.customerProfile.findUnique({
            where: { userId: decoded.id }
        });

        if (!customerProfile) {
            return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
        }

        const body = await request.json();
        const {
            startDate,
            endDate,
            items, // list of { journalId, planId, quantity }
            autoRenew,
            currency = 'INR'
        } = body;

        // 3. Validation
        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'Missing required items' }, { status: 400 });
        }

        // 4. Calculate Totals (for display in request)
        let total = 0;
        const subscriptionItems: any[] = [];

        for (const item of items) {
            const plan = await prisma.plan.findUnique({
                where: { id: item.planId },
                include: { journal: true }
            });

            if (!plan) return NextResponse.json({ error: `Plan ${item.planId} not found` }, { status: 404 });

            const price = currency === 'USD' ? plan.priceUSD : plan.priceINR;
            const itemPrice = (price || 0) * (item.quantity || 1);
            total += itemPrice;

            subscriptionItems.push({
                journalId: plan.journalId,
                planId: plan.id,
                quantity: item.quantity || 1,
                price: price || 0
            });
        }

        // 5. Create Subscription with REQUESTED status
        const subscription = await prisma.subscription.create({
            data: {
                customerProfileId: customerProfile.id,
                companyId: customerProfile.companyId,
                startDate: new Date(startDate || new Date()),
                endDate: new Date(endDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1))),
                salesChannel: 'DIRECT',
                autoRenew: autoRenew || false,
                status: 'REQUESTED',
                currency,
                subtotal: total,
                total: total,
                items: {
                    create: subscriptionItems
                }
            },
            include: {
                items: true
            }
        });

        // 6. Log Audit
        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'request',
                entity: 'subscription',
                entityId: subscription.id,
                changes: JSON.stringify({ total, itemsCount: items.length, status: 'REQUESTED' })
            }
        });

        // 7. Create Communication Log (Inquiry)
        await prisma.communicationLog.create({
            data: {
                customerProfileId: customerProfile.id,
                type: 'INQUIRY',
                channel: 'WEB_PORTAL',
                subject: 'New Subscription Request',
                notes: `Customer requested a new subscription for ${items.length} journals. Total value: ${currency} ${total}`,
                outcome: 'pending-review'
            }
        });

        // 8. Notify Staff (Admins and Managers)
        const staffToNotify = await prisma.user.findMany({
            where: {
                role: { in: ['SUPER_ADMIN', 'MANAGER'] }
            },
            select: { id: true }
        });

        const { createNotification } = await import('@/lib/notifications');
        for (const staff of staffToNotify) {
            await createNotification({
                userId: staff.id,
                title: 'New Subscription Request',
                message: `${customerProfile.name} has requested a subscription for ${items.length} journals (${currency} ${total.toLocaleString()}).`,
                type: 'INFO',
                link: `/dashboard/crm/subscriptions/${subscription.id}`
            });
        }

        // 9. Send Email Confirmation to Customer
        const { sendEmail, EmailTemplates } = await import('@/lib/email');
        const template = EmailTemplates.subscriptionRequest(
            customerProfile.name,
            items.length,
            `${currency} ${total.toLocaleString()}`
        );

        await sendEmail({
            to: customerProfile.primaryEmail,
            ...template
        });

        return NextResponse.json({
            success: true,
            subscriptionId: subscription.id,
            message: 'Your subscription request has been submitted and is pending review.'
        });

    } catch (error: any) {
        console.error('Subscription Request Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            message: error.message
        }, { status: 500 });
    }
}
