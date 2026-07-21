import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { canAccessAllCompanies } from '@/lib/company-scope';

const RECRUITER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER'];

// A screening belongs to the company of the job posting behind its interview. Users
// without all-company clearance may only act on screenings in their own company.
function canAccessCompany(user: any, companyId: string | null): boolean {
    if (canAccessAllCompanies(user)) return true;
    return !!user.companyId && companyId === user.companyId;
}

const companyScopedInclude = {
    interview: {
        include: { application: { include: { jobPosting: { select: { companyId: true } } } } },
    },
} as const;

export const GET = authorizedRoute(RECRUITER_ROLES, async (_req: NextRequest, user, context) => {
    const params = await context.params;
    const interviewId = params.id;

    const screening = await prisma.interviewScreening.findUnique({
        where: { interviewId },
        include: { template: true, responses: true, ...companyScopedInclude }
    });

    if (!screening || !canAccessCompany(user, screening.interview?.application?.jobPosting?.companyId ?? null)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(screening);
});

export const PATCH = authorizedRoute(RECRUITER_ROLES, async (req: NextRequest, user, context) => {
    const params = await context.params;
    const interviewId = params.id;
    const data = await req.json(); // { questionId, rating, checkboxStatus, notes, flags }

    const screening = await prisma.interviewScreening.findUnique({
        where: { interviewId },
        include: companyScopedInclude
    });
    if (!screening || !canAccessCompany(user, screening.interview?.application?.jobPosting?.companyId ?? null)) {
        return NextResponse.json({ error: 'Screening not found' }, { status: 404 });
    }
    if (screening.status === 'SUBMITTED') {
        return NextResponse.json({ error: 'Screening already submitted' }, { status: 400 });
    }

    // Upsert response
    const { questionId, ...responseFields } = data;

    const existingResponse = await prisma.screeningResponse.findFirst({
        where: { screeningId: screening.id, questionId }
    });

    let savedResponse;
    if (existingResponse) {
        savedResponse = await prisma.screeningResponse.update({
            where: { id: existingResponse.id },
            data: responseFields
        });
    } else {
        savedResponse = await prisma.screeningResponse.create({
            data: {
                screeningId: screening.id,
                questionId,
                ...responseFields
            }
        });
    }

    return NextResponse.json(savedResponse);
});
