import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser().catch(() => null);
        const { searchParams } = new URL(req.url);
        const showAll = searchParams.get('all') === 'true';

        let where: any = { status: 'OPEN' };

        if (showAll && user && ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            where = {}; // Managers can see all status
            if (user.role !== 'SUPER_ADMIN') {
                where.companyId = user.companyId;
            }
        }

        const jobs = await prisma.jobPosting.findMany({
            where,
            include: {
                company: { select: { name: true } },
                _count: { select: { applications: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(jobs);
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
        const { title, description, requirements, location, salaryRange, type, examQuestions } = body;

        const job = await prisma.jobPosting.create({
            data: {
                companyId: user.companyId || '',
                title,
                description,
                requirements,
                location,
                salaryRange,
                type,
                exam: {
                    create: {
                        questions: examQuestions || [],
                    }
                }
            }
        });

        return NextResponse.json(job);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { id, title, description, requirements, location, salaryRange, type, status } = body;

        const job = await prisma.jobPosting.update({
            where: { id },
            data: {
                title,
                description,
                requirements,
                location,
                salaryRange,
                type,
                status // OPEN, CLOSED, DRAFT
            }
        });

        return NextResponse.json(job);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
