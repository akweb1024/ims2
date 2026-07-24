import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { canAccessAllCompanies } from '@/lib/company-scope';

const RECRUITER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER'];

// A screening belongs to the company of the job posting behind its interview.
function canAccessCompany(user: any, companyId: string | null): boolean {
    if (canAccessAllCompanies(user)) return true;
    return !!user.companyId && companyId === user.companyId;
}

// Initialize a screening for an interview
export const POST = authorizedRoute(RECRUITER_ROLES, async (req: NextRequest, user, context) => {
    try {
        const params = await context.params;
        const interviewId = params.id;
        const data = await req.json(); // { templateId: string }

        if (!data.templateId) {
            return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
        }

        const interview = await prisma.recruitmentInterview.findUnique({
            where: { id: interviewId },
            include: {
                application: { include: { jobPosting: { select: { companyId: true } } } },
                screening: true
            }
        });

        // 404 (not 403) on cross-tenant so we don't leak that the interview exists.
        if (!interview || !canAccessCompany(user, interview.application?.jobPosting?.companyId ?? null)) {
            return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
        }
        if (interview.screening) return NextResponse.json({ error: 'Screening already initialized' }, { status: 400 });

        const template = await prisma.screeningTemplate.findUnique({ where: { id: data.templateId } });
        if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

        // Create the screening draft
        const screening = await prisma.interviewScreening.create({
            data: {
                interviewId,
                applicationId: interview.applicationId,
                templateId: template.id,
                templateVersion: template.version,
                status: 'DRAFT'
            }
        });

        return NextResponse.json(screening);
    } catch (error) {
        console.error('Init Screening Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
});
