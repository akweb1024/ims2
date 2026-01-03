import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '10');

        const announcements = await prisma.announcement.findMany({
            where: {
                isActive: true,
                OR: [
                    { targetRole: 'ALL' },
                    { targetRole: user.role.includes('CUSTOMER') ? 'CUSTOMER' : 'STAFF' }
                ]
            },
            include: {
                author: {
                    select: {
                        email: true,
                        role: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        return NextResponse.json(announcements);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { title, content, targetRole, priority, expiresAt } = body;

        const announcement = await prisma.announcement.create({
            data: {
                title,
                content,
                targetRole: targetRole || 'ALL',
                priority: priority || 'NORMAL',
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                authorId: user.id
            }
        });

        return NextResponse.json(announcement);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
