import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function GET(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user || !user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const audiences = await (prisma as any).campaignAudience.findMany({
            where: { companyId: user.companyId },
            include: { _count: { select: { campaigns: true } } },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(audiences);
    } catch (error) {
        console.error('Error fetching audiences:', error);
        return NextResponse.json({ error: 'Failed to fetch audiences' }, { status: 500 });
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
        const { name, description, queryFilter } = body;

        const audience = await (prisma as any).campaignAudience.create({
            data: {
                companyId: user.companyId,
                name,
                description,
                queryFilter: queryFilter || {},
            }
        });

        return NextResponse.json(audience);
    } catch (error) {
        console.error('Error creating audience:', error);
        return NextResponse.json({ error: 'Failed to create audience' }, { status: 500 });
    }
}
