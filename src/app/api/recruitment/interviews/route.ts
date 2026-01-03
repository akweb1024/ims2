import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch potential interviewers (Admins, Super Admins, Managers)
        const interviewers = await prisma.user.findMany({
            where: {
                role: { in: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
                companyId: user.companyId // Same company
            },
            select: { id: true, email: true, role: true }
        });

        return NextResponse.json(interviewers);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { applicationId, level, type, scheduledAt, interviewerId, result, feedback } = body;

        let interview;
        if (type === 'SCHEDULE') {
            interview = await prisma.recruitmentInterview.upsert({
                where: { applicationId_level: { applicationId, level } },
                update: { scheduledAt: new Date(scheduledAt), interviewerId, status: 'SCHEDULED' },
                create: { applicationId, level, scheduledAt: new Date(scheduledAt), interviewerId, status: 'SCHEDULED' }
            });

            // Set application status to currently interviewing level
            await prisma.jobApplication.update({
                where: { id: applicationId },
                data: { status: `INTERVIEW_L${level}` }
            });
        } else {
            // COMPLETED
            interview = await prisma.recruitmentInterview.update({
                where: { applicationId_level: { applicationId, level } },
                data: { result, feedback, status: 'COMPLETED' }
            });

            // Update application status
            let nextStatus = `INTERVIEW_L${level}`;
            if (result === 'PASSED') {
                if (level === 3) nextStatus = 'SELECTED';
                else nextStatus = `INTERVIEW_L${level + 1}`;
            } else if (result === 'FAILED') {
                nextStatus = 'REJECTED';
            }

            await prisma.jobApplication.update({
                where: { id: applicationId },
                data: { status: nextStatus }
            });
        }

        return NextResponse.json(interview);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
