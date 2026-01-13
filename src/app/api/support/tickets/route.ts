import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { notifySupportTeam } from '@/lib/notifications';

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { subject, description, priority } = body;

        if (!subject || !description) {
            return NextResponse.json({ error: 'Subject and description are required' }, { status: 400 });
        }

        // Get customer profile if user is a customer
        let customerProfileId = body.customerProfileId;
        let companyId = body.companyId;

        if (decoded.role === 'CUSTOMER') {
            const profile = await prisma.customerProfile.findUnique({
                where: { userId: decoded.id }
            });
            if (!profile) return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
            customerProfileId = profile.id;
            companyId = (profile as any).companyId;
        } else {
            // If staff creating for customer, they must provide customerProfileId
            if (!customerProfileId) return NextResponse.json({ error: 'customerProfileId is required for staff' }, { status: 400 });
            companyId = (decoded as any).companyId;
        }

        // 1. Create a Chat Room for this ticket
        const chatRoom = await (prisma as any).chatRoom.create({
            data: {
                name: `Support: ${subject}`,
                isGroup: true,
                companyId,
                participants: {
                    create: [
                        { userId: decoded.id } // Creator
                    ]
                }
            }
        });

        // 2. Create the Support Ticket
        const ticket = await (prisma as any).supportTicket.create({
            data: {
                subject,
                description,
                priority: priority || 'MEDIUM',
                status: 'OPEN',
                companyId,
                customerProfileId: customerProfileId,
                chatRoomId: chatRoom.id
            }
        });

        // 3. Post first message
        await (prisma as any).chatMessage.create({
            data: {
                roomId: chatRoom.id,
                senderId: decoded.id,
                content: `INITIAL INQUIRY:\n${description}`
            }
        });

        // 4. Notify Team
        await notifySupportTeam(
            companyId,
            `New Ticket: ${subject}`,
            `A new support ticket has been created by ${decoded.email}.`,
            `/dashboard/tickets`
        );

        return NextResponse.json(ticket);
    } catch (error: any) {
        console.error('Support Tickets POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const companyIdParam = searchParams.get('companyId');

        const where: any = {};

        // Multi-tenancy
        const userCompanyId = (decoded as any).companyId;
        if (decoded.role !== 'SUPER_ADMIN') {
            where.companyId = userCompanyId;
        } else if (companyIdParam) {
            where.companyId = companyIdParam;
        }

        // Role based filtering
        if (decoded.role === 'CUSTOMER') {
            where.customerProfile = { userId: decoded.id };
        } else if (decoded.role === 'EXECUTIVE') {
            where.OR = [
                { customerProfile: { assignedToUserId: decoded.id } },
                { assignedToId: decoded.id }
            ];
        }

        if (status) {
            where.status = status;
        }

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const [tickets, total, stats] = await Promise.all([
            (prisma as any).supportTicket.findMany({
                where,
                skip,
                take: limit,
                include: {
                    customerProfile: {
                        select: { id: true, name: true, primaryEmail: true }
                    },
                    assignedTo: {
                        select: { id: true, email: true }
                    },
                    chatRoom: {
                        select: { id: true }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            }),
            (prisma as any).supportTicket.count({ where }),
            (prisma as any).supportTicket.groupBy({
                by: ['status'],
                where: { companyId: where.companyId },
                _count: { id: true }
            })
        ]);

        return NextResponse.json({
            tickets,
            stats: stats.reduce((acc: any, curr: any) => ({ ...acc, [curr.status]: curr._count.id }), {}),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error('Support Tickets GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
