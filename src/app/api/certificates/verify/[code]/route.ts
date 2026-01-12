import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';

export async function GET(req: NextRequest, context: { params: Promise<{ code: string }> }) {
    try {
        const params = await context.params;
        const { code } = params;

        const certificate = await prisma.certificate.findUnique({
            where: { verificationCode: code },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                },
                enrollment: {
                    include: {
                        course: {
                            select: {
                                title: true,
                                description: true
                            }
                        }
                    }
                }
            }
        });

        if (!certificate) {
            return NextResponse.json({
                valid: false,
                message: 'Certificate not found'
            }, { status: 404 });
        }

        return NextResponse.json({
            valid: true,
            certificate: {
                verificationCode: certificate.verificationCode,
                issuedAt: certificate.issuedAt,
                recipientName: certificate.user.name,
                courseName: certificate.enrollment.course.title,
                courseDescription: certificate.enrollment.course.description
            }
        });
    } catch (error) {
        return createErrorResponse(error);
    }
}
