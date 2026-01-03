import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const ticket = await (prisma as any).supportTicket.findUnique({
            where: { id },
            include: {
                customerProfile: {
                    select: { id: true, name: true, primaryEmail: true, userId: true }
                },
                assignedTo: {
                    select: { id: true, email: true, role: true }
                },
                chatRoom: {
                    select: { id: true }
                }
            }
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // Access Control
        const userCompanyId = (decoded as any).companyId;
        if (decoded.role !== 'SUPER_ADMIN' && ticket.companyId !== userCompanyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (decoded.role === 'CUSTOMER') {
            const profile = await prisma.customerProfile.findUnique({ where: { userId: decoded.id } });
            if (ticket.customerProfileId !== profile?.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        return NextResponse.json(ticket);
    } catch (error: any) {
        console.error('Support Ticket GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'MANAGER', 'SALES_EXECUTIVE', 'ADMIN'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { status, assignedToId, priority } = body;

        const ticket = await (prisma as any).supportTicket.findUnique({
            where: { id },
            include: { customerProfile: { select: { userId: true } } }
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // Multi-tenancy check
        if (decoded.role !== 'SUPER_ADMIN' && ticket.companyId !== (decoded as any).companyId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const updatedTicket = await (prisma as any).supportTicket.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(assignedToId !== undefined && { assignedToId }),
                ...(priority && { priority })
            }
        });

        // 1. Notify Customer of Status change
        if (status && status !== ticket.status) {
            await createNotification({
                userId: ticket.customerProfile.userId,
                title: `Ticket Status Updated`,
                message: `Your ticket "${ticket.subject}" is now ${status.replace('_', ' ')}.`,
                type: 'TICKET',
                link: `/dashboard/support`
            });
        }

        // 2. Notify Assigned Staff
        if (assignedToId && assignedToId !== ticket.assignedToId) {
            await createNotification({
                userId: assignedToId,
                title: `New Ticket Assigned`,
                message: `You have been assigned to ticket: ${ticket.subject}`,
                type: 'TICKET',
                link: `/dashboard/tickets`
            });

            // If assigned, add the staff member to the chat room participants
            if (ticket.chatRoomId) {
                await (prisma as any).chatParticipant.upsert({
                    where: {
                        roomId_userId: {
                            roomId: ticket.chatRoomId,
                            userId: assignedToId
                        }
                    },
                    update: {},
                    create: {
                        roomId: ticket.chatRoomId,
                        userId: assignedToId
                    }
                });
            }
        }

        return NextResponse.json(updatedTicket);
    } catch (error: any) {
        console.error('Support Ticket PATCH Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
