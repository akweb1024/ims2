import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const application = await prisma.jobApplication.findFirst({
            where: { applicantEmail: user.email },
            include: {
                jobPosting: {
                    include: {
                        company: { select: { name: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const profile = await prisma.employeeProfile.findUnique({
            where: { userId: user.id },
            include: { documents: true }
        });

        return NextResponse.json({
            application,
            profile
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
