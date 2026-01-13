import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Verify Authentication
        const decoded = await getAuthenticatedUser();
        if (!decoded || !decoded.role) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // 2. Fetch Subscription with details
        const subscription = await prisma.subscription.findUnique({
            where: { id },
            include: {
                customerProfile: true,
                items: {
                    include: {
                        journal: true,
                        plan: true
                    }
                },
                invoices: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                },
                agency: true,
                salesExecutive: {
                    select: {
                        id: true,
                        email: true,
                        customerProfile: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        if (!subscription) {
            return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
        }

        // 3. Authorization check for CUSTOMER role
        if (decoded.role === 'CUSTOMER') {
            const customerProfile = await prisma.customerProfile.findUnique({
                where: { userId: decoded.id }
            });
            if (!customerProfile || subscription.customerProfileId !== customerProfile.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        return NextResponse.json(subscription);

    } catch (error: any) {
        console.error('Subscription Detail API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Verify Authentication
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'EXECUTIVE', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { status, autoRenew } = body;

        // 2. Fetch current subscription to check status
        const currentSubscription = await prisma.subscription.findUnique({
            where: { id },
            include: { invoices: true }
        });

        if (!currentSubscription) {
            return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
        }

        // 3. Update Subscription with potential invoice generation
        const updatedSubscription = await prisma.$transaction(async (tx: any) => {
            // Perform the update
            const sub = await tx.subscription.update({
                where: { id },
                data: {
                    ...(status && { status }),
                    ...(autoRenew !== undefined && { autoRenew })
                }
            });

            // If moving to PENDING_PAYMENT and no UNPAID invoice exists, create one
            if (status === 'PENDING_PAYMENT' && !currentSubscription.invoices.some((inv: any) => inv.status !== 'CANCELLED')) {
                const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                await tx.invoice.create({
                    data: {
                        subscriptionId: id,
                        invoiceNumber,
                        currency: sub.currency,
                        amount: sub.total,
                        tax: 0,
                        total: sub.total,
                        status: 'UNPAID',
                        dueDate: new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000)
                    }
                });
                console.log(`Auto-generated invoice ${invoiceNumber} for subscription ${id}`);
            }

            return sub;
        });

        // 4. Log Audit
        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'update',
                entity: 'subscription',
                entityId: id,
                changes: JSON.stringify(body)
            }
        });

        // 5. Notify Customer (If status changed)
        if (status && status !== currentSubscription.status) {
            const customer = await prisma.customerProfile.findUnique({
                where: { id: updatedSubscription.customerProfileId },
                select: { userId: true }
            });

            if (customer?.userId) {
                const { createNotification } = await import('@/lib/notifications');
                let title = 'Subscription Updated';
                let message = `Your subscription status has been changed to ${status.replace('_', ' ')}.`;

                if (status === 'PENDING_PAYMENT') {
                    title = 'Subscription Approved';
                    message = 'Your subscription request has been approved! Please proceed with the payment to activate.';
                } else if (status === 'ACTIVE') {
                    title = 'Subscription Activated';
                    message = 'Your subscription is now active! Thank you for choosing STM Journals.';
                }

                await createNotification({
                    userId: customer.userId,
                    title,
                    message,
                    type: status === 'ACTIVE' ? 'SUCCESS' : 'INFO',
                    link: `/dashboard/subscriptions/${id}`
                });

                // Send Email Notification
                const profile = await prisma.customerProfile.findUnique({
                    where: { id: updatedSubscription.customerProfileId },
                    select: { name: true, primaryEmail: true }
                });

                if (profile) {
                    const { sendEmail, EmailTemplates } = await import('@/lib/email');
                    let template;

                    if (status === 'PENDING_PAYMENT') {
                        template = EmailTemplates.subscriptionApproved(profile.name, id);
                    } else if (status === 'ACTIVE') {
                        // We could add a specific "Subscription Activated" template here
                        template = {
                            subject: 'Your Subscription is Now Active! - STM Journals',
                            text: `Dear ${profile.name}, your subscription ${id} is now active.`,
                            html: `<p>Dear ${profile.name},</p><p>Your subscription is now fully active.</p>`
                        };
                    }

                    if (template) {
                        await sendEmail({
                            to: profile.primaryEmail,
                            ...template
                        });
                    }
                }
            }
        }

        return NextResponse.json(updatedSubscription);

    } catch (error: any) {
        console.error('Subscription Update API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
