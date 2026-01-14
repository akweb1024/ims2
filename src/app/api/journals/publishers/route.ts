import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/nextauth';
import prisma from '@/lib/prisma';

// GET - Fetch all publishers
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const isActive = searchParams.get('isActive');

        const publishers = await prisma.publisher.findMany({
            where: isActive !== null ? { isActive: isActive === 'true' } : {},
            include: {
                _count: {
                    select: { journals: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(publishers);
    } catch (error) {
        console.error('Error fetching publishers:', error);
        return NextResponse.json({ error: 'Failed to fetch publishers' }, { status: 500 });
    }
}

// POST - Create new publisher
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        if (!['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { name, code, country, website, email, isActive } = body;

        if (!name || !code) {
            return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
        }

        const publisher = await prisma.publisher.create({
            data: {
                name,
                code: code.toUpperCase(),
                country,
                website,
                email,
                isActive: isActive !== undefined ? isActive : true
            }
        });

        return NextResponse.json(publisher, { status: 201 });
    } catch (error: any) {
        console.error('Error creating publisher:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Publisher with this name or code already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create publisher' }, { status: 500 });
    }
}

// PATCH - Update publisher
export async function PATCH(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        if (!['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { id, name, code, country, website, email, isActive } = body;

        if (!id) {
            return NextResponse.json({ error: 'Publisher ID is required' }, { status: 400 });
        }

        const publisher = await prisma.publisher.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(code && { code: code.toUpperCase() }),
                ...(country !== undefined && { country }),
                ...(website !== undefined && { website }),
                ...(email !== undefined && { email }),
                ...(isActive !== undefined && { isActive })
            }
        });

        return NextResponse.json(publisher);
    } catch (error: any) {
        console.error('Error updating publisher:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Publisher not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to update publisher' }, { status: 500 });
    }
}
