import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// Generate a random verification code
function generateVerificationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
        if ((i + 1) % 4 === 0 && i < 11) code += '-';
    }
    return code;
}

export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { enrollmentId } = body;

            // Get enrollment
            const enrollment = await prisma.courseEnrollment.findUnique({
                where: { id: enrollmentId },
                include: {
                    course: true,
                    user: true
                }
            });

            if (!enrollment) {
                return createErrorResponse('Enrollment not found', 404);
            }

            // Check if user owns this enrollment
            if (enrollment.userId !== user.id) {
                return createErrorResponse('Unauthorized', 403);
            }

            // Check if course is completed
            if (enrollment.progress < 100) {
                return createErrorResponse('Course not completed yet', 400);
            }

            // Check if certificate already exists
            const existing = await prisma.certificate.findUnique({
                where: { enrollmentId }
            });

            if (existing) {
                return NextResponse.json({
                    success: true,
                    message: 'Certificate already exists',
                    certificate: existing
                });
            }

            // Generate certificate
            const verificationCode = generateVerificationCode();

            // In a real implementation, you would generate a PDF here
            // For now, we'll just create a placeholder URL
            const certificateUrl = `/api/certificates/${enrollmentId}/download`;

            const certificate = await prisma.certificate.create({
                data: {
                    enrollmentId,
                    userId: user.id,
                    courseId: enrollment.courseId,
                    verificationCode,
                    certificateUrl
                }
            });

            // Update enrollment
            await prisma.courseEnrollment.update({
                where: { id: enrollmentId },
                data: {
                    certificateUrl,
                    status: 'COMPLETED'
                }
            });

            return NextResponse.json({
                success: true,
                message: 'Certificate generated successfully',
                certificate
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// Get user's certificates
export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const certificates = await prisma.certificate.findMany({
                where: { userId: user.id },
                include: {
                    enrollment: {
                        include: {
                            course: {
                                select: {
                                    id: true,
                                    title: true,
                                    thumbnailUrl: true
                                }
                            }
                        }
                    }
                },
                orderBy: { issuedAt: 'desc' }
            });

            return NextResponse.json(certificates);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
