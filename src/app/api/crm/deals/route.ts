
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const stage = searchParams.get('stage'); // Optional filter

        const isGlobal = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(user.role);

        const where: any = {
            companyId: user.companyId,
            ...(!isGlobal && { ownerId: user.id }),
            ...(stage && { stage: stage })
        };

        const deals = await prisma.deal.findMany({
            where,
            include: {
                customer: {
                    select: { id: true, name: true, organizationName: true }
                },
                owner: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return NextResponse.json(deals);

    } catch (error) {
        console.error('Failed to fetch deals:', error);
        return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        if (!body.title || !body.customerId) {
            return NextResponse.json({ error: 'Title and Customer are required' }, { status: 400 });
        }

        const deal = await prisma.deal.create({
            data: {
                companyId: user.companyId,
                title: body.title,
                value: parseFloat(body.value || '0'),
                currency: body.currency || 'INR',
                stage: body.stage || 'DISCOVERY',
                customerId: body.customerId,
                ownerId: body.ownerId || user.id,
                expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
                notes: body.notes
            }
        });

        return NextResponse.json(deal);

    } catch (error) {
        console.error('Failed to create deal:', error);
        return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
    }
}
