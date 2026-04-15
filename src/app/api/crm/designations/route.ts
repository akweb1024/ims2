import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';

        const designations = await prisma.globalDesignation.findMany({
            where: {
                isActive: true,
                ...(search && { name: { contains: search, mode: 'insensitive' } }),
            },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, level: true },
        });

        return NextResponse.json({ data: designations });
    } catch (error) {
        console.error('GET /api/crm/designations error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const name = String(body.name || '').trim();

        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        // Upsert so duplicates never fail
        const designation = await prisma.globalDesignation.upsert({
            where: { name },
            update: { isActive: true },
            create: {
                name,
                isActive: true,
                level: body.level ?? 1,
                expectedExperience: body.expectedExperience ?? 0,
            },
            select: { id: true, name: true, level: true },
        });

        return NextResponse.json(designation, { status: 201 });
    } catch (error) {
        console.error('POST /api/crm/designations error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
