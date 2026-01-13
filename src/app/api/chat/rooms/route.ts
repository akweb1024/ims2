import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const rooms = await prisma.chatRoom.findMany({
            where: {
                participants: {
                    some: { userId: decoded.id }
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                role: true,
                                name: true,
                                departmentId: true,
                                department: {
                                    select: {
                                        name: true
                                    }
                                },
                                customerProfile: {
                                    select: {
                                        name: true,
                                        organizationName: true,
                                        customerType: true
                                    }
                                },
                                employeeProfile: {
                                    select: {
                                        designation: true
                                    }
                                }
                            }
                        }
                    }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return NextResponse.json(rooms);
    } catch (error: any) {
        console.error('Chat Rooms GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { participantIds, name, isGroup, roomId } = body;

        // Role-based validation for group creation
        if (isGroup) {
            const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'];
            if (!allowedRoles.includes(decoded.role)) {
                return NextResponse.json({
                    error: 'Only administrators, managers, and team leaders can create group chats'
                }, { status: 403 });
            }
        }

        if (roomId) {
            // Join existing room
            const room = await prisma.chatRoom.findUnique({
                where: { id: roomId }
            });
            if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

            // Add participants
            const existingParticipants = await prisma.chatParticipant.findMany({
                where: { roomId }
            });
            const existingUserIds = existingParticipants.map((p: any) => p.userId);
            const newUserIds = participantIds.filter((id: string) => !existingUserIds.includes(id));

            if (newUserIds.length > 0) {
                await prisma.chatRoom.update({
                    where: { id: roomId },
                    data: {
                        participants: {
                            create: newUserIds.map((userId: string) => ({ userId }))
                        }
                    }
                });
            }
            return NextResponse.json(room);
        }

        if (!participantIds || !Array.isArray(participantIds)) {
            return NextResponse.json({ error: 'Participants are required' }, { status: 400 });
        }

        // Add the creator if not in list
        const uniqueParticipants = Array.from(new Set([...participantIds, decoded.id]));

        // If not group, check if a 1:1 room already exists
        if (!isGroup && uniqueParticipants.length === 2) {
            const existingRoom = await prisma.chatRoom.findFirst({
                where: {
                    isGroup: false,
                    AND: [
                        { participants: { some: { userId: uniqueParticipants[0] } } },
                        { participants: { some: { userId: uniqueParticipants[1] } } }
                    ]
                }
            });

            if (existingRoom) return NextResponse.json(existingRoom);
        }

        const room = await prisma.chatRoom.create({
            data: {
                name: name || null,
                isGroup: !!isGroup,
                companyId: (decoded as any).companyId || null,
                participants: {
                    create: uniqueParticipants.map(userId => ({
                        userId
                    }))
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: { id: true, email: true, role: true }
                        }
                    }
                }
            }
        });

        return NextResponse.json(room);
    } catch (error: any) {
        console.error('Chat Rooms POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
