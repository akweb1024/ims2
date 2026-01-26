import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createNotification } from '@/lib/system-notifications';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const roomId = searchParams.get('roomId');

        if (!roomId) return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });

        // Verify participant
        const isParticipant = await prisma.chatParticipant.findUnique({
            where: {
                roomId_userId: {
                    roomId,
                    userId: decoded.id
                }
            }
        });

        if (!isParticipant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const messages = await prisma.chatMessage.findMany({
            where: { roomId },
            include: {
                sender: {
                    select: { id: true, email: true, role: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        return NextResponse.json(messages);
    } catch (error: any) {
        console.error('Chat Messages GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { roomId, content } = body;

        if (!roomId || !content) {
            return NextResponse.json({ error: 'Room ID and content are required' }, { status: 400 });
        }

        // Verify participant
        const isParticipant = await prisma.chatParticipant.findUnique({
            where: {
                roomId_userId: {
                    roomId,
                    userId: decoded.id
                }
            }
        });

        if (!isParticipant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const message = await prisma.chatMessage.create({
            data: {
                roomId,
                content,
                senderId: decoded.id
            },
            include: {
                sender: {
                    select: { id: true, email: true, role: true }
                }
            }
        });

        // Update room's updatedAt for sorting
        await prisma.chatRoom.update({
            where: { id: roomId },
            data: { updatedAt: new Date() }
        });

        // Notify other participants
        const otherParticipants = await prisma.chatParticipant.findMany({
            where: { roomId, userId: { not: decoded.id } }
        });

        for (const p of otherParticipants) {
            await createNotification({
                userId: p.userId,
                title: `New Message`,
                message: `${decoded.email.split('@')[0]}: ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`,
                type: 'CHAT',
                link: `/dashboard/chat?roomId=${roomId}`
            });
        }

        return NextResponse.json(message);
    } catch (error: any) {
        console.error('Chat Messages POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
