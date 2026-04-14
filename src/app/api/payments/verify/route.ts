import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRazorpayCredentials, validateSignature } from '@/lib/razorpay';
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

            // 3. Update Enrollment and Create Payment Record in a transaction
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

                // Create Payment record
                const payment = await tx.payment.create({
                    data: {
                        amount: course.price,
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
