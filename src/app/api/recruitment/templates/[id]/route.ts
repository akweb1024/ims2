import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: Request, context: any) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Await params correctly in Next.js 15+
        const params = await context.params;
        const id = params.id;

        const template = await prisma.screeningTemplate.findUnique({
            where: { id }
        });

        if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

        return NextResponse.json(template);
    } catch (error) {
        console.error('Fetch Template Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PUT(request: Request, context: any) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const params = await context.params;
        const id = params.id;
        const data = await request.json();

        const current = await prisma.screeningTemplate.findUnique({ where: { id } });
        if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

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
    } catch (error) {
        console.error('Update Template Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: any) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const params = await context.params;
        const id = params.id;
        
        await prisma.screeningTemplate.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Template Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
