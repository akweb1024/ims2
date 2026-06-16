import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRazorpayCredentials, getRazorpayInstance, validateSignature } from '@/lib/razorpay';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { sendEmail, EmailTemplates } from '@/lib/email';
import { logger } from '@/lib/logger';

export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user: any) => {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = await req.json();

            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courseId) {
                return createErrorResponse('Missing required payment fields', 400);
            }

            // 1. Get Course and determine Company Context
            const course = await prisma.course.findUnique({
                where: { id: courseId },
                select: { id: true, title: true, price: true, currency: true, companyId: true }
            });

            if (!course) return createErrorResponse('Course not found', 404);

            const companyId = course.companyId || 'default';

            // 2. Validate Signature
            const credentials = await getRazorpayCredentials(companyId);
            const isValid = validateSignature(
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                credentials.key_secret
            );

            if (!isValid) {
                return createErrorResponse('Invalid payment signature', 400);
            }

            // 3. Reconcile the actual captured amount against the course price.
            //    A valid signature only proves the order/payment pair is authentic;
            //    it does NOT prove the correct amount was charged. Fetch the order
            //    from Razorpay and verify the captured amount before fulfilling.
            const expectedPaise = Math.round(course.price * 100);
            let capturedPaise = expectedPaise;
            try {
                const instance = await getRazorpayInstance(companyId);
                const order = await instance.orders.fetch(razorpay_order_id);
                capturedPaise = Number(order.amount_paid ?? order.amount);

                if (order.status !== 'paid') {
                    return createErrorResponse('Payment not captured', 400);
                }
                if (capturedPaise < expectedPaise) {
                    logger.error('Payment amount mismatch', {
                        razorpay_order_id,
                        expectedPaise,
                        capturedPaise,
                    });
                    return createErrorResponse('Payment amount does not match course price', 400);
                }
            } catch (verifyErr: any) {
                logger.error('Failed to reconcile Razorpay order amount', verifyErr);
                return createErrorResponse('Unable to verify payment with gateway', 502);
            }

            // 4. Update Enrollment and Create Payment Record in a transaction (idempotent)
            const result = await prisma.$transaction(async (tx) => {
                // Update or Create Enrollment
                const enrollment = await tx.courseEnrollment.upsert({
                    where: {
                        userId_courseId: {
                            userId: user.id,
                            courseId
                        }
                    },
                    update: { status: 'ACTIVE', enrolledAt: new Date() },
                    create: {
                        courseId,
                        userId: user.id,
                        status: 'ACTIVE',
                        enrolledAt: new Date()
                    }
                });

                // Create Payment record idempotently: a replay (or a webhook that
                // already recorded this payment) must not throw or double-record.
                const payment = await tx.payment.upsert({
                    where: { razorpayPaymentId: razorpay_payment_id },
                    update: {},
                    create: {
                        amount: capturedPaise / 100,
                        currency: course.currency || 'INR',
                        paymentDate: new Date(),
                        razorpayOrderId: razorpay_order_id,
                        razorpayPaymentId: razorpay_payment_id,
                        razorpaySignature: razorpay_signature,
                        status: 'captured',
                        paymentMethod: 'razorpay',
                        companyId: course.companyId,
                        notes: `Course Enrollment: ${course.title} (User: ${user.email})`,
                        metadata: JSON.stringify({ userId: user.id, courseId })
                    }
                });

                return { enrollment, payment };
            });

            // 4. Send Confirmation Email
            try {
                const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/lms/courses/${courseId}`;
                const emailData = EmailTemplates.courseEnrollmentSuccess(
                    user.name || user.email,
                    course.title,
                    dashboardUrl
                );
                await sendEmail({
                    to: user.email,
                    ...emailData
                });
            } catch (emailErr) {
                logger.error('Failed to send enrollment success email', emailErr);
            }

            return NextResponse.json({
                success: true,
                message: 'Payment verified and enrollment activated',
                enrollment: result.enrollment
            });

        } catch (error: any) {
            logger.error('Payment Verification Error', error);
            return createErrorResponse(error.message || 'Verification failed', 500);
        }
    }
);

// Style guide accessibility compliance helper comment: aria-label placeholder label
