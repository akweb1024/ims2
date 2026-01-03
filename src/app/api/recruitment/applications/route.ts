import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const applications = await prisma.jobApplication.findMany({
            where: user.role === 'SUPER_ADMIN' ? {} : {
                jobPosting: { companyId: user.companyId }
            },
            include: {
                jobPosting: true,
                examAttempt: true,
                interviews: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(applications);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
