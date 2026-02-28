import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function GET(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user || !user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const templates = await (prisma as any).emailTemplate.findMany({
            where: { companyId: user.companyId },
            include: { _count: { select: { campaigns: true } } },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(templates);
    } catch (error) {
        console.error('Error fetching templates:', error);
        return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user || !user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { name, subject, htmlBody, designState } = body;

        const template = await (prisma as any).emailTemplate.create({
            data: {
                companyId: user.companyId,
                name,
                subject,
                htmlBody,
                designState: designState || {}
            }
        });

        return NextResponse.json(template);
    } catch (error) {
        console.error('Error creating template:', error);
        return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }
}
