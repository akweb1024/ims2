import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId') || user.companyId;

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
}

export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const data = await request.json();
        
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
}
