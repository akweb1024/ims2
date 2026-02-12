
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

        const lead = await prisma.customerProfile.findFirst({
            where: {
                id,
                companyId: user.companyId,
                leadStatus: { not: null }
            },
            include: {
                assignedTo: {
                    select: { id: true, name: true, email: true }
                },
                communications: {
                    orderBy: { date: 'desc' },
                    include: {
                        user: {
                            select: { id: true, name: true }
                        }
                    }
                },
                deals: {
                    orderBy: { updatedAt: 'desc' }
                }
            }
        });

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        return NextResponse.json(lead);

    } catch (error) {
        console.error('Failed to fetch lead:', error);
        return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 });
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

        // Safety check: ensure lead belongs to company
        const existing = await prisma.customerProfile.findFirst({
            where: { id, companyId: user.companyId }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        const updatedLead = await prisma.customerProfile.update({
            where: { id },
            data: {
                name: body.name,
                primaryEmail: body.primaryEmail,
                primaryPhone: body.primaryPhone,
                organizationName: body.organizationName,
                leadStatus: body.leadStatus,
                leadScore: body.leadScore,
                source: body.source,
                notes: body.notes,
                assignedToUserId: body.assignedToUserId
            }
        });

        return NextResponse.json(updatedLead);

    } catch (error) {
        console.error('Failed to update lead:', error);
        return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
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

        // Check ownership
        const lead = await prisma.customerProfile.findFirst({
            where: { id, companyId: user.companyId }
        });

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        await prisma.customerProfile.delete({
            where: { id }
        });

        return NextResponse.json({ message: 'Lead deleted successfully' });

    } catch (error) {
        console.error('Failed to delete lead:', error);
        return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
    }
}
