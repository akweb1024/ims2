import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const ticket = await prisma.iTSupportTicket.findUnique({
            where: { id: id },
            include: {
                requester: { select: { id: true, name: true, email: true } },
                assignedTo: { select: { id: true, name: true, email: true } },
                asset: { select: { id: true, name: true, type: true } }
            }
        });

        if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

        // Basic company check
        if (ticket.companyId !== (user as any).companyId && user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(ticket);
    } catch (error) {
        console.error('Fetch Ticket Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const existingTicket = await prisma.iTSupportTicket.findUnique({ where: { id: id } });

        if (!existingTicket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

        if (existingTicket.companyId !== (user as any).companyId && user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updatedTicket = await prisma.iTSupportTicket.update({
            where: { id: id },
            data: {
                title: body.title,
                description: body.description,
                priority: body.priority,
                status: body.status,
                category: body.category,
                resolution: body.resolution,
                assignedToId: body.assignedToId || null,
                assetId: body.assetId || null,
            }
        });

        return NextResponse.json(updatedTicket);
    } catch (error) {
        console.error('Update Ticket Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const existingTicket = await prisma.iTSupportTicket.findUnique({ where: { id: id } });
        if (!existingTicket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

        if (existingTicket.companyId !== (user as any).companyId && user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.iTSupportTicket.delete({ where: { id: id } });

        return NextResponse.json({ message: 'Ticket deleted successfully' });
    } catch (error) {
        console.error('Delete Ticket Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
