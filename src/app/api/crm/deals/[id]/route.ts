
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const deal = await prisma.deal.findFirst({
            where: {
                id,
                companyId: user.companyId
            },
            include: {
                customer: {
                    select: { id: true, name: true, organizationName: true, leadStatus: true }
                },
                owner: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        if (!deal) {
            return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
        }

        return NextResponse.json(deal);

    } catch (error) {
        console.error('Failed to fetch deal:', error);
        return NextResponse.json({ error: 'Failed to fetch deal' }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        const existing = await prisma.deal.findFirst({
            where: { id, companyId: user.companyId }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
        }

        const updatedDeal = await prisma.deal.update({
            where: { id },
            data: {
                title: body.title,
                value: body.value !== undefined ? parseFloat(body.value) : undefined,
                currency: body.currency,
                stage: body.stage,
                customerId: body.customerId,
                ownerId: body.ownerId,
                expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : undefined,
                notes: body.notes
            }
        });

        return NextResponse.json(updatedDeal);

    } catch (error) {
        console.error('Failed to update deal:', error);
        return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const deal = await prisma.deal.findFirst({
            where: { id, companyId: user.companyId }
        });

        if (!deal) {
            return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
        }

        await prisma.deal.delete({
            where: { id }
        });

        return NextResponse.json({ message: 'Deal deleted successfully' });

    } catch (error) {
        console.error('Failed to delete deal:', error);
        return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 });
    }
}
