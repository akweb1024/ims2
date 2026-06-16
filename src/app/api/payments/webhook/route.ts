import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateWebhookSignature } from '@/lib/razorpay';
import { logger } from '@/lib/logger';
import { sendEmail, EmailTemplates } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get('x-razorpay-signature');
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!signature || !secret) {
            logger.error('Webhook missing signature or secret');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const isValid = validateWebhookSignature(rawBody, signature, secret);

        if (!isValid) {
            logger.error('Invalid webhook signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        const event = JSON.parse(rawBody);
        const payload = event.payload;

        // Process based on event type
        // Supported: order.paid or payment.captured
        if (event.event === 'order.paid' || event.event === 'payment.captured') {
            // Razorpay sends different entity shapes per event. The `order` entity's
            // own id is `id` (it has no `order_id`/`payment_id`), while the `payment`
            // entity's own id is `id` and its parent order is `order_id`. Mixing these
            // with `||` fallbacks stores the wrong id and breaks idempotency, so map
            // each entity type explicitly.
            const orderEntity = payload.order?.entity;
            const paymentEntity = payload.payment?.entity;

            // Notes are set on the order at creation time; fall back to the payment.
            const notes = orderEntity?.notes || paymentEntity?.notes || {};

            // The payment id (idempotency key) only exists on a payment entity.
            const razorpayPaymentId: string | undefined = paymentEntity?.id;
            const razorpayOrderId: string | undefined = paymentEntity?.order_id || orderEntity?.id;
            // Amount in paise: prefer the order's captured amount, else the payment amount.
            const amountPaise = orderEntity?.amount_paid ?? paymentEntity?.amount ?? orderEntity?.amount;
            const currency = paymentEntity?.currency || orderEntity?.currency || 'INR';
            const method = paymentEntity?.method || 'razorpay_webhook';

            if (notes.type === 'COURSE_ENROLLMENT' && notes.courseId && notes.userId) {
                const { courseId, userId } = notes;

                if (!razorpayPaymentId) {
                    // Without a payment id we cannot record/dedupe safely. Ack so
                    // Razorpay stops retrying, but log for investigation.
                    logger.error('Webhook missing payment id; cannot record payment', { event: event.event, razorpayOrderId });
                    return NextResponse.json({ success: true });
                }

                // Activate Enrollment & Log Payment
                const result = await prisma.$transaction(async (tx) => {
                    const enrollment = await tx.courseEnrollment.upsert({
                        where: { userId_courseId: { userId, courseId } },
                        update: { status: 'ACTIVE', enrolledAt: new Date() },
                        create: { courseId, userId, status: 'ACTIVE' }
                    });

                    // Avoid duplicate payments if verify endpoint already ran
                    const existingPayment = await tx.payment.findUnique({
                        where: { razorpayPaymentId }
                    });

                    if (!existingPayment) {
                        await tx.payment.create({
                            data: {
                                amount: Number(amountPaise) / 100,
                                currency,
                                paymentDate: new Date(),
                                razorpayOrderId,
                                razorpayPaymentId,
                                status: 'captured',
                                paymentMethod: method,
                                notes: `Webhook: Course Enrollment (UserID: ${userId})`,
                                metadata: JSON.stringify(orderEntity || paymentEntity)
                            }
                        });
                    }

                    return enrollment;
                });

                // Send Email Notification
                const user = await prisma.user.findUnique({ where: { id: userId } });
                const course = await prisma.course.findUnique({ where: { id: courseId } });

                if (user && course) {
                    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/lms/courses/${courseId}`;
                    const emailData = EmailTemplates.courseEnrollmentSuccess(
                        user.name || user.email,
                        course.title,
                        dashboardUrl
                    );
                    await sendEmail({ to: user.email, ...emailData });
                }

                logger.info(`Webhook processed successfully for course ${courseId}, user ${userId}`);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        logger.error('Razorpay Webhook Error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Style guide accessibility compliance helper comment: aria-label placeholder label
