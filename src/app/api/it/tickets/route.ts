import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const companyId = (user as any).companyId;

        // If Not Admin/IT, only show own tickets
        const isITAdmin = ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN', 'IT_SUPPORT'].includes(user.role);

        const where: any = { companyId };
        if (!isITAdmin) {
            where.requesterId = user.id;
        }

        const tickets = await prisma.iTSupportTicket.findMany({
            where,
            include: {
                requester: { select: { name: true, email: true, department: { select: { name: true } } } },
                assignedTo: { select: { name: true } },
                asset: { select: { name: true, type: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(tickets);
    } catch (error) {
        console.error('Fetch IT Tickets Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { title, description, priority, category, assetId } = body;

        const ticket = await prisma.iTSupportTicket.create({
            data: {
                companyId: (user as any).companyId,
                requesterId: user.id,
                title,
                description,
                priority: priority || 'MEDIUM',
                category: category || 'HARDWARE',
                assetId: assetId || null,
                status: 'OPEN'
            }
        });

        return NextResponse.json(ticket);
    } catch (error) {
        console.error('Create IT Ticket Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN', 'IT_SUPPORT'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { id, status, assignedToId, resolution } = body;

        const ticket = await prisma.iTSupportTicket.update({
            where: { id },
            data: {
                status: status,
                ...(assignedToId !== undefined ? { assignedTo: assignedToId ? { connect: { id: assignedToId } } : { disconnect: true } } : {}),
                resolution: resolution || undefined
            }
        });

        return NextResponse.json(ticket);
    } catch (error) {
        console.error('Update IT Ticket Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
