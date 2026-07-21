import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { canAccessAllCompanies } from '@/lib/company-scope';

const RECRUITER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER'];

/**
 * A user may act on a template only when it belongs to their company, unless they hold
 * all-company clearance (SUPER_ADMIN / ALL_COMPANIES module). Cross-tenant access is
 * reported as 404 so template existence is not leaked across companies.
 */
function canAccessTemplate(user: any, templateCompanyId: string | null): boolean {
    if (canAccessAllCompanies(user)) return true;
    return !!user.companyId && templateCompanyId === user.companyId;
}

export const GET = authorizedRoute(RECRUITER_ROLES, async (_req: NextRequest, user, context) => {
    const params = await context.params;
    const id = params.id;

    const template = await prisma.screeningTemplate.findUnique({ where: { id } });

    if (!template || !canAccessTemplate(user, template.companyId)) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(template);
});

export const PUT = authorizedRoute(RECRUITER_ROLES, async (req: NextRequest, user, context) => {
    const params = await context.params;
    const id = params.id;
    const data = await req.json();

    const current = await prisma.screeningTemplate.findUnique({ where: { id } });
    if (!current || !canAccessTemplate(user, current.companyId)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.screeningTemplate.update({
        where: { id },
        data: {
            title: data.title,
            jobRoleId: data.jobRoleId,
            department: data.department,
            jobType: data.jobType,
            version: current.version + 1,
            categories: data.categories || [],
            questions: data.questions || [],
            weights: data.weights || {}
        }
    });

    return NextResponse.json(updated);
});

export const DELETE = authorizedRoute(RECRUITER_ROLES, async (_req: NextRequest, user, context) => {
    const params = await context.params;
    const id = params.id;

    const current = await prisma.screeningTemplate.findUnique({ where: { id } });
    if (!current || !canAccessTemplate(user, current.companyId)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.screeningTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
});
