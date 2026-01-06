import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        // Public can view events? Assuming mainly for internal dashboard management for now.
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);

        const where: any = {};
        // If user is not admin, maybe only show what they registered for?
        // Or show all public conferences.

        where.isActive = true;

        if (user.companyId) {
            // Multi-tenancy: User sees events from their company 
            where.companyId = user.companyId;
        }

        const events = await prisma.conference.findMany({
            where,
            include: {
                _count: {
                    select: { registrations: true, papers: true }
                }
            },
            orderBy: { startDate: 'asc' }
        });

        return NextResponse.json(events);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { title, description, startDate, endDate, venue, organizer } = body;

        const event = await prisma.conference.create({
            data: {
                title,
                description,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                venue,
                organizer: organizer,
                companyId: user.companyId,
                isActive: true
            }
        });

        return NextResponse.json(event);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
