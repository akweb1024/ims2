import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function GET(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user || !user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const campaigns = await (prisma as any).marketingCampaign.findMany({
            where: { companyId: user.companyId },
            include: {
                audience: true,
                template: { select: { id: true, name: true, subject: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(campaigns);
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
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
        const { name, description, audienceId, templateId, startDate, endDate, status } = body;

        const campaign = await (prisma as any).marketingCampaign.create({
            data: {
                companyId: user.companyId,
                name,
                description,
                audienceId,
                templateId,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                status: status || 'DRAFT'
            }
        });

        return NextResponse.json(campaign);
    } catch (error) {
        console.error('Error creating campaign:', error);
        return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }
}
