import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    try {
        const { code } = await params;

        const certificate = await prisma.certificate.findUnique({
            where: { verificationCode: code },
            include: { user: { select: { name: true, email: true } }, enrollment: { include: { course: true } } }
        });

        if (!certificate) return NextResponse.json({ valid: false, message: 'Invalid Certificate' }, { status: 404 });

        return NextResponse.json({
            valid: true,
            certificate: {
                verificationCode: certificate.verificationCode,
                issuedAt: certificate.issuedAt,
                recipientName: certificate.recipientName || certificate.user.name || certificate.user.email,
                title: certificate.title || (certificate.enrollment?.course?.title ? `Course Completion: ${certificate.enrollment.course.title}` : 'Certificate'),
                description: certificate.description,
                type: certificate.type
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
