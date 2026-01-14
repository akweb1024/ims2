import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import prisma from '@/lib/prisma';

// GET - Fetch all journal domains
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const isActive = searchParams.get('isActive');

        const domains = await prisma.journalDomain.findMany({
            where: isActive !== null ? { isActive: isActive === 'true' } : {},
            include: {
                _count: {
                    select: { journals: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(domains);
    } catch (error) {
        console.error('Error fetching journal domains:', error);
        return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 });
    }
}

// POST - Create new journal domain
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        if (!['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { name, code, description, isActive } = body;

        if (!name || !code) {
            return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
        }

        const domain = await prisma.journalDomain.create({
            data: {
                name,
                code: code.toUpperCase(),
                description,
                isActive: isActive !== undefined ? isActive : true
            }
        });

        return NextResponse.json(domain, { status: 201 });
    } catch (error: any) {
        console.error('Error creating journal domain:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Domain with this name or code already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create domain' }, { status: 500 });
    }
}

// PATCH - Update journal domain
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        if (!['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { id, name, code, description, isActive } = body;

        if (!id) {
            return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 });
        }

        const domain = await prisma.journalDomain.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(code && { code: code.toUpperCase() }),
                ...(description !== undefined && { description }),
                ...(isActive !== undefined && { isActive })
            }
        });

        return NextResponse.json(domain);
    } catch (error: any) {
        console.error('Error updating journal domain:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to update domain' }, { status: 500 });
    }
}
