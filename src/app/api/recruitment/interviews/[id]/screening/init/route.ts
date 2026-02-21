import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

// Initialize a screening for an interview
export async function POST(request: Request, context: any) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const params = await context.params;
        const interviewId = params.id;
        const data = await request.json(); // { templateId: string }

        if (!data.templateId) {
            return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
        }

        const interview = await prisma.recruitmentInterview.findUnique({
            where: { id: interviewId },
            include: { application: true, screening: true }
        });

        if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
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
}
