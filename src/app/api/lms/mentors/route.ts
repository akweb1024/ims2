import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const mentorId = searchParams.get('mentorId');
        const workshopId = searchParams.get('workshopId');

        let whereClause: any = {};
        if (mentorId) whereClause.mentorId = mentorId;
        if (workshopId) whereClause.workshopId = workshopId;

        const sessions = await (prisma as any).mentorSession.findMany({
            where: whereClause,
            include: {
                mentor: { select: { id: true, name: true, email: true } },
                workshop: { select: { id: true, title: true } }
            },
            orderBy: { scheduledAt: 'asc' }
        });

        return NextResponse.json(sessions);
    } catch (error) {
        console.error('Error fetching mentor sessions:', error);
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { workshopId, mentorId, title, scheduledAt, durationMins, meetingLink, notes } = body;

        // Ensure user is authorized
        if (user.role !== 'SUPER_ADMIN' && user.id !== mentorId) {
             return NextResponse.json({ error: 'Only admins or the specific mentor can schedule sessions' }, { status: 403 });
        }

        const session = await (prisma as any).mentorSession.create({
            data: {
                workshopId,
                mentorId,
                title,
                scheduledAt: new Date(scheduledAt),
                durationMins: durationMins ? parseInt(durationMins) : 60,
                meetingLink,
                notes
            }
        });

        return NextResponse.json(session);
    } catch (error) {
        console.error('Error creating mentor session:', error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}
