import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/nextauth';
import prisma from '@/lib/prisma';

// GET - Fetch all journal indexings
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const isActive = searchParams.get('isActive');
        const tier = searchParams.get('tier');

        const indexings = await prisma.journalIndexing.findMany({
            where: {
                ...(isActive !== null && { isActive: isActive === 'true' }),
                ...(tier && { tier })
            },
            include: {
                _count: {
                    select: { journals: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(indexings);
    } catch (error) {
        console.error('Error fetching journal indexings:', error);
        return NextResponse.json({ error: 'Failed to fetch indexings' }, { status: 500 });
    }
}

// POST - Create new journal indexing
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
        const { name, code, description, tier, isActive } = body;

        if (!name || !code) {
            return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
        }

        const indexing = await prisma.journalIndexing.create({
            data: {
                name,
                code: code.toUpperCase(),
                description,
                tier,
                isActive: isActive !== undefined ? isActive : true
            }
        });

        return NextResponse.json(indexing, { status: 201 });
    } catch (error: any) {
        console.error('Error creating journal indexing:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Indexing with this name or code already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create indexing' }, { status: 500 });
    }
}

// PATCH - Update journal indexing
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
        const { id, name, code, description, tier, isActive } = body;

        if (!id) {
            return NextResponse.json({ error: 'Indexing ID is required' }, { status: 400 });
        }

        const indexing = await prisma.journalIndexing.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(code && { code: code.toUpperCase() }),
                ...(description !== undefined && { description }),
                ...(tier !== undefined && { tier }),
                ...(isActive !== undefined && { isActive })
            }
        });

        return NextResponse.json(indexing);
    } catch (error: any) {
        console.error('Error updating journal indexing:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Indexing not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to update indexing' }, { status: 500 });
    }
}
