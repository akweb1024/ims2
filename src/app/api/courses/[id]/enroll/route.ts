import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

import { getRazorpayInstance } from '@/lib/razorpay';
 
// Self-enrollment endpoint for students
export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const courseId = id;
 
            // Check if course exists and is published
            const course = await prisma.course.findUnique({
                where: { id: courseId }
            });
 
            if (!course) {
                return createErrorResponse('Course not found', 404);
            }
 
            if (!course.isPublished) {
                return createErrorResponse('This course is not available for enrollment', 400);
            }
 
            // Check if already enrolled
            const existing = await prisma.courseEnrollment.findUnique({
                where: {
                    userId_courseId: {
                        userId: user.id,
                        courseId
                    }
                }
            });
 
            if (existing && existing.status === 'ACTIVE') {
                return NextResponse.json({
                    success: false,
                    message: 'You are already enrolled in this course',
                    enrollment: existing
                });
            }
 
            // Handle Payment for paid courses
            if (course.price > 0 && (!existing || existing.status !== 'ACTIVE')) {
                try {
                    // Use company-specific Razorpay instance if available, fallback to default
                    const companyId = course.companyId || 'default';
                    const razorpay = await getRazorpayInstance(companyId);
                    
                    const amountInPaise = Math.round(course.price * 100);
                    
                    const order = await razorpay.orders.create({
                        amount: amountInPaise,
                        currency: course.currency || 'INR',
                        receipt: `enroll_${user.id}_${courseId}_${Date.now()}`,
                        notes: {
                            courseId,
                            userId: user.id,
                            type: 'COURSE_ENROLLMENT'
                        }
                    });
 
                    // Create or update enrollment with PENDING status
                    const enrollment = await prisma.courseEnrollment.upsert({
                        where: {
                            userId_courseId: {
                                userId: user.id,
                                courseId
                            }
                        },
                        update: { status: 'PAYMENT_PENDING' },
                        create: {
                            courseId,
                            userId: user.id,
                            status: 'PAYMENT_PENDING'
                        }
                    });
 
                    return NextResponse.json({
                        success: true,
                        paymentRequired: true,
                        orderId: order.id,
                        amount: order.amount,
                        currency: order.currency,
                        key: (await razorpay as any).key_id || process.env.RAZORPAY_KEY_ID, // Frontend needs this
                        enrollment
                    });
                } catch (payError: any) {
                    logger.error('Razorpay order creation failed', payError);
                    return createErrorResponse('Failed to initialize payment. Please try again later.', 500);
                }
            }
 
            // Free enrollment or finalization
            const enrollment = await prisma.courseEnrollment.upsert({
                where: {
                    userId_courseId: {
                        userId: user.id,
                        courseId
                    }
                },
                update: { status: 'ACTIVE' },
                create: {
                    courseId,
                    userId: user.id,
                    status: 'ACTIVE'
                },
                include: {
                    course: {
                        select: {
                            id: true,
                            title: true,
                            thumbnailUrl: true
                        }
                    }
                }
            });
 
            return NextResponse.json({
                success: true,
                message: 'Successfully enrolled in the course',
                enrollment
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
