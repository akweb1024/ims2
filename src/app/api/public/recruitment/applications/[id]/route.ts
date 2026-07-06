import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';
import { verifyApplicationStatusToken } from '@/lib/application-status-token';

// Public "track my application" endpoint. Guarded by the per-application
// HMAC token handed out at apply time — returns only candidate-safe fields
// (never internal notes, ratings or AI scores).
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = new URL(req.url).searchParams.get('token');

        if (!verifyApplicationStatusToken(id, token)) {
            return NextResponse.json({ error: 'Invalid or missing tracking token' }, { status: 401 });
        }

        const application = await prisma.jobApplication.findUnique({
            where: { id },
            select: {
                id: true,
                applicantName: true,
                status: true,
                createdAt: true,
                jobPosting: {
                    select: { title: true, location: true, type: true },
                },
            },
        });

        if (!application) {
            return NextResponse.json({ error: 'Application not found' }, { status: 404 });
        }

        return NextResponse.json({
            ...application,
            // Let candidates resume a pending assessment from the tracker.
            examLink: application.status === 'EXAM_PENDING' ? `/careers/exam?appId=${application.id}` : null,
        });
    } catch (error) {
        return createErrorResponse(error);
    }
}
