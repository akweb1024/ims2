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
            const data = payload.order?.entity || payload.payment?.entity;
            const notes = data.notes || {};

            if (notes.type === 'COURSE_ENROLLMENT' && notes.courseId && notes.userId) {
                const { courseId, userId } = notes;

                // Activate Enrollment & Log Payment
                const result = await prisma.$transaction(async (tx) => {
                    const enrollment = await tx.courseEnrollment.upsert({
                        where: { userId_courseId: { userId, courseId } },
                        update: { status: 'ACTIVE', enrolledAt: new Date() },
                        create: { courseId, userId, status: 'ACTIVE' }
                    });

                    // Avoid duplicate payments if verify endpoint already ran
                    const existingPayment = await tx.payment.findUnique({
                        where: { razorpayPaymentId: data.id || data.payment_id }
                    });

                    if (!existingPayment) {
                        await tx.payment.create({
                            data: {
                                amount: (data.amount_paid || data.amount) / 100,
                                currency: data.currency || 'INR',
                                paymentDate: new Date(),
                                razorpayOrderId: data.order_id || data.id,
                                razorpayPaymentId: data.payment_id || data.id,
                                status: 'captured',
                                paymentMethod: data.method || 'razorpay_webhook',
                                notes: `Webhook: Course Enrollment (UserID: ${userId})`,
                                metadata: JSON.stringify(data)
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
