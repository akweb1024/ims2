import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { canAccessAllCompanies } from '@/lib/company-scope';

const RECRUITER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER'];

export const GET = authorizedRoute(RECRUITER_ROLES, async (req: NextRequest, user) => {
    try {
        const { searchParams } = new URL(req.url);
        // Company-scoped users may only read their own company's templates,
        // regardless of any companyId passed in the query (was a cross-tenant read).
        const companyId = canAccessAllCompanies(user)
            ? (searchParams.get('companyId') || user.companyId)
            : user.companyId;

        const templates = await prisma.screeningTemplate.findMany({
            where: {
                companyId: companyId,
            },
            orderBy: { createdAt: 'desc' },
            include: { creator: { select: { name: true, email: true } } }
        });

        return NextResponse.json(templates);
    } catch (error) {
        console.error('Fetch Templates Error:', error);
        return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }
});

export const POST = authorizedRoute(RECRUITER_ROLES, async (req: NextRequest, user) => {
    try {
        const data = await req.json();

        const template = await prisma.screeningTemplate.create({
            data: {
                title: data.title,
                companyId: user.companyId,
                jobRoleId: data.jobRoleId,
                department: data.department,
                jobType: data.jobType,
                version: 1,
                categories: data.categories || [],
                questions: data.questions || [],
                weights: data.weights || {},
                createdBy: user.id
            }
        });

        return NextResponse.json(template);
    } catch (error) {
        console.error('Create Template Error:', error);
        return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }
});
